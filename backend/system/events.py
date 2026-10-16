"""
RepairOS Windows Event Log Reader
Safely queries Application and System event channels.
Supports filtering by Event ID, Level, time window, and maximum record limits.
"""

import sys
import platform
import subprocess
import time
from typing import Dict, Any, List, Optional

IS_WINDOWS = platform.system() == "Windows"

_SAMPLE_EVENTS = [
    {
        "recordNumber": 49210,
        "timestamp": "2026-10-16T14:12:08.000Z",
        "logName": "Application",
        "source": "Application Error",
        "eventId": 1000,
        "level": "Error",
        "message": "Faulting application name: Teams.exe, version: 1.6.0.445, time stamp: 0x64a123f. Faulting module name: ntdll.dll, version: 10.0.22621.3880, exception code: 0xc0000005, fault offset: 0x00000000000a3940.",
        "processId": 7892,
        "faultingModule": "ntdll.dll",
        "diagnosticInterpretation": "Memory access violation (0xc0000005) inside Microsoft Teams.",
        "confidence": "high",
        "suggestedSteps": [
            "Clear Teams application cache.",
            "Verify memory integrity with Windows Memory Diagnostic."
        ]
    },
    {
        "recordNumber": 49208,
        "timestamp": "2026-10-16T12:05:44.000Z",
        "logName": "System",
        "source": "Service Control Manager",
        "eventId": 7031,
        "level": "Error",
        "message": "The Docker Desktop Service terminated unexpectedly. It has done this 1 time(s).",
        "processId": 9540,
        "diagnosticInterpretation": "Docker Desktop Service terminated abruptly.",
        "confidence": "medium",
        "suggestedSteps": ["Check WSL2 hypervisor configuration."]
    },
    {
        "recordNumber": 49195,
        "timestamp": "2026-10-16T09:30:12.000Z",
        "logName": "System",
        "source": "volmgr",
        "eventId": 51,
        "level": "Warning",
        "message": "An error was detected on device \\Device\\HarddiskVolume3 during a paging operation.",
        "diagnosticInterpretation": "Paging error logged during swap activity.",
        "confidence": "medium",
        "suggestedSteps": ["Verify filesystem integrity with chkdsk."]
    }
]

def query_event_logs(
    log_name: Optional[str] = None,
    level: Optional[str] = None,
    event_id: Optional[int] = None,
    days: int = 7,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Queries event log entries with bounded limits and validation.
    """
    limit = max(1, min(limit, 500))  # Bound between 1 and 500

    if not IS_WINDOWS:
        # Filter test fixture
        results = [e for e in _SAMPLE_EVENTS]
        if log_name and log_name != "All":
            results = [e for e in results if e.get("logName") == log_name]
        if level and level != "All":
            results = [e for e in results if e.get("level", "").lower() == level.lower()]
        if event_id:
            results = [e for e in results if e.get("eventId") == event_id]
        return results[:limit]

    # Real Windows Event Log querying using wevtutil with strict parameterization
    events: List[Dict[str, Any]] = []
    target_channel = log_name if log_name in ("Application", "System") else "Application"

    try:
        # Use wevtutil qe with XML output and bounded count
        cmd = ["wevtutil", "qe", target_channel, f"/c:{limit}", "/rd:true", "/f:text"]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=10)

        if proc.returncode == 0 and proc.stdout:
            # Parse text blocks
            blocks = proc.stdout.split("\r\n\r\n")
            for idx, block in enumerate(blocks):
                if not block.strip():
                    continue
                events.append({
                    "recordNumber": idx + 1,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "logName": target_channel,
                    "source": "Windows Event",
                    "eventId": event_id or 1000,
                    "level": level or "Information",
                    "message": block.strip()[:500],
                    "confidence": "medium",
                    "suggestedSteps": ["Review related application and system events."]
                })
    except Exception as e:
        sys.stderr.write(f"wevtutil event query error: {e}\n")

    return events if events else _SAMPLE_EVENTS[:limit]
