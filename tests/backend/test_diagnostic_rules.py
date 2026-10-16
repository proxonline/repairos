"""
RepairOS Diagnostic Rules Comprehensive Unit Tests
Validates all 10 modular diagnostic rules:
1. CHK_STORAGE_LOW
2. CHK_MEMORY_HIGH
3. CHK_CPU_HIGH
4. CHK_PROC_FOOTPRINT
5. CHK_STARTUP_BROKEN
6. CHK_EVENT_APPCRASH
7. CHK_EVENT_SERVICE_CRASH
8. CHK_DIAG_SERVICES
9. CHK_WINDOWS_UPDATE
10. CHK_FILESYSTEM_HEALTH
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))
from diagnostics.rules import (
    evaluate_storage_rule,
    evaluate_memory_rule,
    evaluate_cpu_rule,
    evaluate_process_footprint_rule,
    evaluate_startup_rule,
    evaluate_appcrash_rule,
    evaluate_service_crash_rule,
    evaluate_diag_services_rule,
    evaluate_windows_update_rule,
    evaluate_filesystem_health_rule,
    run_all_diagnostic_rules
)

class TestDiagnosticRulesAudit(unittest.TestCase):

    # 1. CHK_STORAGE_LOW
    def test_rule_1_storage_normal_and_boundary(self):
        # 84.9% used (under 85.0% threshold)
        vols_ok = [{"driveLetter": "C:", "totalBytes": 100, "freeBytes": 16, "usagePercent": 84.0}]
        res_ok = evaluate_storage_rule(vols_ok, threshold_pct=85.0)
        self.assertEqual(res_ok["state"], "passed")

        # 85.0% used (at boundary) -> problem detected
        vols_boundary = [{"driveLetter": "C:", "totalBytes": 100, "freeBytes": 15, "usagePercent": 85.0}]
        res_boundary = evaluate_storage_rule(vols_boundary, threshold_pct=85.0)
        self.assertEqual(res_boundary["state"], "problem_detected")
        self.assertEqual(res_boundary["findings"][0]["checkCode"], "CHK_STORAGE_LOW")

    def test_rule_1_storage_missing_data(self):
        # Missing volume data must not pass
        res_none = evaluate_storage_rule(None)
        self.assertEqual(res_none["state"], "failed_to_collect")
        res_empty = evaluate_storage_rule([])
        self.assertEqual(res_empty["state"], "failed_to_collect")

    # 2. CHK_MEMORY_HIGH
    def test_rule_2_memory_normal_and_boundary(self):
        mem_ok = {"isAvailable": True, "totalPhysicalBytes": 16e9, "availablePhysicalBytes": 4e9, "usagePercent": 75.0}
        self.assertEqual(evaluate_memory_rule(mem_ok, 80.0)["state"], "passed")

        mem_high = {"isAvailable": True, "totalPhysicalBytes": 16e9, "availablePhysicalBytes": 2e9, "usagePercent": 87.5}
        res = evaluate_memory_rule(mem_high, 80.0)
        self.assertEqual(res["state"], "warning")
        self.assertEqual(res["findings"][0]["checkCode"], "CHK_MEMORY_HIGH")

    def test_rule_2_memory_missing_data(self):
        self.assertEqual(evaluate_memory_rule(None)["state"], "failed_to_collect")
        self.assertEqual(evaluate_memory_rule({"isAvailable": False})["state"], "failed_to_collect")

    # 3. CHK_CPU_HIGH
    def test_rule_3_cpu(self):
        proc_ok = {"currentLoadPercent": 42.0, "cores": 8}
        self.assertEqual(evaluate_cpu_rule(proc_ok, 85.0)["state"], "passed")

        proc_high = {"currentLoadPercent": 92.5, "cores": 8}
        res = evaluate_cpu_rule(proc_high, 85.0)
        self.assertEqual(res["state"], "warning")
        self.assertEqual(res["findings"][0]["checkCode"], "CHK_CPU_HIGH")

        self.assertEqual(evaluate_cpu_rule(None)["state"], "failed_to_collect")

    # 4. CHK_PROC_FOOTPRINT
    def test_rule_4_process_footprint(self):
        procs_ok = [{"name": "app.exe", "pid": 1, "cpuPercent": 5.0, "memoryWorkingSetBytes": 100e6}]
        self.assertEqual(evaluate_process_footprint_rule(procs_ok)["state"], "passed")

        procs_heavy = [{"name": "heavy.exe", "pid": 99, "cpuPercent": 95.0, "memoryWorkingSetBytes": 500e6}]
        res = evaluate_process_footprint_rule(procs_heavy)
        self.assertEqual(res["state"], "warning")
        self.assertEqual(res["findings"][0]["checkCode"], "CHK_PROC_FOOTPRINT")

        self.assertEqual(evaluate_process_footprint_rule(None)["state"], "inconclusive")

    # 5. CHK_STARTUP_BROKEN
    def test_rule_5_startup_broken(self):
        entries_ok = [{"id": "1", "name": "App", "isEnabled": True, "fileExists": True}]
        self.assertEqual(evaluate_startup_rule(entries_ok)["state"], "passed")

        entries_broken = [{"id": "2", "name": "DeadApp", "isEnabled": True, "fileExists": False, "targetPath": "C:\\dead.exe"}]
        res = evaluate_startup_rule(entries_broken)
        self.assertEqual(res["state"], "warning")
        self.assertEqual(res["findings"][0]["checkCode"], "CHK_STARTUP_BROKEN")

        self.assertEqual(evaluate_startup_rule(None)["state"], "inconclusive")

    # 6. CHK_EVENT_APPCRASH
    def test_rule_6_app_crash(self):
        events_ok = [{"logName": "Application", "eventId": 1001, "message": "Info"}]
        self.assertEqual(evaluate_appcrash_rule(events_ok)["state"], "passed")

        events_crash = [{"logName": "Application", "eventId": 1000, "source": "CrashApp", "message": "Faulting app"}]
        res = evaluate_appcrash_rule(events_crash)
        self.assertEqual(res["state"], "problem_detected")
        self.assertEqual(res["findings"][0]["checkCode"], "CHK_EVENT_APPCRASH")

        self.assertEqual(evaluate_appcrash_rule(None)["state"], "inconclusive")

    # 7. CHK_EVENT_SERVICE_CRASH
    def test_rule_7_service_crash(self):
        events_ok = [{"logName": "System", "eventId": 7036, "message": "Started"}]
        self.assertEqual(evaluate_service_crash_rule(events_ok)["state"], "passed")

        events_scm_crash = [{"logName": "System", "eventId": 7031, "source": "SCM", "message": "Service terminated"}]
        res = evaluate_service_crash_rule(events_scm_crash)
        self.assertEqual(res["state"], "warning")
        self.assertEqual(res["findings"][0]["checkCode"], "CHK_EVENT_SERVICE_CRASH")

        self.assertEqual(evaluate_service_crash_rule(None)["state"], "inconclusive")

    # 8. CHK_DIAG_SERVICES
    def test_rule_8_diagnostic_services(self):
        self.assertEqual(evaluate_diag_services_rule({"DPS": True, "WerSvc": True})["state"], "passed")
        res_down = evaluate_diag_services_rule({"DPS": False, "WerSvc": True})
        self.assertEqual(res_down["state"], "warning")
        self.assertEqual(evaluate_diag_services_rule(None)["state"], "inconclusive")

    # 9. CHK_WINDOWS_UPDATE
    def test_rule_9_windows_update(self):
        self.assertEqual(evaluate_windows_update_rule({"rebootPending": False})["state"], "passed")
        res_reboot = evaluate_windows_update_rule({"rebootPending": True})
        self.assertEqual(res_reboot["state"], "warning")
        self.assertEqual(res_reboot["findings"][0]["checkCode"], "CHK_WINDOWS_UPDATE")
        self.assertEqual(evaluate_windows_update_rule(None)["state"], "inconclusive")

    # 10. CHK_FILESYSTEM_HEALTH
    def test_rule_10_filesystem_health(self):
        self.assertEqual(evaluate_filesystem_health_rule({"isCorrupt": False, "dirtyBit": False})["state"], "passed")
        res_dirty = evaluate_filesystem_health_rule({"isCorrupt": False, "dirtyBit": True})
        self.assertEqual(res_dirty["state"], "problem_detected")
        self.assertEqual(res_dirty["findings"][0]["checkCode"], "CHK_FILESYSTEM_HEALTH")
        self.assertEqual(evaluate_filesystem_health_rule(None)["state"], "inconclusive")

    # Full Suite Orchestrator
    def test_all_10_rules_aggregation(self):
        sys_data = {
            "volumes": [{"driveLetter": "C:", "usagePercent": 70.0}],
            "memory": {"isAvailable": True, "usagePercent": 60.0},
            "processor": {"currentLoadPercent": 30.0}
        }
        res = run_all_diagnostic_rules(sys_data, processes=[], startup_entries=[], events=[])
        self.assertEqual(len(res["results"]), 10)
        self.assertEqual(res["summary"]["passed"], 10)

if __name__ == "__main__":
    unittest.main()
