"""PLATFORM CODE — do not edit.

Turns raw manifest dicts into the concrete info needed to mount a lesson's
router and locate its files: the dotted module path under app/, the FastAPI
mount prefix, and the on-disk directories involved.
"""
from dataclasses import dataclass
from pathlib import Path

from .config import WORKSPACE_ROOT
from .discovery import discover_manifests


@dataclass(frozen=True)
class LessonInfo:
    manifest: dict
    module_name: str
    mount_prefix: str
    workdir: Path
    content_dir: Path


def _module_name_for(workdir: str) -> str:
    parts = [p for p in workdir.split("/") if p]
    return ".".join([*parts, "main"])


def _mount_prefix_for(base_url: str) -> str:
    if not base_url.startswith("/api"):
        raise ValueError(f'manifest baseUrl "{base_url}" must start with "/api"')
    prefix = base_url[len("/api") :]
    return prefix or "/"


def discover_lessons() -> list[LessonInfo]:
    lessons = []
    for manifest in discover_manifests():
        lessons.append(
            LessonInfo(
                manifest=manifest,
                module_name=_module_name_for(manifest["workdir"]),
                mount_prefix=_mount_prefix_for(manifest["baseUrl"]),
                workdir=WORKSPACE_ROOT / manifest["workdir"],
                content_dir=Path(manifest["_contentDir"]),
            )
        )
    return lessons


def find_lesson(lesson_id: str) -> LessonInfo | None:
    for lesson in discover_lessons():
        if lesson.manifest["id"] == lesson_id:
            return lesson
    return None
