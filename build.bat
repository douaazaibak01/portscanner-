@echo off
REM build.bat — builds PortScan Pro Desktop Edition (Windows)
REM Run from the project root: build.bat

echo.
echo ==========================================
echo   PortScan Pro — Desktop Build Script
echo ==========================================
echo.

REM ── 1. Build the React frontend ───────────────────────────────────────────

echo [1/3] Building React frontend...
cd frontend
call npm install --silent
call npm run build
cd ..
echo        OK  React build complete  -^>  frontend\build\
echo.

REM ── 2. Set up Python venv and install deps ────────────────────────────────

echo [2/3] Installing Python dependencies...
cd backend
python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
python -m pip install --quiet pyinstaller
cd ..
echo        OK  Python environment ready
echo.

REM ── 3. Run PyInstaller ────────────────────────────────────────────────────

echo [3/3] Running PyInstaller (this takes ~1-2 minutes)...
call backend\.venv\Scripts\pyinstaller.exe portscan_pro.spec --distpath dist --workpath build_tmp --noconfirm

echo.
echo ==========================================
echo          BUILD COMPLETE
echo ==========================================
echo.
echo   Binary:   dist\PortScanPro.exe
echo.
echo   To run:   Double-click dist\PortScanPro.exe
echo   Then open: http://localhost:8000
echo             (it will open automatically)
echo.
pause
