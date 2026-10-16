"""
RepairOS Diagnostic Rules & Storage Automated Unit Tests
"""

import sys
import os
import unittest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))

from diagnostics.rules import evaluate_storage_rule, evaluate_memory_rule
from storage.db import init_db, save_scan, get_scans

class TestRepairOSDiagnostics(unittest.TestCase):

    def test_storage_rule_nominal(self):
        vols = [{
            "driveLetter": "C:",
            "totalBytes": 500000000000,
            "freeBytes": 200000000000,
            "usagePercent": 60.0
        }]
        res = evaluate_storage_rule(vols, threshold_pct=85.0)
        self.assertEqual(res["state"], "passed")
        self.assertEqual(len(res["findings"]), 0)

    def test_storage_rule_threshold_exceeded(self):
        vols = [{
            "driveLetter": "C:",
            "totalBytes": 500000000000,
            "freeBytes": 50000000000,
            "usagePercent": 90.0
        }]
        res = evaluate_storage_rule(vols, threshold_pct=85.0)
        self.assertEqual(res["state"], "problem_detected")
        self.assertEqual(len(res["findings"]), 1)
        self.assertEqual(res["findings"][0]["checkCode"], "CHK_STORAGE_LOW")

    def test_memory_rule_saturation(self):
        mem = {
            "totalPhysicalBytes": 16000000000,
            "availablePhysicalBytes": 2000000000,
            "usagePercent": 87.5
        }
        res = evaluate_memory_rule(mem, threshold_pct=80.0)
        self.assertEqual(res["state"], "warning")
        self.assertEqual(len(res["findings"]), 1)

    def test_sqlite_persistence(self):
        init_db()
        test_scan = {
            "id": "scan-test-01",
            "timestamp": "2026-10-16T16:00:00Z",
            "durationSeconds": 2.5,
            "scanType": "quick",
            "passedCount": 8,
            "warningCount": 1,
            "problemCount": 1,
            "findings": [{"id": "f-1", "title": "Test Finding"}]
        }
        save_scan(test_scan)
        scans = get_scans(limit=5)
        self.assertTrue(any(s["id"] == "scan-test-01" for s in scans))

if __name__ == "__main__":
    unittest.main()
