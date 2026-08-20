"""PLATFORM CODE — do not edit.

Materializes a lesson's starterFiles into the learner's workspace the first
time they open it. Never overwrites a file that already exists — this is the
one place the engine touches the learner's own code, and it must be safe to
call repeatedly (the web app calls it every time a lesson page mounts).
"""
import shutil
from pathlib import Path

from .config import WORKSPACE_ROOT
from .lessons import find_lesson


def _ensure_init_chain(directory: Path) -> None:
    """Touches __init__.py at every level from app/ down to `directory`,
    so the dotted module path the engine imports is a valid Python package."""
    app_root = WORKSPACE_ROOT / "app"
    (app_root / "__init__.py").touch(exist_ok=True)
    current = app_root
    for part in directory.relative_to(app_root).parts:
        current = current / part
        current.mkdir(parents=True, exist_ok=True)
        (current / "__init__.py").touch(exist_ok=True)


def bootstrap_lesson(lesson_id: str) -> dict:
    lesson = find_lesson(lesson_id)
    if lesson is None:
        raise LookupError(f'No lesson with id "{lesson_id}"')

    lesson.workdir.mkdir(parents=True, exist_ok=True)
    _ensure_init_chain(lesson.workdir)

    starter_dir = lesson.content_dir / "starter"
    created: list[str] = []
    skipped: list[str] = []

    for filename in lesson.manifest["starterFiles"]:
        dest = lesson.workdir / filename
        if dest.exists():
            skipped.append(str(dest.relative_to(WORKSPACE_ROOT)))
            continue

        source = starter_dir / filename
        if not source.exists():
            raise FileNotFoundError(
                f'Starter file missing for lesson "{lesson_id}": {source}'
            )

        dest.parent.mkdir(parents=True, exist_ok=True)
        _ensure_init_chain(dest.parent)
        shutil.copyfile(source, dest)
        created.append(str(dest.relative_to(WORKSPACE_ROOT)))

    return {"created": created, "skipped": skipped}
