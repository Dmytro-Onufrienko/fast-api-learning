"""Lesson M3-L04 — Path operation metadata. Reference solution."""

from fastapi import APIRouter

router = APIRouter()


@router.post(
    "/articles",
    status_code=201,
    tags=["articles"],
    summary="Create an article",
    operation_id="createArticle",
)
def create_article():
    """Create a new article and return it."""
    return {"id": 1, "title": "Hello"}


@router.get(
    "/articles/{article_id}",
    tags=["articles"],
    summary="Get an article",
    operation_id="getArticle",
)
def get_article(article_id: int):
    """Return a single article by its numeric id."""
    return {"id": article_id, "title": "Hello"}


@router.get(
    "/articles/{article_id}/legacy",
    tags=["articles"],
    summary="Get an article (legacy)",
    operation_id="getArticleLegacy",
    deprecated=True,
)
def get_article_legacy(article_id: int):
    """Kept for old clients. Use GET /articles/{article_id} instead."""
    return {"id": article_id}
