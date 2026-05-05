; PortScan Pro — Windows Installer Script
; Built with NSIS (Nullsoft Scriptable Install System)
; https://nsis.sourceforge.io/
;
; HOW TO BUILD:
;   1. Install NSIS from https://nsis.sourceforge.io/Download
;   2. Build the exe first: run build.bat
;   3. Right-click this file → "Compile NSIS Script"
;   4. Output: installer/PortScanPro-Setup.exe
;
; Or from command line:
;   makensis installer.nsi

;-------------------------------------------------
; General settings
;-------------------------------------------------

!define APP_NAME        "PortScan Pro"
!define APP_VERSION     "2.0"
!define APP_PUBLISHER   "PortScan Pro"
!define APP_URL         "https://your-website.netlify.app"
!define APP_EXE         "PortScan Pro.exe"
!define INSTALL_DIR     "$PROGRAMFILES64\PortScan Pro"
!define UNINSTALL_KEY   "Software\Microsoft\Windows\CurrentVersion\Uninstall\PortScanPro"
!define STARTUP_KEY     "Software\Microsoft\Windows\CurrentVersion\Run"

; Installer output
OutFile "installer\PortScanPro-Setup.exe"

; Default install location
InstallDir "${INSTALL_DIR}"

; Request admin rights (needed to write to Program Files)
RequestExecutionLevel admin

; Modern UI
!include "MUI2.nsh"

;-------------------------------------------------
; Installer appearance
;-------------------------------------------------

Name "${APP_NAME} ${APP_VERSION}"
BrandingText "${APP_NAME} ${APP_VERSION} Installer"

; Pages shown during install
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Pages shown during uninstall
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "English"

; Finish page options
!define MUI_FINISHPAGE_RUN           "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT      "Launch PortScan Pro now"
!define MUI_FINISHPAGE_SHOWREADME    ""
!define MUI_FINISHPAGE_LINK          "Visit our website"
!define MUI_FINISHPAGE_LINK_LOCATION "${APP_URL}"

;-------------------------------------------------
; Install section
;-------------------------------------------------

Section "Install"

  SetOutPath "$INSTDIR"

  ; Copy the main executable
  File "dist\PortScan Pro.exe"

  ; Create Start Menu shortcut
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut  "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" \
                  "$INSTDIR\${APP_EXE}"
  CreateShortcut  "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk" \
                  "$INSTDIR\Uninstall.exe"

  ; Create Desktop shortcut
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}"

  ; Add to Windows startup (auto-launch with Windows)
  WriteRegStr HKCU "${STARTUP_KEY}" "${APP_NAME}" \
              '"$INSTDIR\${APP_EXE}"'

  ; Register uninstaller in Add/Remove Programs
  WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayName"      "${APP_NAME}"
  WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayVersion"   "${APP_VERSION}"
  WriteRegStr   HKLM "${UNINSTALL_KEY}" "Publisher"        "${APP_PUBLISHER}"
  WriteRegStr   HKLM "${UNINSTALL_KEY}" "URLInfoAbout"     "${APP_URL}"
  WriteRegStr   HKLM "${UNINSTALL_KEY}" "InstallLocation"  "$INSTDIR"
  WriteRegStr   HKLM "${UNINSTALL_KEY}" "UninstallString"  '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoModify"         1
  WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoRepair"         1

  ; Estimate install size (~50MB)
  WriteRegDWORD HKLM "${UNINSTALL_KEY}" "EstimatedSize"    51200

  ; Write uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

SectionEnd

;-------------------------------------------------
; Uninstall section
;-------------------------------------------------

Section "Uninstall"

  ; Kill the running app before uninstalling
  ExecWait 'taskkill /F /IM "${APP_EXE}" /T'
  Sleep 800

  ; Remove files
  Delete "$INSTDIR\${APP_EXE}"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir  "$INSTDIR"

  ; Remove shortcuts
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk"
  RMDir  "$SMPROGRAMS\${APP_NAME}"
  Delete "$DESKTOP\${APP_NAME}.lnk"

  ; Remove from startup
  DeleteRegValue HKCU "${STARTUP_KEY}" "${APP_NAME}"

  ; Remove from Add/Remove Programs
  DeleteRegKey HKLM "${UNINSTALL_KEY}"

  ; Remove log folder (optional — user data)
  RMDir /r "$APPDATA\PortScanPro"

SectionEnd
