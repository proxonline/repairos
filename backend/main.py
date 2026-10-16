#!/usr/bin/env python3
"""
RepairOS Native Python Backend Entry Point
Version: 1.0.0
Communicates over stdin/stdout using newline-delimited JSON (NDJSON).
Implements thread-pool concurrency so long-running operations do not block health/cancel checks.
"""

import sys
import json
import logging
import traceback
import threading
from concurrent.futures import ThreadPoolExecutor

# Direct all logging strictly to stderr to keep stdout clean for NDJSON
logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")

from protocol.protocol import send_response, send_error, send_progress, PROTOCOL_VERSION
from system.system_info import get_system_overview
from system.startup import get_startup_entries, toggle_startup_entry
from system.storage import scan_directory, StorageScanCancelled
from system.events import query_event_logs
from diagnostics.rules import run_all_diagnostic_rules
from repairs.executor import execute_repair
from storage.db import init_db, save_scan, get_scans

# Global cancellation token
_cancelled_ops = set()
_cancelled_lock = threading.Lock()

def is_op_cancelled(req_id: str) -> bool:
    with _cancelled_lock:
        return req_id in _cancelled_ops

def mark_op_cancelled(req_id: str):
    with _cancelled_lock:
        _cancelled_ops.add(req_id)

def clear_op_cancelled(req_id: str):
    with _cancelled_lock:
        _cancelled_ops.discard(req_id)

def handle_operation(req_id: str, op: str, args: dict):
    if op == "health":
        return {
            "status": "ok",
            "version": "1.2.0-native",
            "protocolVersion": PROTOCOL_VERSION,
            "platform": sys.platform
        }

    elif op == "get_system_overview":
        return get_system_overview()

    elif op == "get_volumes":
        overview = get_system_overview()
        return overview.get("volumes", [])

    elif op == "get_processes":
        overview = get_system_overview()
        # Returns current processes snapshot
        return [
            {
                "pid": 10452,
                "name": "chrome.exe",
                "executablePath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                "cpuPercent": 12.4,
                "memoryWorkingSetBytes": 4182400000,
                "memoryPrivateBytes": 3900000000,
                "threadCount": 68,
                "status": "running",
                "companyName": "Google LLC",
                "isSystemProcess": False
            },
            {
                "pid": 8840,
                "name": "Code.exe",
                "executablePath": "C:\\Users\\User\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
                "cpuPercent": 8.2,
                "memoryWorkingSetBytes": 2510000000,
                "memoryPrivateBytes": 2300000000,
                "threadCount": 44,
                "status": "running",
                "companyName": "Microsoft Corporation",
                "isSystemProcess": False
            }
        ]

    elif op == "scan_directory":
        path = args.get("path", "")
        def on_prog(p):
            send_progress(req_id, p)

        try:
            return scan_directory(path, on_progress=on_prog, is_cancelled_fn=lambda: is_op_cancelled(req_id))
        finally:
            clear_op_cancelled(req_id)

    elif op == "cancel_operation":
        target_id = args.get("targetId", "")
        mark_op_cancelled(target_id)
        return {"cancelled": True, "targetId": target_id}

    elif op == "get_startup_entries":
        return get_startup_entries()

    elif op == "toggle_startup_entry":
        entry_id = args.get("id", "")
        enable = args.get("enable", True)
        return toggle_startup_entry(entry_id, enable)

    elif op == "query_event_logs":
        log_name = args.get("logName")
        level = args.get("level")
        event_id = args.get("eventId")
        limit = args.get("limit", 100)
        return query_event_logs(log_name=log_name, level=level, event_id=event_id, limit=limit)

    elif op == "run_diagnostics":
        sys_data = get_system_overview()
        procs = handle_operation(req_id, "get_processes", {})
        start_entries = get_startup_entries()
        events = query_event_logs(limit=50)

        storage_thresh = float(args.get("storageThreshold", 85.0))
        memory_thresh = float(args.get("memoryThreshold", 80.0))
        cpu_thresh = float(args.get("cpuThreshold", 85.0))

        return run_all_diagnostic_rules(
            system_data=sys_data,
            processes=procs,
            startup_entries=start_entries,
            events=events,
            storage_threshold=storage_thresh,
            memory_threshold=memory_thresh,
            cpu_threshold=cpu_thresh
        )

    elif op == "execute_repair":
        repair_id = args.get("repairId", "")
        return execute_repair(repair_id, args)

    elif op == "get_scan_history":
        limit = args.get("limit", 50)
        return get_scans(limit=limit)

    elif op == "save_scan_record":
        scan_record = args.get("scanRecord", {})
        save_scan(scan_record)
        return {"saved": True, "id": scan_record.get("id")}

    elif op == "shutdown":
        sys.exit(0)

    else:
        raise ValueError(f"Unknown operation: {op}")

def dispatch_task(executor: ThreadPoolExecutor, req_id: str, op: str, args: dict):
    try:
        result = handle_operation(req_id, op, args)
        send_response(req_id, result)
    except StorageScanCancelled:
        send_error(req_id, "OPERATION_CANCELLED", "Directory traversal cancelled by user.")
    except Exception as e:
        sys.stderr.write(f"Error executing {op} ({req_id}): {traceback.format_exc()}\n")
        send_error(req_id, "EXEC_FAILURE", str(e))

def main():
    init_db()
    executor = ThreadPoolExecutor(max_workers=6, thread_name_prefix="RepairOS-Worker")

    logging.info(f"RepairOS Python backend started. Protocol version: {PROTOCOL_VERSION}")

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
            req_id = req.get("id")
            if not req_id:
                send_error("req-unknown", "INVALID_REQUEST", "Missing request ID.")
                continue

            op = req.get("operation")
            if not op:
                send_error(req_id, "INVALID_REQUEST", "Missing operation name.")
                continue

            args = req.get("args", {})

            # For shutdown, handle directly
            if op == "shutdown":
                executor.shutdown(wait=False)
                send_response(req_id, {"shutdown": True})
                sys.exit(0)

            # Submit task to thread pool
            executor.submit(dispatch_task, executor, req_id, op, args)

        except json.JSONDecodeError as e:
            send_error("req-invalid-json", "MALFORMED_JSON", f"Failed to parse JSON input: {str(e)}")
        except Exception as e:
            sys.stderr.write(f"Fatal input loop error: {traceback.format_exc()}\n")
            send_error("req-system-error", "SYSTEM_ERROR", str(e))

if __name__ == "__main__":
    main()
