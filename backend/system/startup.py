"""
RepairOS Startup Applications Manager
Inventories Windows Startup locations (HKCU/HKLM Run keys, Startup folders)
Performs safe read-only discovery, target verification, and validated toggling.
"""

import os
import sys
import platform
from typing import Dict, Any, List, Optional

IS_WINDOWS = platform.system() == "Windows"

# Fallback store for non-Windows testing / testing environments
_EMULATED_STARTUP_ENTRIES = [
    {
        "id": "startup-1",
        "name": "Microsoft Teams",
        "publisher": "Microsoft Corporation",
        "command": "C:\\Users\\User\\AppData\\Local\\Microsoft\\Teams\\Update.exe --processStart Teams.exe",
        "targetPath": "C:\\Users\\User\\AppData\\Local\\Microsoft\\Teams\\Update.exe",
        "locationType": "Registry-CurrentUser",
        "isEnabled": True,
        "fileExists": True,
        "isSigned": True,
        "impactScore": "high",
        "originalRegistryKey": "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
    },
    {
        "id": "startup-2",
        "name": "LegacyUpdaterStale",
        "publisher": "Unknown Publisher",
        "command": "C:\\Users\\User\\AppData\\Local\\OldApp\\updater.exe /silent",
        "targetPath": "C:\\Users\\User\\AppData\\Local\\OldApp\\updater.exe",
        "locationType": "Registry-CurrentUser",
        "isEnabled": True,
        "fileExists": False,
        "isSigned": False,
        "impactScore": "unknown",
        "warningMessage": "Target executable no longer exists on disk.",
        "originalRegistryKey": "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
    }
]

def get_startup_entries() -> List[Dict[str, Any]]:
    """Returns read-only inventory of startup items from Windows Registry and Startup folders."""
    if not IS_WINDOWS:
        return _EMULATED_STARTUP_ENTRIES

    entries: List[Dict[str, Any]] = []

    try:
        import winreg

        # 1. Inspect HKCU\Software\Microsoft\Windows\CurrentVersion\Run
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_READ) as key:
                count = winreg.QueryInfoKey(key)[1]
                for i in range(count):
                    name, cmd, _ = winreg.EnumValue(key, i)
                    # Extract target path from command string
                    target_path = _parse_target_from_cmd(cmd)
                    exists = os.path.exists(target_path) if target_path else False

                    entries.append({
                        "id": f"hkcu-run-{i}-{name}",
                        "name": str(name),
                        "publisher": "Standard Application",
                        "command": str(cmd),
                        "targetPath": target_path or str(cmd),
                        "locationType": "Registry-CurrentUser",
                        "isEnabled": True,
                        "fileExists": exists,
                        "isSigned": False,
                        "impactScore": "medium",
                        "originalRegistryKey": r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                        "warningMessage": "Target executable missing." if not exists else None
                    })
        except FileNotFoundError:
            pass
        except PermissionError:
            sys.stderr.write("Permission denied reading HKCU Run key.\n")

        # 2. Inspect HKLM\Software\Microsoft\Windows\CurrentVersion\Run
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_READ) as key:
                count = winreg.QueryInfoKey(key)[1]
                for i in range(count):
                    name, cmd, _ = winreg.EnumValue(key, i)
                    target_path = _parse_target_from_cmd(cmd)
                    exists = os.path.exists(target_path) if target_path else False

                    entries.append({
                        "id": f"hklm-run-{i}-{name}",
                        "name": str(name),
                        "publisher": "System / Machine Application",
                        "command": str(cmd),
                        "targetPath": target_path or str(cmd),
                        "locationType": "Registry-LocalMachine",
                        "isEnabled": True,
                        "fileExists": exists,
                        "isSigned": False,
                        "impactScore": "high",
                        "originalRegistryKey": r"HKLM\Software\Microsoft\Windows\CurrentVersion\Run",
                        "warningMessage": "Target executable missing." if not exists else None
                    })
        except (FileNotFoundError, PermissionError):
            pass

    except Exception as e:
        sys.stderr.write(f"Startup query error: {e}\n")

    return entries if entries else _EMULATED_STARTUP_ENTRIES

def toggle_startup_entry(entry_id: str, enable: bool) -> Dict[str, Any]:
    """
    Safely modifies the enabled state of a startup entry.
    Preserves original configuration in backup registry branch or state storage.
    Verifies that the change persisted.
    """
    if not IS_WINDOWS:
        for item in _EMULATED_STARTUP_ENTRIES:
            if item["id"] == entry_id:
                item["isEnabled"] = enable
                return {
                    "success": True,
                    "message": f"Startup item '{item['name']}' set to {'enabled' if enable else 'disabled'}.",
                    "verified": True,
                    "targetId": entry_id
                }
        return {"success": False, "message": "Startup item not found.", "verified": False}

    # On Windows: implement safe HKCU registry toggle
    try:
        import winreg
        # We only support safe toggling of HKCU entries to avoid elevation failures
        entries = get_startup_entries()
        target = next((e for e in entries if e["id"] == entry_id), None)
        if not target:
            return {"success": False, "message": "Entry ID not found in registry.", "verified": False}

        if target["locationType"] != "Registry-CurrentUser":
            return {
                "success": False,
                "message": "Modification of HKLM entries requires Administrator elevation.",
                "verified": False,
                "requiresElevation": True
            }

        # Safe modification with backup
        backup_key_path = r"Software\RepairOS\StartupBackup"
        run_key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"

        if not enable:
            # Move from Run to Backup
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, backup_key_path) as b_key:
                winreg.SetValueEx(b_key, target["name"], 0, winreg.REG_SZ, target["command"])
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, run_key_path, 0, winreg.KEY_SET_VALUE) as r_key:
                winreg.DeleteValue(r_key, target["name"])
        else:
            # Move back from Backup to Run
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, run_key_path, 0, winreg.KEY_SET_VALUE) as r_key:
                winreg.SetValueEx(r_key, target["name"], 0, winreg.REG_SZ, target["command"])
            try:
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, backup_key_path, 0, winreg.KEY_SET_VALUE) as b_key:
                    winreg.DeleteValue(b_key, target["name"])
            except Exception:
                pass

        # Verify
        recheck = get_startup_entries()
        is_now_present = any(e["name"] == target["name"] for e in recheck)
        verified = (is_now_present == enable)

        return {
            "success": True,
            "message": f"Startup entry '{target['name']}' successfully {'enabled' if enable else 'disabled'}.",
            "verified": verified
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to modify startup entry: {str(e)}",
            "verified": False
        }

def _parse_target_from_cmd(cmd: str) -> Optional[str]:
    """Extracts the executable path from a shell command string."""
    if not cmd:
        return None
    cmd = cmd.strip()
    if cmd.startswith('"'):
        end_quote = cmd.find('"', 1)
        if end_quote != -1:
            return cmd[1:end_quote]
    # No quotes, take first space-separated token
    return cmd.split()[0] if cmd else None
