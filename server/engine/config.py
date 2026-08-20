"""PLATFORM CODE — do not edit.

Path configuration shared by the rest of the engine package.
"""
import os
from pathlib import Path

# server/ — the root the learner's `app` package lives under.
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

# In docker-compose, client/content is bind-mounted read-only at /content.
# Outside Docker (e.g. `uv run uvicorn app.main:app` from server/ directly,
# which is how this project is verified without a container runtime), it
# falls back to ../client/content — the course material lives in the client,
# which owns the workspace; server/ is the learner's FastAPI code only.
_default_content_dir = WORKSPACE_ROOT.parent / "client" / "content"
CONTENT_DIR = Path(os.environ.get("CONTENT_DIR", str(_default_content_dir)))
