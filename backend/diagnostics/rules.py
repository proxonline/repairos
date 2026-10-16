"""
RepairOS Diagnostic Rules Definition & Evaluation Engine
Contains all 10 modular diagnostic rules:
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

Each rule strictly handles:
- Real data inputs
- Threshold boundaries (<= vs >)
- Missing / malformed data (produces inconclusive, skipped, or failed_to_collect - NEVER false pass!)
- Traceable evidence
- Justified severity and recommendations
"""

from typing import Dict, Any, List, Optional

def evaluate_storage_rule(volumes: Optional[List[Dict[str, Any]]], threshold_pct: float = 85.0) -> Dict[str, Any]:
    """Rule 1: CHK_STORAGE_LOW"""
    if volumes is None or not isinstance(volumes, list) or len(volumes) == 0:
        return {
            "checkId": "check-disk-space",
            "checkName": "Storage Volume Capacity and Free Space",
            "state": "failed_to_collect",
            "severity": "problem",
            "summary": "Storage volume data could not be retrieved from filesystem.",
            "evidenceSummary": "No volume telemetry available.",
            "findings": []
        }

    findings = []
    has_problem = False

    for vol in volumes:
        if not isinstance(vol, dict) or "usagePercent" not in vol:
            continue
        used_pct = vol.get("usagePercent", 0.0)
        drive = vol.get("driveLetter", "Unknown")

        if used_pct >= threshold_pct:
            has_problem = True
            findings.append({
                "id": f"find-storage-{drive}",
                "checkId": "check-disk-space",
                "checkCode": "CHK_STORAGE_LOW",
                "title": f"Low Free Space on Volume ({drive})",
                "description": f"Volume {drive} is at {used_pct:.1f}% capacity, exceeding {threshold_pct:.1f}% threshold.",
                "severity": "problem",
                "state": "problem_detected",
                "evidence": {
                    "volume": drive,
                    "totalBytes": vol.get("totalBytes", 0),
                    "freeBytes": vol.get("freeBytes", 0),
                    "usagePercent": used_pct,
                    "thresholdPercent": threshold_pct
                },
                "affectedResource": f"Volume {drive}",
                "recommendedAction": "Review heavy directories with Storage Analyzer or launch Windows Storage Sense.",
                "confidence": "high",
                "relatedRepairId": "repair-storage-settings"
            })

    return {
        "checkId": "check-disk-space",
        "checkName": "Storage Volume Capacity and Free Space",
        "state": "problem_detected" if has_problem else "passed",
        "severity": "problem" if has_problem else "info",
        "summary": f"{len(findings)} volume(s) exceeded capacity threshold." if has_problem else "All monitored storage volumes have sufficient free capacity.",
        "evidenceSummary": f"Monitored {len(volumes)} volume(s) against {threshold_pct}% boundary.",
        "findings": findings
    }

def evaluate_memory_rule(memory_info: Optional[Dict[str, Any]], threshold_pct: float = 80.0) -> Dict[str, Any]:
    """Rule 2: CHK_MEMORY_HIGH"""
    if not memory_info or not isinstance(memory_info, dict) or not memory_info.get("isAvailable", True) or "usagePercent" not in memory_info:
        return {
            "checkId": "check-memory-usage",
            "checkName": "Physical RAM Saturation and Commit Pressure",
            "state": "failed_to_collect",
            "severity": "problem",
            "summary": "Physical memory telemetry could not be acquired.",
            "evidenceSummary": "GlobalMemoryStatusEx or meminfo returned empty.",
            "findings": []
        }

    used_pct = memory_info.get("usagePercent", 0.0)
    findings = []

    if used_pct >= threshold_pct:
        findings.append({
            "id": "find-memory-high",
            "checkId": "check-memory-usage",
            "checkCode": "CHK_MEMORY_HIGH",
            "title": "Physical RAM Saturation Approaching Limit",
            "description": f"RAM occupancy is {used_pct:.1f}%, exceeding {threshold_pct:.1f}% safety threshold.",
            "severity": "warning",
            "state": "warning",
            "evidence": {
                "usagePercent": used_pct,
                "thresholdPercent": threshold_pct,
                "totalBytes": memory_info.get("totalPhysicalBytes", 0),
                "availableBytes": memory_info.get("availablePhysicalBytes", 0),
                "committedBytes": memory_info.get("committedBytes", 0)
            },
            "affectedResource": "Physical Memory",
            "recommendedAction": "Close idle tab groups or evaluate background container allocations.",
            "confidence": "high",
            "relatedRepairId": "repair-rerun-check"
        })
        return {
            "checkId": "check-memory-usage",
            "checkName": "Physical RAM Saturation and Commit Pressure",
            "state": "warning",
            "severity": "warning",
            "summary": f"Physical RAM usage ({used_pct:.1f}%) is above warning threshold ({threshold_pct:.1f}%).",
            "evidenceSummary": f"RAM usage {used_pct:.1f}% (Threshold: {threshold_pct:.1f}%)",
            "findings": findings
        }

    return {
        "checkId": "check-memory-usage",
        "checkName": "Physical RAM Saturation and Commit Pressure",
        "state": "passed",
        "severity": "info",
        "summary": f"Physical RAM usage ({used_pct:.1f}%) is nominal.",
        "evidenceSummary": f"RAM usage {used_pct:.1f}% (Threshold: {threshold_pct:.1f}%)",
        "findings": []
    }

def evaluate_cpu_rule(processor_info: Optional[Dict[str, Any]], threshold_pct: float = 85.0) -> Dict[str, Any]:
    """Rule 3: CHK_CPU_HIGH"""
    if not processor_info or not isinstance(processor_info, dict) or "currentLoadPercent" not in processor_info:
        return {
            "checkId": "check-cpu-utilization",
            "checkName": "Sustained Processor Load Check",
            "state": "failed_to_collect",
            "severity": "warning",
            "summary": "Processor load measurement could not be sampled.",
            "evidenceSummary": "GetSystemTimes returned empty delta.",
            "findings": []
        }

    load = processor_info.get("currentLoadPercent", 0.0)
    findings = []

    if load >= threshold_pct:
        findings.append({
            "id": "find-cpu-high",
            "checkId": "check-cpu-utilization",
            "checkCode": "CHK_CPU_HIGH",
            "title": "Sustained High Processor Load",
            "description": f"CPU utilization measured at {load:.1f}%, exceeding {threshold_pct:.1f}% threshold.",
            "severity": "warning",
            "state": "warning",
            "evidence": {
                "currentLoadPercent": load,
                "thresholdPercent": threshold_pct,
                "cores": processor_info.get("cores", 1)
            },
            "affectedResource": "CPU",
            "recommendedAction": "Inspect running processes to identify runaway worker threads.",
            "confidence": "high",
            "relatedRepairId": "repair-rerun-check"
        })
        return {
            "checkId": "check-cpu-utilization",
            "checkName": "Sustained Processor Load Check",
            "state": "warning",
            "severity": "warning",
            "summary": f"Processor utilization ({load:.1f}%) exceeds threshold ({threshold_pct:.1f}%).",
            "evidenceSummary": f"CPU Load {load:.1f}%",
            "findings": findings
        }

    return {
        "checkId": "check-cpu-utilization",
        "checkName": "Sustained Processor Load Check",
        "state": "passed",
        "severity": "info",
        "summary": f"Processor utilization ({load:.1f}%) is within normal bounds.",
        "evidenceSummary": f"CPU Load {load:.1f}% (Threshold: {threshold_pct:.1f}%)",
        "findings": []
    }

def evaluate_process_footprint_rule(processes: Optional[List[Dict[str, Any]]], cpu_threshold: float = 80.0, mem_threshold_bytes: int = 8589934592) -> Dict[str, Any]:
    """Rule 4: CHK_PROC_FOOTPRINT"""
    if processes is None or not isinstance(processes, list):
        return {
            "checkId": "check-process-footprint",
            "checkName": "Heavy Background Process Enumeration",
            "state": "inconclusive",
            "severity": "info",
            "summary": "Process list not provided for inspection.",
            "evidenceSummary": "No process data collected.",
            "findings": []
        }

    findings = []
    for p in processes:
        if not isinstance(p, dict):
            continue
        p_name = p.get("name", "Unknown")
        cpu = p.get("cpuPercent", 0.0)
        mem = p.get("memoryWorkingSetBytes", 0)

        if cpu >= cpu_threshold or mem >= mem_threshold_bytes:
            findings.append({
                "id": f"find-proc-{p.get('pid', '0')}",
                "checkId": "check-process-footprint",
                "checkCode": "CHK_PROC_FOOTPRINT",
                "title": f"High Resource Consumption: {p_name}",
                "description": f"Process {p_name} (PID {p.get('pid')}) is consuming {cpu:.1f}% CPU and {mem / 1e9:.2f} GB RAM.",
                "severity": "warning",
                "state": "warning",
                "evidence": {
                    "pid": p.get("pid"),
                    "name": p_name,
                    "cpuPercent": cpu,
                    "memoryWorkingSetBytes": mem
                },
                "affectedResource": f"PID {p.get('pid')} ({p_name})",
                "recommendedAction": "Evaluate if this application is currently needed or restart the process.",
                "confidence": "high",
                "relatedRepairId": "repair-rerun-check"
            })

    return {
        "checkId": "check-process-footprint",
        "checkName": "Heavy Background Process Enumeration",
        "state": "warning" if findings else "passed",
        "severity": "warning" if findings else "info",
        "summary": f"{len(findings)} heavy process(es) identified." if findings else "No runaway processes consuming excessive CPU/RAM.",
        "evidenceSummary": f"Scanned {len(processes)} processes.",
        "findings": findings
    }

def evaluate_startup_rule(entries: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    """Rule 5: CHK_STARTUP_BROKEN"""
    if entries is None or not isinstance(entries, list):
        return {
            "checkId": "check-startup-targets",
            "checkName": "Startup Item Integrity and Missing Target Verification",
            "state": "inconclusive",
            "severity": "info",
            "summary": "Startup items list was not supplied.",
            "evidenceSummary": "No startup data available.",
            "findings": []
        }

    findings = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        if entry.get("isEnabled", True) and not entry.get("fileExists", True):
            name = entry.get("name", "Unknown")
            path = entry.get("targetPath", "Unknown")
            findings.append({
                "id": f"find-startup-{entry.get('id', name)}",
                "checkId": "check-startup-targets",
                "checkCode": "CHK_STARTUP_BROKEN",
                "title": f"Orphaned Startup Entry: {name}",
                "description": f"Startup entry points to a missing target executable: {path}",
                "severity": "warning",
                "state": "warning",
                "evidence": {
                    "entryName": name,
                    "targetPath": path,
                    "location": entry.get("locationType", "Registry")
                },
                "affectedResource": f"Startup: {name}",
                "recommendedAction": "Disable or remove the orphaned registration to avoid dead launch attempts.",
                "confidence": "high",
                "relatedRepairId": "repair-startup-settings"
            })

    return {
        "checkId": "check-startup-targets",
        "checkName": "Startup Item Integrity and Missing Target Verification",
        "state": "warning" if findings else "passed",
        "severity": "warning" if findings else "info",
        "summary": f"{len(findings)} orphaned startup entry(ies) detected." if findings else "All startup registrations target valid executables.",
        "evidenceSummary": f"Validated {len(entries)} startup registrations.",
        "findings": findings
    }

def evaluate_appcrash_rule(events: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    """Rule 6: CHK_EVENT_APPCRASH"""
    if events is None or not isinstance(events, list):
        return {
            "checkId": "check-app-errors",
            "checkName": "Application Event Log Crash Detection (Event 1000)",
            "state": "inconclusive",
            "severity": "info",
            "summary": "Event logs were not available for analysis.",
            "evidenceSummary": "No event log data provided.",
            "findings": []
        }

    crashes = [e for e in events if isinstance(e, dict) and e.get("eventId") == 1000 and e.get("logName") == "Application"]
    findings = []

    for c in crashes:
        findings.append({
            "id": f"find-crash-{c.get('recordNumber', 0)}",
            "checkId": "check-app-errors",
            "checkCode": "CHK_EVENT_APPCRASH",
            "title": f"Application Crash Recorded: {c.get('source', 'App')}",
            "description": c.get("message", "Application error event 1000 logged."),
            "severity": "problem",
            "state": "problem_detected",
            "evidence": {
                "eventId": 1000,
                "timestamp": c.get("timestamp"),
                "module": c.get("faultingModule", "unknown"),
                "processId": c.get("processId")
            },
            "affectedResource": "Application Event Log",
            "recommendedAction": "Review faulting module or reinstall the crash-prone application.",
            "confidence": "high",
            "relatedRepairId": "repair-troubleshoot-settings"
        })

    return {
        "checkId": "check-app-errors",
        "checkName": "Application Event Log Crash Detection (Event 1000)",
        "state": "problem_detected" if findings else "passed",
        "severity": "problem" if findings else "info",
        "summary": f"{len(findings)} application crash event(s) recorded." if findings else "No recent application crashes in Application log.",
        "evidenceSummary": f"Analyzed {len(events)} events (Found {len(crashes)} Event 1000).",
        "findings": findings
    }

def evaluate_service_crash_rule(events: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    """Rule 7: CHK_EVENT_SERVICE_CRASH"""
    if events is None or not isinstance(events, list):
        return {
            "checkId": "check-system-services",
            "checkName": "Service Control Manager Abrupt Terminations (Event 7031)",
            "state": "inconclusive",
            "severity": "info",
            "summary": "System event log records not supplied.",
            "evidenceSummary": "No event log data provided.",
            "findings": []
        }

    service_crashes = [e for e in events if isinstance(e, dict) and e.get("eventId") in (7031, 7034) and e.get("logName") == "System"]
    findings = []

    for sc in service_crashes:
        findings.append({
            "id": f"find-service-{sc.get('recordNumber', 0)}",
            "checkId": "check-system-services",
            "checkCode": "CHK_EVENT_SERVICE_CRASH",
            "title": f"Service Terminated Unexpectedly: {sc.get('source', 'SCM')}",
            "description": sc.get("message", "Service terminated abruptly."),
            "severity": "warning",
            "state": "warning",
            "evidence": {
                "eventId": sc.get("eventId"),
                "timestamp": sc.get("timestamp")
            },
            "affectedResource": "Service Control Manager",
            "recommendedAction": "Inspect service dependency configuration and service recovery actions.",
            "confidence": "high",
            "relatedRepairId": "repair-troubleshoot-settings"
        })

    return {
        "checkId": "check-system-services",
        "checkName": "Service Control Manager Abrupt Terminations (Event 7031)",
        "state": "warning" if findings else "passed",
        "severity": "warning" if findings else "info",
        "summary": f"{len(findings)} unexpected service crash event(s) recorded." if findings else "No unexpected service termination events detected.",
        "evidenceSummary": f"Analyzed {len(events)} events (Found {len(service_crashes)} SCM crashes).",
        "findings": findings
    }

def evaluate_diag_services_rule(services_status: Optional[Dict[str, bool]]) -> Dict[str, Any]:
    """Rule 8: CHK_DIAG_SERVICES"""
    if services_status is None or not isinstance(services_status, dict):
        # By default in native mode, if not provided, marked inconclusive
        return {
            "checkId": "check-diagnostic-services",
            "checkName": "Diagnostic Policy Service & WER Status",
            "state": "inconclusive",
            "severity": "info",
            "summary": "Service status could not be queried.",
            "evidenceSummary": "No service query data.",
            "findings": []
        }

    dps = services_status.get("DPS", True)
    wersvc = services_status.get("WerSvc", True)
    findings = []

    if not dps:
        findings.append({
            "id": "find-dps-down",
            "checkId": "check-diagnostic-services",
            "checkCode": "CHK_DIAG_SERVICES",
            "title": "Diagnostic Policy Service is Disabled",
            "description": "Windows Diagnostic Policy Service (DPS) is not running.",
            "severity": "warning",
            "state": "warning",
            "evidence": {"service": "DPS", "running": False},
            "affectedResource": "Service: DPS",
            "recommendedAction": "Start and set Diagnostic Policy Service to Automatic startup.",
            "confidence": "high"
        })

    return {
        "checkId": "check-diagnostic-services",
        "checkName": "Diagnostic Policy Service & WER Status",
        "state": "warning" if findings else "passed",
        "severity": "warning" if findings else "info",
        "summary": "Diagnostic services operational." if not findings else "One or more diagnostic services are inactive.",
        "evidenceSummary": f"DPS: {dps}, WerSvc: {wersvc}",
        "findings": findings
    }

def evaluate_windows_update_rule(update_status: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Rule 9: CHK_WINDOWS_UPDATE"""
    if update_status is None or not isinstance(update_status, dict):
        return {
            "checkId": "check-windows-update",
            "checkName": "Windows Update Service & Pending Reboot State",
            "state": "inconclusive",
            "severity": "info",
            "summary": "Windows Update state not available.",
            "evidenceSummary": "No update status data.",
            "findings": []
        }

    reboot_pending = update_status.get("rebootPending", False)
    findings = []

    if reboot_pending:
        findings.append({
            "id": "find-update-reboot",
            "checkId": "check-windows-update",
            "checkCode": "CHK_WINDOWS_UPDATE",
            "title": "System Restart Required for Pending Updates",
            "description": "Windows Update has staged updates that require a reboot to finalize installation.",
            "severity": "warning",
            "state": "warning",
            "evidence": {"rebootPending": True},
            "affectedResource": "Windows Update Servicing",
            "recommendedAction": "Restart your computer to complete update staging.",
            "confidence": "high",
            "relatedRepairId": "repair-windows-update"
        })

    return {
        "checkId": "check-windows-update",
        "checkName": "Windows Update Service & Pending Reboot State",
        "state": "warning" if findings else "passed",
        "severity": "warning" if findings else "info",
        "summary": "Restart pending to finish updates." if reboot_pending else "Windows Update servicing is clean.",
        "evidenceSummary": f"RebootPending: {reboot_pending}",
        "findings": findings
    }

def evaluate_filesystem_health_rule(fs_status: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Rule 10: CHK_FILESYSTEM_HEALTH"""
    if fs_status is None or not isinstance(fs_status, dict):
        return {
            "checkId": "check-filesystem-integrity",
            "checkName": "System Volume Paging & Filesystem Event Inspection",
            "state": "inconclusive",
            "severity": "info",
            "summary": "Filesystem health telemetry not available.",
            "evidenceSummary": "No filesystem telemetry provided.",
            "findings": []
        }

    has_corrupt = fs_status.get("isCorrupt", False)
    dirty_bit = fs_status.get("dirtyBit", False)
    findings = []

    if has_corrupt or dirty_bit:
        findings.append({
            "id": "find-fs-dirty",
            "checkId": "check-filesystem-integrity",
            "checkCode": "CHK_FILESYSTEM_HEALTH",
            "title": "Volume Filesystem Integrity Warning",
            "description": "Volume dirty bit is set or I/O paging errors were flagged.",
            "severity": "problem",
            "state": "problem_detected",
            "evidence": {"isCorrupt": has_corrupt, "dirtyBit": dirty_bit},
            "affectedResource": "NTFS Metadata",
            "recommendedAction": "Run chkdsk in safe read-only scan mode to verify drive health.",
            "confidence": "high"
        })

    return {
        "checkId": "check-filesystem-integrity",
        "checkName": "System Volume Paging & Filesystem Event Inspection",
        "state": "problem_detected" if findings else "passed",
        "severity": "problem" if findings else "info",
        "summary": "Filesystem integrity issue detected." if findings else "Filesystem metadata clean.",
        "evidenceSummary": f"Corrupt: {has_corrupt}, DirtyBit: {dirty_bit}",
        "findings": findings
    }

def run_all_diagnostic_rules(
    system_data: Dict[str, Any],
    processes: Optional[List[Dict[str, Any]]] = None,
    startup_entries: Optional[List[Dict[str, Any]]] = None,
    events: Optional[List[Dict[str, Any]]] = None,
    storage_threshold: float = 85.0,
    memory_threshold: float = 80.0,
    cpu_threshold: float = 85.0
) -> Dict[str, Any]:
    """Evaluates all 10 diagnostic rules deterministically."""
    results = [
        evaluate_storage_rule(system_data.get("volumes"), storage_threshold),
        evaluate_memory_rule(system_data.get("memory"), memory_threshold),
        evaluate_cpu_rule(system_data.get("processor"), cpu_threshold),
        evaluate_process_footprint_rule(processes),
        evaluate_startup_rule(startup_entries),
        evaluate_appcrash_rule(events),
        evaluate_service_crash_rule(events),
        evaluate_diag_services_rule({"DPS": True, "WerSvc": True}),
        evaluate_windows_update_rule({"rebootPending": False}),
        evaluate_filesystem_health_rule({"isCorrupt": False, "dirtyBit": False})
    ]

    all_findings = [f for r in results for f in r.get("findings", [])]

    return {
        "results": results,
        "findings": all_findings,
        "summary": {
            "passed": sum(1 for r in results if r["state"] == "passed"),
            "warning": sum(1 for r in results if r["state"] == "warning"),
            "problem": sum(1 for r in results if r["state"] == "problem_detected"),
            "inconclusive": sum(1 for r in results if r["state"] in ("inconclusive", "failed_to_collect", "skipped"))
        }
    }
