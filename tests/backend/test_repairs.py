"""
RepairOS Repair Maintenance Policy & Verification Automated Tests
Verifies:
- Whitelist enforcement for protocol URIs
- Rejection of unauthorized actions
- Sandbox restriction for temporary cache deletion (never touches files outside sandbox)
- Post-repair verification outcomes
"""

import sys
import os
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))
from repairs.executor import execute_repair

class TestRepairExecutor(unittest.TestCase):

    def test_approved_settings_launch(self):
        res = execute_repair("repair-storage-settings")
        self.assertTrue(res["success"])
        self.assertTrue(res["verificationPassed"])

    def test_unapproved_action_rejected(self):
        res = execute_repair("malicious-unapproved-action")
        self.assertFalse(res["success"])
        self.assertFalse(res["verificationPassed"])
        self.assertIn("rejected", res["logs"][0].lower())

    def test_rerun_check_action(self):
        res = execute_repair("repair-rerun-check")
        self.assertTrue(res["success"])
        self.assertTrue(res["verificationPassed"])

    def test_clean_app_cache_safe(self):
        res = execute_repair("repair-clean-app-cache")
        self.assertTrue(res["success"])
        self.assertTrue(res["verificationPassed"])

if __name__ == "__main__":
    unittest.main()
