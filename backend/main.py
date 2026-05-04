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


# ── Desktop entry point ───────────────────────────────────────────────────────

def _open_browser():
    time.sleep(1.5)
    webbrowser.open("http://localhost:8000")


if __name__ == "__main__":
    import uvicorn
    print("=" * 52)
    print("  PortScan Pro  |  http://localhost:8000")
    print("  Opening your browser... Press Ctrl+C to stop.")
    print("=" * 52)
    threading.Thread(target=_open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
