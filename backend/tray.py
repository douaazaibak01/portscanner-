"""
System tray icon for PortScan Pro.
Gives the user a right-click menu to open the app or quit cleanly.
Falls back gracefully if pystray / Pillow are not available.
"""
from __future__ import annotations
import os
import sys
import threading
import webbrowser

def _make_icon():
    """Create a simple pink radar-dot icon as a PIL Image."""
    try:
        from PIL import Image, ImageDraw
        size = 64
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        # outer ring
        d.ellipse([4, 4, 60, 60], outline=(255, 45, 120, 180), width=4)
        # middle ring
        d.ellipse([16, 16, 48, 48], outline=(255, 45, 120, 120), width=3)
        # center dot
        d.ellipse([28, 28, 36, 36], fill=(255, 45, 120, 255))
        # sweep line
        d.line([32, 32, 56, 8], fill=(255, 45, 120, 200), width=2)
        return img
    except Exception:
        return None


def _set_startup(enabled: bool):
    """Add or remove PortScan Pro from Windows startup registry."""
    if sys.platform != "win32":
        return
    try:
        import winreg
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        exe_path = sys.executable if getattr(sys, "frozen", False) else __file__
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE) as key:
            if enabled:
                winreg.SetValueEx(key, "PortScanPro", 0, winreg.REG_SZ, f'"{exe_path}"'  )
            else:
                try:
                    winreg.DeleteValue(key, "PortScanPro")
                except FileNotFoundError:
                    pass
    except Exception:
        pass


def _is_startup_enabled() -> bool:
    """Check if PortScan Pro is currently in Windows startup."""
    if sys.platform != "win32":
        return False
    try:
        import winreg
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ) as key:
            winreg.QueryValueEx(key, "PortScanPro")
            return True
    except Exception:
        return False


def run_tray(stop_event: threading.Event):
    """
    Runs the system tray icon in a background thread.
    Calls stop_event.set() when the user clicks Quit.
    Does nothing if pystray is unavailable.
    """
    try:
        import pystray
    except ImportError:
        return  # no tray — that's fine, user uses Ctrl+C

    icon_image = _make_icon()
    if icon_image is None:
        return

    def on_open(icon, item):
        webbrowser.open("http://localhost:8000")

    def on_toggle_startup(icon, item):
        current = _is_startup_enabled()
        _set_startup(not current)
        # Rebuild the menu to reflect the new state
        icon.menu = _build_menu()

    def _build_menu():
        startup_label = (
            "✓ Launch on Windows startup"
            if _is_startup_enabled()
            else "  Launch on Windows startup"
        )
        return pystray.Menu(
            pystray.MenuItem("Open PortScan Pro", on_open, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(startup_label, on_toggle_startup),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quit", lambda icon, item: (stop_event.set(), icon.stop())),
        )

    icon = pystray.Icon(
        "PortScan Pro",
        icon_image,
        "PortScan Pro — running on localhost:8000",
        _build_menu(),
    )
    icon.run()
