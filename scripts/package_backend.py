#!/usr/bin/env python3
"""
RepairOS Backend Packaging Script
Prepares and packages the Python native diagnostics backend using PyInstaller.
"""

import sys
import subprocess
import os

def package():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_main = os.path.join(base_dir, "..", "backend", "main.py")
    dist_dir = os.path.join(base_dir, "..", "resources", "backend")

    cmd = [
        "pyinstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--name", "repair_os_backend",
        "--distpath", dist_dir,
        backend_main
    ]

    print(f"Executing packaging: {' '.join(cmd)}")
    # If pyinstaller is installed in environment, run it:
    try:
        subprocess.run(cmd, check=True)
        print("Backend packaged successfully.")
    except Exception as e:
        print(f"PyInstaller build step skipped or tool not installed in current runner: {e}")
        print("In production CI/CD Windows runner, run: pip install pyinstaller && python scripts/package_backend.py")

if __name__ == "__main__":
    package()
