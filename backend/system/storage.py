"""
RepairOS Safe Storage Traversal Engine
Provides robust, recursive directory traversal with:
- Traversal loop prevention (does not follow symlinks or Windows reparse points)
- PermissionError / FileNotFoundError resilience
- Unicode path support
- Progress callback / cancellation support
- Top-N largest files extraction to prevent unbounded memory growth
"""

import os
import sys
import time
import heapq
from typing import Dict, Any, List, Optional, Callable

class StorageScanCancelled(Exception):
    pass

def scan_directory(
    root_path: str,
    on_progress: Optional[Callable[[Dict[str, Any]], None]] = None,
    is_cancelled_fn: Optional[Callable[[], bool]] = None,
    top_n_files: int = 50
) -> Dict[str, Any]:
    """
    Safely traverses root_path without following symlinks or reparse points.
    Returns structured node containing aggregated sizes and top largest files.
    """
    if not os.path.exists(root_path):
        raise FileNotFoundError(f"Path does not exist: {root_path}")

    if not os.path.isdir(root_path):
        raise NotADirectoryError(f"Target is not a directory: {root_path}")

    total_bytes = 0
    file_count = 0
    dir_count = 0

    # Min-heap of (size, path, name, ext) for top N largest files
    largest_files: List[Any] = []
    
    # Track visited real device/inode identifiers on POSIX or canonical paths on Windows to prevent loops
    visited_dirs = set()

    # Progress throttle
    last_report_time = 0.0

    try:
        canonical_root = os.path.realpath(root_path)
        visited_dirs.add(canonical_root)
    except Exception:
        visited_dirs.add(root_path)

    stack = [root_path]

    while stack:
        if is_cancelled_fn and is_cancelled_fn():
            raise StorageScanCancelled("Directory traversal cancelled by user.")

        current_dir = stack.pop()
        dir_count += 1

        try:
            with os.scandir(current_dir) as entries:
                for entry in entries:
                    if is_cancelled_fn and is_cancelled_fn():
                        raise StorageScanCancelled("Directory traversal cancelled by user.")

                    try:
                        # Never follow symlinks or reparse points to avoid infinite loops
                        if entry.is_symlink():
                            continue

                        if entry.is_file(follow_symlinks=False):
                            file_count += 1
                            try:
                                stat = entry.stat(follow_symlinks=False)
                                size = stat.st_size
                                total_bytes += size

                                ext = os.path.splitext(entry.name)[1].lstrip('.').lower()
                                item = (size, entry.path, entry.name, ext)

                                if len(largest_files) < top_n_files:
                                    heapq.heappush(largest_files, item)
                                else:
                                    if size > largest_files[0][0]:
                                        heapq.heapreplace(largest_files, item)
                            except (FileNotFoundError, PermissionError, OSError):
                                # File disappeared, locked, or permission denied
                                continue

                        elif entry.is_dir(follow_symlinks=False):
                            try:
                                real_sub = os.path.realpath(entry.path)
                                if real_sub not in visited_dirs:
                                    visited_dirs.add(real_sub)
                                    stack.append(entry.path)
                            except (PermissionError, OSError):
                                continue

                    except (PermissionError, FileNotFoundError, OSError):
                        continue

        except (PermissionError, FileNotFoundError, OSError):
            continue

        # Emit progress if callback supplied
        now = time.time() if 'time' in globals() else 0.0
        if on_progress and (now - last_report_time > 0.15):
            last_report_time = now
            on_progress({
                "scannedFiles": file_count,
                "scannedDirectories": dir_count,
                "scannedBytes": total_bytes,
                "currentDirectory": current_dir,
                "isScanning": True
            })

    # Sort largest files descending
    sorted_files = sorted(largest_files, key=lambda x: x[0], reverse=True)
    children = [
        {
            "name": f[2],
            "path": f[1],
            "sizeBytes": f[0],
            "isDirectory": False,
            "extension": f[3]
        }
        for f in sorted_files
    ]

    return {
        "name": os.path.basename(root_path) or root_path,
        "path": root_path,
        "sizeBytes": total_bytes,
        "isDirectory": True,
        "totalFiles": file_count,
        "totalDirectories": dir_count,
        "children": children
    }
