"""
PortScan Pro — FastAPI Backend (Secured)
========================================
Added security measures:
  1. JWT-based login / authentication  (POST /auth/register, POST /auth/login)
  2. IP ownership declaration          (user must tick "I own this target")
  3. Scan activity logging             (SQLite — scan_logs.db)
  4. Per-user rate limiting            (max 10 scans / hour per account)

All scan endpoints now require a valid Bearer token.
"""

from __future__ import annotations

import asyncio
import ipaddress
import json
import sqlite3
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator

import bcrypt
import jwt
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, validator

from scanner.banner import enrich_with_banners
from scanner.risk import assess_risk, summarise
from scanner.tcp_scanner import scan_port

# ── Configuration ─────────────────────────────────────────────────────────────

SECRET_KEY        = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_IN_PRODUCTION"
ALGORITHM         = "HS256"
TOKEN_EXPIRE      = timedelta(hours=8)

DB_PATH           = "scan_logs.db"
RATE_LIMIT_MAX    = 10      # max scans per user per window
RATE_LIMIT_WINDOW = 3600    # seconds (1 hour)

# ── Database setup ────────────────────────────────────────────────────────────

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                username      TEXT    UNIQUE NOT NULL,
                password_hash TEXT    NOT NULL,
                created_at    TEXT    NOT NULL
            );
            CREATE TABLE IF NOT EXISTS scan_logs (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                username       TEXT    NOT NULL,
                target         TEXT    NOT NULL,
                port_range     TEXT    NOT NULL,
                threads        INTEGER NOT NULL,
                timeout        REAL    NOT NULL,
                open_ports     INTEGER,
                findings       INTEGER,
                elapsed        REAL,
                status         TEXT    NOT NULL,
                declared_owner INTEGER NOT NULL,
                ip_address     TEXT,
                logged_at      TEXT    NOT NULL
            );
        """)

# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="PortScan Pro API (Secured)",
    description="Network port scanner & insecure protocol detector — with auth & audit log",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# ── Auth helpers ──────────────────────────────────────────────────────────────

security = HTTPBearer()


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + TOKEN_EXPIRE,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = data.get("sub", "")
        if not username:
            raise ValueError("empty subject")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired — please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> str:
    return decode_token(creds.credentials)


# ── Rate limiting ─────────────────────────────────────────────────────────────

def check_rate_limit(username: str) -> None:
    window_start = datetime.now(timezone.utc) - timedelta(seconds=RATE_LIMIT_WINDOW)
    with get_db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM scan_logs "
            "WHERE username = ? AND logged_at >= ? AND status != 'aborted'",
            (username, window_start.isoformat()),
        ).fetchone()
    count = row["cnt"] if row else 0
    if count >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit reached: max {RATE_LIMIT_MAX} scans per hour. Try again later.",
        )


# ── Audit logging ─────────────────────────────────────────────────────────────

def log_scan(username, target, port_range, threads, timeout,
             declared_owner, ip_address, open_ports=0,
             findings=0, elapsed=0.0, scan_status="started") -> int:
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO scan_logs
               (username, target, port_range, threads, timeout,
                open_ports, findings, elapsed, status, declared_owner,
                ip_address, logged_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (username, target, port_range, threads, timeout,
             open_ports, findings, elapsed, scan_status,
             int(declared_owner), ip_address,
             datetime.now(timezone.utc).isoformat()),
        )
        return cur.lastrowid


def update_log(log_id, open_ports, findings, elapsed, scan_status):
    with get_db() as conn:
        conn.execute(
            "UPDATE scan_logs SET open_ports=?, findings=?, elapsed=?, status=? WHERE id=?",
            (open_ports, findings, elapsed, scan_status, log_id),
        )


# ── Request models ────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    username: str
    password: str


class ScanRequest(BaseModel):
    target:         str   = Field(..., example="192.168.1.1")
    ports:          str   = Field("1-1024", example="1-1024")
    timeout:        float = Field(0.8, ge=0.1, le=10.0)
    threads:        int   = Field(150, ge=10, le=300)
    declared_owner: bool  = Field(..., description="User confirms ownership/permission")

    @validator("target")
    def validate_target(cls, v):
        v = v.strip()
        try:
            ipaddress.ip_network(v, strict=False)
            return v
        except ValueError:
            pass
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError(f"'{v}' is not a valid IP address or CIDR range")

    @validator("declared_owner")
    def must_declare_ownership(cls, v):
        if not v:
            raise ValueError(
                "You must confirm that you own or have explicit written "
                "permission to scan this target."
            )
        return v

    @validator("ports")
    def validate_ports(cls, v):
        try:
            start, end = map(int, v.split("-", 1))
        except Exception:
            raise ValueError("Ports must use format start-end (e.g. 1-1024)")
        if start < 1 or end > 65535 or start > end:
            raise ValueError("Port range must be 1-65535 with start <= end")
        if end - start > 9999:
            raise ValueError("Range too large — maximum 10 000 ports per scan")
        return v


# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.post("/auth/register", status_code=201)
def register(req: RegisterRequest):
    with get_db() as conn:
        if conn.execute("SELECT id FROM users WHERE username=?", (req.username,)).fetchone():
            raise HTTPException(status_code=409, detail="Username already taken.")
        conn.execute(
            "INSERT INTO users (username, password_hash, created_at) VALUES (?,?,?)",
            (req.username, hash_password(req.password),
             datetime.now(timezone.utc).isoformat()),
        )
    return {"message": f"Account '{req.username}' created. You can now log in."}


@app.post("/auth/login")
def login(req: LoginRequest):
    with get_db() as conn:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE username=?", (req.username,)
        ).fetchone()
    if not row or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return {"access_token": create_token(req.username), "token_type": "bearer"}


@app.get("/auth/me")
def me(username: str = Depends(get_current_user)):
    return {"username": username}


# ── Helpers ───────────────────────────────────────────────────────────────────

def expand_target(target: str) -> list[str]:
    try:
        net = ipaddress.ip_network(target, strict=False)
        hosts = [str(h) for h in net.hosts()]
        return hosts[:10] if hosts else [str(net.network_address)]
    except ValueError:
        return [target]


def parse_ports(ports: str) -> tuple[int, int]:
    start, end = map(int, ports.split("-", 1))
    return start, end


def run_tcp_scan(host, start, end, timeout, threads) -> list[dict]:
    open_ports: list[dict] = []
    with ThreadPoolExecutor(max_workers=threads) as ex:
        futures = {ex.submit(scan_port, host, p, timeout): p
                   for p in range(start, end + 1)}
        for fut in as_completed(futures):
            r = fut.result()
            if r["state"] == "open":
                open_ports.append(r)
    return sorted(open_ports, key=lambda x: x["port"])


def get_client_ip(request: Request) -> str:
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── POST /scan ────────────────────────────────────────────────────────────────

@app.post("/scan")
async def scan_endpoint(
    req: ScanRequest,
    request: Request,
    username: str = Depends(get_current_user),
):
    check_rate_limit(username)
    hosts = expand_target(req.target)
    start, end = parse_ports(req.ports)
    client_ip = get_client_ip(request)
    t0 = time.time()

    log_id = log_scan(username, req.target, req.ports, req.threads,
                      req.timeout, req.declared_owner, client_ip)

    all_host_reports, all_findings = [], []
    loop = asyncio.get_event_loop()

    try:
        for host in hosts:
            open_ports = await loop.run_in_executor(
                None, run_tcp_scan, host, start, end, req.timeout, req.threads)
            if open_ports:
                open_ports = await loop.run_in_executor(
                    None, enrich_with_banners, open_ports, host, min(req.timeout, 2.0))
            risk_results = assess_risk([{**p, "host": host} for p in open_ports])
            all_findings.extend(risk_results)
            all_host_reports.append({"host": host, "open_ports": open_ports,
                                     "risk_results": risk_results})

        elapsed = round(time.time() - t0, 2)
        update_log(log_id,
                   sum(len(r["open_ports"]) for r in all_host_reports),
                   len(all_findings), elapsed, "completed")

        return {"target": req.target, "hosts": hosts, "port_range": req.ports,
                "elapsed": elapsed, "stats": summarise(all_findings),
                "reports": all_host_reports}

    except Exception as exc:
        update_log(log_id, 0, 0, round(time.time() - t0, 2), "error")
        raise HTTPException(status_code=500, detail=str(exc))


# ── GET /scan/stream (SSE) ────────────────────────────────────────────────────

def _sse(kind: str, **payload) -> str:
    return "data: " + json.dumps({"type": kind, **payload}) + "\n\n"


async def _stream_scan(target, ports, timeout, threads,
                       username, declared_owner, client_ip, log_id) -> AsyncGenerator[str, None]:

    yield _sse("status", message="Validating target...")

    try:
        hosts = expand_target(target)
        start, end = parse_ports(ports)
    except Exception as exc:
        update_log(log_id, 0, 0, 0, "error")
        yield _sse("error", message=str(exc))
        return

    yield _sse("init", hosts=hosts, port_start=start,
               port_end=end, total=(end - start + 1) * len(hosts))

    loop, all_findings, total_open, t0 = asyncio.get_event_loop(), [], 0, time.time()

    for host in hosts:
        yield _sse("host_start", host=host)
        try:
            open_ports, port_list = [], list(range(start, end + 1))
            total, scanned = len(port_list), 0
            report_every = max(1, total // 25)

            with ThreadPoolExecutor(max_workers=threads) as ex:
                futures = {ex.submit(scan_port, host, p, timeout): p for p in port_list}
                for fut in as_completed(futures):
                    result = fut.result()
                    scanned += 1
                    if result["state"] == "open":
                        open_ports.append(result)
                        yield _sse("port_open", host=host, port=result["port"],
                                   banner=result.get("banner", ""))
                    if scanned % report_every == 0 or scanned == total:
                        yield _sse("progress", host=host, scanned=scanned,
                                   total=total, pct=round(scanned / total * 100))
                        await asyncio.sleep(0)

            open_ports.sort(key=lambda x: x["port"])

            if open_ports:
                yield _sse("status", message=f"Grabbing banners on {host}...")
                open_ports = await loop.run_in_executor(
                    None, enrich_with_banners, open_ports, host, min(timeout, 2.0))

            risk_results = assess_risk([{**p, "host": host} for p in open_ports])
            all_findings.extend(risk_results)
            total_open += len(open_ports)
            yield _sse("host_done", host=host, open_ports=open_ports, risk_results=risk_results)

        except Exception as exc:
            yield _sse("host_error", host=host, message=str(exc))

    elapsed = round(time.time() - t0, 2)
    update_log(log_id, total_open, len(all_findings), elapsed, "completed")
    yield _sse("complete", stats=summarise(all_findings))
    yield _sse("done")


@app.get("/scan/stream")
async def scan_stream(
    request:        Request,
    target:         str   = "127.0.0.1",
    ports:          str   = "1-1024",
    timeout:        float = 0.8,
    threads:        int   = 150,
    declared_owner: bool  = False,
    token:          str   = "",
    _creds: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
):
    raw_token = _creds.credentials if _creds else token
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    username = decode_token(raw_token)
    try:
        req = ScanRequest(target=target, ports=ports, timeout=timeout,
                          threads=threads, declared_owner=declared_owner)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    check_rate_limit(username)
    client_ip = get_client_ip(request)
    log_id = log_scan(username, req.target, req.ports, req.threads,
                      req.timeout, req.declared_owner, client_ip)

    return StreamingResponse(
        _stream_scan(req.target, req.ports, req.timeout, req.threads,
                     username, req.declared_owner, client_ip, log_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no",
                 "Connection": "keep-alive"},
    )


# ── Admin endpoints ───────────────────────────────────────────────────────────

@app.get("/admin/logs")
def get_all_logs(limit: int = 50, username: str = Depends(get_current_user)):
    """All scan logs — add admin-role check here in production."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM scan_logs ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/admin/my-logs")
def get_my_logs(username: str = Depends(get_current_user)):
    """This user's own scan history."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM scan_logs WHERE username=? ORDER BY id DESC LIMIT 100",
            (username,),
        ).fetchall()
    return [dict(r) for r in rows]


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "3.0.0"}
