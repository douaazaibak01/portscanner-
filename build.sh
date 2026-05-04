#!/usr/bin/env bash
# build.sh — builds PortScan Pro Desktop Edition (Linux / macOS)
# Run from the project root: bash build.sh

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   PortScan Pro — Desktop Build Script    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Build the React frontend ───────────────────────────────────────────────

echo "[ 1/3 ] Building React frontend..."
cd frontend
npm install --silent
npm run build
cd ..
echo "        ✓ React build complete → frontend/build/"
echo ""

# ── 2. Set up Python venv & install deps ─────────────────────────────────────

echo "[ 2/3 ] Installing Python dependencies..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
pip install --quiet pyinstaller
cd ..
echo "        ✓ Python environment ready"
echo ""

# ── 3. Run PyInstaller ────────────────────────────────────────────────────────

echo "[ 3/3 ] Running PyInstaller (this takes ~1-2 minutes)..."
cd backend
source .venv/bin/activate
cd ..
.venv/bin/pyinstaller portscan_pro.spec --distpath dist --workpath build_tmp --noconfirm 2>/dev/null || \
  backend/.venv/bin/pyinstaller portscan_pro.spec --distpath dist --workpath build_tmp --noconfirm

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║            BUILD COMPLETE  ✓             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Binary:   dist/PortScanPro"
echo ""
echo "  To run:   ./dist/PortScanPro"
echo "  Then open: http://localhost:8000"
echo ""
