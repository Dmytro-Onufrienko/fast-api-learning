"""PLATFORM CODE — do not edit.

Reads every content/**/manifest.json. This mirrors what the web app does
with `import.meta.glob` in the browser — the API and the frontend must agree
on the same content without either one hardcoding a lesson list.
"""
import json
from pathlib import Path
from typing import Any

from .config import CONTENT_DIR


def discover_manifests() -> list[dict[str, Any]]:
    manifests: list[dict[str, Any]] = []
    if not CONTENT_DIR.exists():
        return manifests
    for path in sorted(CONTENT_DIR.glob("**/manifest.json")):
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        data["_sourcePath"] = str(path)
        data["_contentDir"] = str(path.parent)
        manifests.append(data)
    return manifests
