"""运行时调优配置必须与镜像启动命令、锁文件保持一致。

这些是部署层字符串契约（Dockerfile / requirements 锁文件），用测试钉住，
避免后续改动把它们悄悄丢掉。
"""
import re
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DockerRuntimeTuningTests(unittest.TestCase):
    def setUp(self):
        self.dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")

    def test_glibc_heap_trim_threshold_is_set(self):
        self.assertIn("MALLOC_TRIM_THRESHOLD_=65536", self.dockerfile)

    @unittest.skipUnless(os.name == "posix", "Container startup uses a POSIX shell")
    def test_keep_alive_timeout_is_configurable(self):
        self.assertIn("TIMEOUT_KEEP_ALIVE=5", self.dockerfile)
        # Execute the shared startup script with a harmless uvicorn stub.
        with tempfile.TemporaryDirectory() as directory:
            stub = Path(directory) / "uvicorn"
            stub.write_text('#!/bin/sh\nprintf "%s\\n" "$@"\n', encoding="utf-8")
            stub.chmod(0o755)
            result = subprocess.run(
                ["/bin/sh", str(ROOT / "docker/start.sh")],
                env={**os.environ, "PATH": directory, "TIMEOUT_KEEP_ALIVE": "17", "APP_ENV": "production", "ACCESS_LOG": "false"},
                check=True,
                capture_output=True,
                text=True,
            )
        arguments = result.stdout.splitlines()
        self.assertEqual(arguments[:2], ["fengchao:create_app", "--factory"])
        self.assertEqual(arguments[arguments.index("--timeout-keep-alive") + 1], "17")
        self.assertIn("--no-access-log", arguments)


class PerformanceDependencyTests(unittest.TestCase):
    def test_uvicorn_extras_are_pinned(self):
        requirements = (ROOT / "requirements.txt").read_text(encoding="utf-8")

        self.assertIn('uvloop==0.23.0; sys_platform != "win32"', requirements)
        self.assertIn("httptools==0.9.0", requirements)

    def test_lockfile_contains_hashed_wheels(self):
        lock = (ROOT / "requirements.lock.txt").read_text(encoding="utf-8")

        for package in ("httptools", "uvloop"):
            blocks = re.findall(
                rf"(?ms)^{package}==\S+[^\n]*\n((?:    --hash=\S+[^\n]*\n)+)",
                lock,
            )
            self.assertTrue(blocks, f"{package} missing from requirements.lock.txt")
            self.assertTrue(
                any("--hash=sha256:" in block for block in blocks),
                f"{package} lock entry has no hashes",
            )

    def test_lockfile_matches_requirements_pins(self):
        requirements = (ROOT / "requirements.txt").read_text(encoding="utf-8")
        lock = (ROOT / "requirements.lock.txt").read_text(encoding="utf-8")

        pins = dict(
            re.findall(r"^([\w-]+)==([\w.]+)(?:\s*;[^#\n]*)?$", requirements, re.M)
        )
        for name, version in pins.items():
            match = re.search(rf"(?mi)^{re.escape(name)}==([\w.]+)\b", lock)
            self.assertIsNotNone(match, f"{name} missing from lockfile")
            self.assertEqual(match.group(1), version, f"{name} lockfile is stale")


if __name__ == "__main__":
    unittest.main()
