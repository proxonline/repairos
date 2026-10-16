#!/usr/bin/env python3
"""
RepairOS Master Test Runner
Runs all backend unit and integration test suites:
- Protocol framing, concurrency, error handling, cancellation
- Diagnostic rules audit (all 10 rules across nominal, boundary, missing, error)
- Storage safe traversal engine
- Repair executor policy whitelisting and verification
- SQLite persistence
"""

import sys
import unittest
import os

if __name__ == "__main__":
    loader = unittest.TestLoader()
    start_dir = os.path.join(os.path.dirname(__file__), "backend")
    suite = loader.discover(start_dir, pattern="test_*.py")

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    sys.exit(0 if result.wasSuccessful() else 1)
