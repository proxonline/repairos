"""
RepairOS SQLite Local Database Storage
Stores scan history, repair audit trail, and persistent configuration.
"""

import sqlite3
import json
import os
from typing import Dict, Any, List, Optional

DB_FILE = os.path.join(os.path.dirname(__file__), "..", "repair_os.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            duration_seconds REAL NOT NULL,
            scan_type TEXT NOT NULL,
            passed_count INTEGER NOT NULL,
            warning_count INTEGER NOT NULL,
            problem_count INTEGER NOT NULL,
            findings_json TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS repairs_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repair_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            success INTEGER NOT NULL,
            logs_json TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def save_scan(scan_record: Dict[str, Any]):
    init_db()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO scans (id, timestamp, duration_seconds, scan_type, passed_count, warning_count, problem_count, findings_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        scan_record["id"],
        scan_record["timestamp"],
        scan_record["durationSeconds"],
        scan_record["scanType"],
        scan_record["passedCount"],
        scan_record["warningCount"],
        scan_record["problemCount"],
        json.dumps(scan_record.get("findings", []))
    ))
    conn.commit()
    conn.close()

def get_scans(limit: int = 50) -> List[Dict[str, Any]]:
    init_db()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, timestamp, duration_seconds, scan_type, passed_count, warning_count, problem_count, findings_json FROM scans ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r[0],
            "timestamp": r[1],
            "durationSeconds": r[2],
            "scanType": r[3],
            "passedCount": r[4],
            "warningCount": r[5],
            "problemCount": r[6],
            "findings": json.loads(r[7]),
            "appVersion": "1.2.0"
        })
    return results
