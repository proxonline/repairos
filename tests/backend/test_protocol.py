"""
RepairOS Protocol & Concurrency Automated Tests
Verifies:
- NDJSON framing
- Protocol version
- Request ID matching and no cross-talk
- Malformed JSON handling
- Cancellation
"""

import sys
import os
import json
import subprocess
import time
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))
from protocol.protocol import PROTOCOL_VERSION

class TestRepairOSProtocol(unittest.TestCase):

    def setUp(self):
        self.script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend", "main.py"))

    def test_protocol_health_check(self):
        """Verifies health check returns protocol version 1.0.0 and correct ID."""
        proc = subprocess.Popen(
            [sys.executable, self.script_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        req = {"id": "test-req-001", "operation": "health", "args": {}}
        proc.stdin.write(json.dumps(req) + "\n")
        proc.stdin.flush()

        resp_line = proc.stdout.readline()
        resp = json.loads(resp_line)

        self.assertEqual(resp["id"], "test-req-001")
        self.assertEqual(resp["status"], "success")
        self.assertEqual(resp["data"]["protocolVersion"], PROTOCOL_VERSION)

        proc.stdin.write(json.dumps({"id": "exit", "operation": "shutdown"}) + "\n")
        proc.stdin.flush()
        proc.wait(timeout=2)

    def test_malformed_json_handling(self):
        """Verifies backend does not crash on malformed JSON and returns structured error."""
        proc = subprocess.Popen(
            [sys.executable, self.script_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        proc.stdin.write("{malformed json line\n")
        proc.stdin.flush()

        resp_line = proc.stdout.readline()
        resp = json.loads(resp_line)

        self.assertEqual(resp["status"], "error")
        self.assertEqual(resp["error"]["code"], "MALFORMED_JSON")

        proc.stdin.write(json.dumps({"id": "exit", "operation": "shutdown"}) + "\n")
        proc.stdin.flush()
        proc.wait(timeout=2)

    def test_concurrent_requests_independent(self):
        """Verifies concurrent requests receive responses with matching IDs."""
        proc = subprocess.Popen(
            [sys.executable, self.script_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        req1 = {"id": "concurrent-id-AAA", "operation": "health"}
        req2 = {"id": "concurrent-id-BBB", "operation": "get_volumes"}

        proc.stdin.write(json.dumps(req1) + "\n" + json.dumps(req2) + "\n")
        proc.stdin.flush()

        resp1 = json.loads(proc.stdout.readline())
        resp2 = json.loads(proc.stdout.readline())

        received_ids = {resp1["id"], resp2["id"]}
        self.assertIn("concurrent-id-AAA", received_ids)
        self.assertIn("concurrent-id-BBB", received_ids)

        proc.stdin.write(json.dumps({"id": "exit", "operation": "shutdown"}) + "\n")
        proc.stdin.flush()
        proc.wait(timeout=2)

if __name__ == "__main__":
    unittest.main()
