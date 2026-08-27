"""Lesson M3-L03 — Query parameters. Reference solution."""

from typing import Annotated

from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/products")
def list_products(
    q: Annotated[str | None, Query(min_length=2)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, alias="pageSize")] = 20,
    tags: Annotated[list[str] | None, Query()] = None,
    in_stock: bool = False,
):
    return {
        "q": q,
        "page": page,
        "page_size": page_size,
        "tags": tags,
        "in_stock": in_stock,
    }
