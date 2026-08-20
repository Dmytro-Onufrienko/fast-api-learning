"""PLATFORM CODE — do not edit.

Dev-only runner endpoints the web app's "Run tests" button and lesson
bootstrapping talk to. Never expose this router outside a local dev
environment — it executes arbitrary lesson pytest nodes and writes files
inside the workspace.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .bootstrap import bootstrap_lesson
from .lessons import discover_lessons
from .pytest_runner import run_pytest_node

router = APIRouter(prefix="/__runner", tags=["runner"])


class BootstrapRequest(BaseModel):
    lessonId: str


class PytestRequest(BaseModel):
    lessonId: str
    nodeId: str


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "lessons": len(discover_lessons())}


@router.post("/bootstrap")
def bootstrap(req: BootstrapRequest) -> dict:
    try:
        return bootstrap_lesson(req.lessonId)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/pytest")
def pytest_endpoint(req: PytestRequest) -> dict:
    try:
        return run_pytest_node(req.lessonId, req.nodeId)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
