"""PLATFORM CODE — do not edit.

This is the only file in app/ that is not lesson content. It has no routes
of its own: it discovers every lesson from content/**/manifest.json, mounts
each lesson's router at its manifest-declared baseUrl, and exposes the
dev-only /__runner/* endpoints the web app uses to bootstrap lessons and run
pytest checks.

Lesson code lives at app/<module>/<lesson>/main.py, one directory per lesson,
created on demand by POST /__runner/bootstrap. See content/README.md.

Deliberately absent: CORSMiddleware. The web app talks to this API through
Vite's /api proxy (same-origin from the browser's point of view), and CORS
gets its own dedicated lesson later in the course — adding it here would
spoil that lesson.
"""
from fastapi import FastAPI

from engine.mount import mount_all_lessons
from engine.routes import router as runner_router

app = FastAPI(title="learn-fastapi server API")

app.include_router(runner_router)
mount_all_lessons(app)
