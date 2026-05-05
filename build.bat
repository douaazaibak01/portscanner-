@echo off
echo.
echo ==========================================
echo   PortScan Pro — Full Build Script
echo ==========================================
echo.

REM ── 1. Build React frontend ───────────────────────────────────────────────
echo [1/4] Building React frontend...
cd frontend
call npm install --silent
call npm run build
cd ..
echo        OK  React build complete
echo.

REM ── 2. Install Python deps ────────────────────────────────────────────────
echo [2/4] Installing Python dependencies...
cd backend
python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
python -m pip install --quiet pyinstaller
cd ..
echo        OK  Python environment ready
echo.

REM ── 3. Build exe with PyInstaller ─────────────────────────────────────────
echo [3/4] Building executable...
call backend\.venv\Scripts\pyinstaller.exe portscan_pro.spec --distpath dist --workpath build_tmp --noconfirm
echo        OK  dist\PortScan Pro.exe created
echo.

REM ── 4. Build Windows installer with NSIS ──────────────────────────────────
echo [4/4] Building Windows installer...
mkdir installer 2>nul

where makensis >nul 2>&1
if %errorlevel% == 0 (
    makensis installer.nsi
    echo        OK  installer\PortScanPro-Setup.exe created
) else (
    echo        SKIPPED - NSIS not found.
    echo        To build the installer, install NSIS from:
    echo        https://nsis.sourceforge.io/Download
    echo        Then run: makensis installer.nsi
)

echo.
echo ==========================================
echo          BUILD COMPLETE
echo ==========================================
echo.
echo   Executable :  dist\PortScan Pro.exe
echo   Installer  :  installer\PortScanPro-Setup.exe
echo.
echo   Upload "installer\PortScanPro-Setup.exe" to GitHub Releases
echo.
pause
