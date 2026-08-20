"""PLATFORM CODE — do not edit.

Executes a single pytest node id from a lesson's content/<...>/tests/
directory and reports back a structured pass/fail/error result. Runs as a
subprocess (not in-process pytest.main()) so every run re-imports the
learner's current code from disk instead of reusing a stale cached module.
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from .config import WORKSPACE_ROOT
from .lessons import find_lesson

TIMEOUT_SECONDS = 30


def run_pytest_node(lesson_id: str, node_id: str) -> dict:
    lesson = find_lesson(lesson_id)
    if lesson is None:
        raise LookupError(f'No lesson with id "{lesson_id}"')

    full_node_id = str(lesson.content_dir / node_id)

    with tempfile.TemporaryDirectory() as tmp:
        report_path = Path(tmp) / "report.json"
        env = {**os.environ, "PYTHONPATH": str(WORKSPACE_ROOT)}
        try:
            proc = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "pytest",
                    "-q",
                    "--json-report",
                    f"--json-report-file={report_path}",
                    full_node_id,
                ],
                cwd=str(WORKSPACE_ROOT),
                env=env,
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            return {
                "outcome": "error",
                "durationMs": TIMEOUT_SECONDS * 1000,
                "longrepr": f"pytest timed out after {TIMEOUT_SECONDS}s (possible infinite loop or blocking call).",
                "nodeId": node_id,
            }

        if not report_path.exists():
            combined = (proc.stdout + "\n" + proc.stderr).strip()
            return {
                "outcome": "error",
                "durationMs": 0,
                "longrepr": combined or "pytest produced no report.",
                "nodeId": node_id,
            }
        report = json.loads(report_path.read_text(encoding="utf-8"))

    tests = report.get("tests", [])
    if not tests:
        combined = (proc.stdout + "\n" + proc.stderr).strip()
        return {
            "outcome": "error",
            "durationMs": (report.get("duration") or 0) * 1000,
            "longrepr": combined or f'No test was collected for node id "{node_id}".',
            "nodeId": node_id,
        }

    test = tests[0]
    outcome = test.get("outcome", "error")
    longrepr = None
    if outcome != "passed":
        phase = test.get("call") or test.get("setup") or test.get("teardown") or {}
        longrepr = phase.get("longrepr")

    return {
        "outcome": outcome,
        "durationMs": (test.get("duration") or 0) * 1000,
        "longrepr": longrepr,
        "nodeId": node_id,
    }
