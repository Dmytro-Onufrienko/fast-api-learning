# Reference solution for m03-l01-first-endpoint.
# Used by `pnpm validate` — never shown to the learner.
from fastapi import APIRouter

router = APIRouter()


@router.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None) -> dict:
    return {"item_id": item_id, "q": q}
