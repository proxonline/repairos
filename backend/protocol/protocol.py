"""
RepairOS Native Backend NDJSON Protocol
Version: 1.0.0
Handles request validation, structured responses, error codes, progress events, and cancellation.
"""

import json
import sys
import threading
from typing import Any, Dict, Optional

PROTOCOL_VERSION = "1.0.0"

_stdout_lock = threading.Lock()

class ProtocolError(Exception):
    def __init__(self, code: str, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}

def send_response(req_id: str, data: Any = None):
    """Sends a successful NDJSON response to stdout, thread-safely."""
    payload = {
        "protocolVersion": PROTOCOL_VERSION,
        "id": req_id,
        "status": "success",
        "data": data
    }
    _write_ndjson(payload)

def send_error(req_id: str, code: str, message: str, details: Optional[Dict[str, Any]] = None):
    """Sends a structured NDJSON error response to stdout, thread-safely."""
    payload = {
        "protocolVersion": PROTOCOL_VERSION,
        "id": req_id,
        "status": "error",
        "error": {
            "code": code,
            "message": message,
            "details": details or {}
        }
    }
    _write_ndjson(payload)

def send_progress(req_id: str, progress_data: Dict[str, Any]):
    """Sends a progressive update to stdout, thread-safely."""
    payload = {
        "protocolVersion": PROTOCOL_VERSION,
        "id": req_id,
        "type": "progress",
        "progress": progress_data
    }
    _write_ndjson(payload)

def _write_ndjson(payload: Dict[str, Any]):
    line = json.dumps(payload, separators=(',', ':'), ensure_ascii=False) + "\n"
    with _stdout_lock:
        sys.stdout.write(line)
        sys.stdout.flush()
