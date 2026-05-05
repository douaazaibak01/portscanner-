# PortScan Pro — Desktop Edition

Local network port scanner. Runs on YOUR machine — scans private IPs (192.168.x.x, 10.x.x.x) directly.

## Quick Start (end users)

1. Download `PortScanPro.exe` (Windows) or `PortScanPro` (Linux/macOS)
2. Run it — your browser opens automatically at http://localhost:8000
3. Enter any local IP and scan

> Windows SmartScreen warning is normal for unsigned apps — click More info → Run anyway

## Build from Source

Requirements: Python 3.10+, Node.js 18+

**Linux/macOS:**
```bash
bash build.sh
# binary → dist/PortScanPro
```

**Windows:**
```bat
build.bat
REM binary → dist\PortScanPro.exe
```

## How it works

PyInstaller bundles FastAPI + the React build into one executable.
FastAPI serves both the API (/scan, /health) and the React UI (/).
No cloud server — everything runs locally so private IPs are reachable.

## Development mode

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm start
```
