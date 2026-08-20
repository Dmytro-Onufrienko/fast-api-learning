"""PLATFORM CODE — do not edit.

Mounts every discovered lesson's router at its manifest-declared baseUrl.
A lesson that hasn't been bootstrapped yet (no app/<workdir>/main.py on disk)
is skipped with a warning rather than crashing the whole API — it becomes
available automatically once POST /__runner/bootstrap creates the file and
uvicorn's --reload picks up the new module.
"""
import importlib
import logging

from fastapi import FastAPI

from .lessons import discover_lessons

logger = logging.getLogger("engine.mount")


def mount_all_lessons(app: FastAPI) -> None:
    for lesson in discover_lessons():
        lesson_id = lesson.manifest["id"]
        try:
            module = importlib.import_module(lesson.module_name)
        except ModuleNotFoundError:
            logger.warning(
                'Lesson "%s" not started yet (%s not found on disk). '
                "It will be mounted automatically once bootstrapped.",
                lesson_id,
                lesson.module_name,
            )
            continue

        router = getattr(module, "router", None)
        if router is None:
            logger.error(
                'Lesson "%s" (%s) has no `router` attribute — skipping mount.',
                lesson_id,
                lesson.module_name,
            )
            continue

        app.include_router(router, prefix=lesson.mount_prefix, tags=[lesson.manifest["module"]["id"]])
        logger.info('Mounted lesson "%s" at %s', lesson_id, lesson.mount_prefix)
