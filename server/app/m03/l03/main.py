"""Lesson M3-L03 — Query parameters.

Expose a module-level `router`. Paths are declared without the lesson prefix.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/products")
def list_products():
    # Add the five query parameters described in the lesson and echo them back.
    return {}
