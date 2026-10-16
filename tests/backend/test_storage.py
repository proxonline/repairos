"""
RepairOS Storage Traversal Engine Automated Tests
Verifies:
- Empty directories
- Deep nested trees
- Symlink loop prevention (does not recurse indefinitely)
- Cancellation during scan
- Missing paths raise appropriate FileNotFoundError
"""

import sys
import os
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))
from system.storage import scan_directory, StorageScanCancelled

class TestStorageTraversal(unittest.TestCase):

    def test_empty_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            res = scan_directory(tmpdir)
            self.assertEqual(res["sizeBytes"], 0)
            self.assertEqual(res["totalFiles"], 0)
            self.assertEqual(res["totalDirectories"], 1)
            self.assertEqual(len(res["children"]), 0)

    def test_nested_directory_and_sizes(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            sub = os.path.join(tmpdir, "subdir")
            os.makedirs(sub)

            f1 = os.path.join(tmpdir, "file1.txt")
            with open(f1, "wb") as f:
                f.write(b"x" * 1024)

            f2 = os.path.join(sub, "file2.dat")
            with open(f2, "wb") as f:
                f.write(b"y" * 2048)

            res = scan_directory(tmpdir)
            self.assertEqual(res["sizeBytes"], 3072)
            self.assertEqual(res["totalFiles"], 2)
            self.assertEqual(len(res["children"]), 2)
            self.assertEqual(res["children"][0]["sizeBytes"], 2048)

    def test_symlink_loop_prevention(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            sub = os.path.join(tmpdir, "loop_dir")
            os.makedirs(sub)
            # Create a symlink inside sub pointing back to tmpdir
            try:
                os.symlink(tmpdir, os.path.join(sub, "back_link"))
                res = scan_directory(tmpdir)
                # Ensure it terminates safely and did not loop indefinitely
                self.assertIsNotNone(res)
            except (OSError, NotImplementedError):
                # Symlinks might not be supported without admin on some systems
                pass

    def test_scan_cancellation(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Cancel immediately
            with self.assertRaises(StorageScanCancelled):
                scan_directory(tmpdir, is_cancelled_fn=lambda: True)

    def test_invalid_path_raises(self):
        with self.assertRaises(FileNotFoundError):
            scan_directory("/path/does/not/exist/9999999999")

if __name__ == "__main__":
    unittest.main()
