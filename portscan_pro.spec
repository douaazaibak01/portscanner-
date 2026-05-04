# portscan_pro.spec
# PyInstaller build spec for PortScan Pro Desktop Edition
#
# Usage (run from the project root — the folder containing this file):
#   pip install pyinstaller
#   pyinstaller portscan_pro.spec
#
# The finished binary is placed in:
#   dist/PortScanPro          (Linux / macOS)
#   dist/PortScanPro.exe      (Windows)

import os
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────

ROOT      = Path(SPECPATH)                       # project root
BACKEND   = ROOT / "backend"
FRONTEND  = ROOT / "frontend" / "build"          # React production build

# ── Sanity check ─────────────────────────────────────────────────────────────

if not FRONTEND.exists():
    raise SystemExit(
        "\n[ERROR] Frontend build folder not found!\n"
        "Please run the following first:\n"
        "  cd frontend\n"
        "  npm install\n"
        "  npm run build\n"
    )

# ── Analysis ─────────────────────────────────────────────────────────────────

a = Analysis(
    [str(BACKEND / "main.py")],
    pathex=[str(BACKEND)],
    binaries=[],
    datas=[
        # Bundle the entire React build into the exe
        (str(FRONTEND), "frontend/build"),
        # Bundle the scanner package explicitly (PyInstaller sometimes misses packages)
        (str(BACKEND / "scanner"), "scanner"),
    ],
    hiddenimports=[
        # uvicorn internals that PyInstaller's hook may miss
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.http.httptools_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.protocols.websockets.websockets_impl",
        "uvicorn.protocols.websockets.wsproto_impl",
        "uvicorn.lifespan",
        "uvicorn.lifespan.off",
        "uvicorn.lifespan.on",
        # FastAPI / Starlette
        "fastapi",
        "starlette",
        "starlette.staticfiles",
        "starlette.responses",
        "starlette.middleware.cors",
        # Pydantic v2
        "pydantic",
        "pydantic.deprecated.class_validators",
        # h11 (HTTP/1.1 parser used by uvicorn)
        "h11",
        "h11._connection",
        "h11._events",
        "h11._util",
        # anyio
        "anyio",
        "anyio._backends._asyncio",
        # Email validator (Pydantic optional dep)
        "email_validator",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Things we definitely don't need
        "tkinter",
        "matplotlib",
        "numpy",
        "pandas",
        "PIL",
        "PyQt5",
        "wx",
    ],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="PortScanPro",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,               # compress the binary (UPX must be installed for this to work; safe to ignore warning if not)
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,           # keep console window so users can see startup messages & errors
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    # icon="frontend/public/favicon.ico",   # uncomment if you have an .ico file
)
