"""
PortScan Pro — FastAPI Backend (Desktop Edition)
Serves the React build as static files AND exposes the scan API.
Double-click the exe → opens http://localhost:8000 in your browser.
"""

from __future__ import annotations

import asyncio
import ipaddress
import json
import os
import sys
import time
import webbrowser
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator

from scanner.banner import enrich_with_banners
from scanner.risk import assess_risk, summarise
from scanner.tcp_scanner import scan_port

# ── Resolve the frontend/build path (works both in dev and PyInstaller) ──────

def _get_static_dir() -> Path:
    if getattr(sys, "frozen", False):
        base = Path(sys._MEIPASS)
    else:
        base = Path(__file__).parent.parent
    return base / "frontend" / "build"


STATIC_DIR = _get_static_dir()

# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="PortScan Pro API",
    description="Network port scanner & insecure protocol detector",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve React static assets (JS, CSS, images) ─────────────────────────────

if STATIC_DIR.exists():
    _static_assets = STATIC_DIR / "static"
    if _static_assets.exists():
        app.mount("/static", StaticFiles(directory=str(_static_assets)), name="static")

# ── API routes ────────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    target:  str   = Field(..., example="192.168.1.1")
    ports:   str   = Field("1-1024", example="1-1024")
    timeout: float = Field(0.8, ge=0.1, le=10.0)
    threads: int   = Field(150, ge=10, le=300)

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

    @validator("ports")
    def validate_ports(cls, v):
        try:
            start, end = map(int, v.split("-", 1))
        except Exception:
            raise ValueError("Ports must use format start-end (e.g. 1-1024)")
        if start < 1 or end > 65535 or start > end:
            raise ValueError("Port range must be 1-65535 with start <= end")
        if end - start > 9999:
            raise ValueError("Range too large - maximum 10 000 ports per scan")
        return v


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


def run_tcp_scan(host: str, start: int, end: int,
                 timeout: float, threads: int) -> list[dict]:
    open_ports: list[dict] = []
    with ThreadPoolExecutor(max_workers=threads) as ex:
        futures = {ex.submit(scan_port, host, p, timeout): p
                   for p in range(start, end + 1)}
        for fut in as_completed(futures):
            r = fut.result()
            if r["state"] == "open":
                open_ports.append(r)
    return sorted(open_ports, key=lambda x: x["port"])


@app.post("/scan")
async def scan_endpoint(req: ScanRequest):
    hosts = expand_target(req.target)
    start, end = parse_ports(req.ports)
    t0 = time.time()
    all_host_reports = []
    all_findings = []
    loop = asyncio.get_event_loop()
    for host in hosts:
        open_ports = await loop.run_in_executor(
            None, run_tcp_scan, host, start, end, req.timeout, req.threads)
        if open_ports:
            open_ports = await loop.run_in_executor(
                None, enrich_with_banners, open_ports, host, min(req.timeout, 2.0))
        risk_results = assess_risk([{**p, "host": host} for p in open_ports])
        all_findings.extend(risk_results)
        all_host_reports.append({"host": host, "open_ports": open_ports, "risk_results": risk_results})
    stats = summarise(all_findings)
    return {"target": req.target, "hosts": hosts, "port_range": req.ports,
            "elapsed": round(time.time() - t0, 2), "stats": stats, "reports": all_host_reports}


def _sse(kind: str, **payload) -> str:
    return "data: " + json.dumps({"type": kind, **payload}) + "\n\n"


async def _stream_scan(target: str, ports: str, timeout: float, threads: int) -> AsyncGenerator[str, None]:
    yield _sse("status", message="Validating target...")
    try:
        hosts = expand_target(target)
        start, end = parse_ports(ports)
    except Exception as exc:
        yield _sse("error", message=str(exc))
        return

    yield _sse("init", hosts=hosts, port_start=start, port_end=end,
               total=(end - start + 1) * len(hosts))
    loop = asyncio.get_event_loop()
    all_findings: list[dict] = []

    for host in hosts:
        yield _sse("host_start", host=host)
        try:
            open_ports: list[dict] = []
            port_list = list(range(start, end + 1))
            total = len(port_list)
            scanned = 0
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
            yield _sse("host_done", host=host, open_ports=open_ports, risk_results=risk_results)
        except Exception as exc:
            yield _sse("host_error", host=host, message=str(exc))

    yield _sse("complete", stats=summarise(all_findings))
    yield _sse("done")


@app.get("/scan/stream")
async def scan_stream(target: str = "127.0.0.1", ports: str = "1-1024",
                      timeout: float = 0.8, threads: int = 150):
    try:
        req = ScanRequest(target=target, ports=ports, timeout=timeout, threads=threads)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return StreamingResponse(
        _stream_scan(req.target, req.ports, req.timeout, req.threads),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


# ── Catch-all: serve index.html for any non-API route ───────────────────────
# Must be LAST so API routes above take precedence

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str = ""):
    if not STATIC_DIR.exists():
        return {"error": "Frontend not built. Run: cd frontend && npm run build"}
    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"error": "index.html not found in build folder"}





# ── Helpers: port management & single-instance ───────────────────────────────

def _kill_port(port: int):
    """Kill whatever process is already listening on the given port."""
    import socket, signal
    # Quick check — is anything actually there?
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        if s.connect_ex(("127.0.0.1", port)) != 0:
            return  # port is free, nothing to do

    # Port is occupied — kill it
    if sys.platform == "win32":
        os.system(f'for /f "tokens=5" %a in (\'netstat -aon ^| findstr :{port}\') do taskkill /F /PID %a >nul 2>&1')
    else:
        os.system(f"fuser -k {port}/tcp 2>/dev/null || lsof -ti:{port} | xargs kill -9 2>/dev/null")
    time.sleep(0.6)  # give OS time to release the port


def _write_pidfile():
    """Write our PID so future launches can find and kill us."""
    pid_path = Path(os.environ.get("TEMP", "/tmp")) / "portscanpro.pid"
    pid_path.write_text(str(os.getpid()))


def _open_browser_delayed(delay: float = 1.8):
    time.sleep(delay)
    webbrowser.open("http://localhost:8000")


# ── Desktop entry point ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    import logging

    PORT = 8000

    # ── Fix for PyInstaller console=False: redirect all output to a log file ──
    # When frozen with no console, sys.stdout and sys.stderr are None.
    # uvicorn's logging setup crashes if it tries to write to None.
    log_dir = Path(os.environ.get("APPDATA", os.path.expanduser("~"))) / "PortScanPro"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "portscanpro.log"

    if sys.stdout is None:
        sys.stdout = open(log_file, "a", encoding="utf-8")
    if sys.stderr is None:
        sys.stderr = sys.stdout

    # Route all logging to the same file
    logging.basicConfig(
        filename=str(log_file),
        level=logging.WARNING,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    # 1. Free the port if something is already using it
    _kill_port(PORT)

    # 2. Remember our own PID
    _write_pidfile()

    # 3. Open browser after a short delay
    threading.Thread(target=_open_browser_delayed, daemon=True).start()

    # 4. Start system tray icon (right-click → Open / Quit)
    stop_event = threading.Event()
    try:
        from tray import run_tray
        tray_thread = threading.Thread(target=run_tray, args=(stop_event,), daemon=True)
        tray_thread.start()
    except Exception:
        pass  # tray is optional

    # 5. Run uvicorn
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=PORT,
        log_level="error",
        access_log=False,
    )
    server = uvicorn.Server(config)

    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    # Wait until user quits via tray or Ctrl+C
    try:
        stop_event.wait()
    except KeyboardInterrupt:
        pass

    server.should_exit = True
    server_thread.join(timeout=3)
    sys.exit(0)
