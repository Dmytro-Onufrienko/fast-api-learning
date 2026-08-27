"""Lesson M3-L04 — Path operation metadata.

Expose a module-level `router`. Paths are declared without the lesson prefix.
"""

from fastapi import APIRouter

router = APIRouter()


@router.post("/articles")
def create_article():
    return {"id": 1, "title": "Hello"}


# Add the metadata described in the lesson to the operation above,
# then add GET /articles/{article_id} and GET /articles/{article_id}/legacy.
