# Lesson m03-l01: your first endpoint.
#
# Implement GET /items/{item_id} with an optional query parameter `q`.
# See the lesson theory panel for the full task description.
from fastapi import APIRouter

router = APIRouter()

# TODO: define a GET /items/{item_id} endpoint.
# - item_id must be typed so FastAPI rejects non-integer ids with 422
# - q is an optional string query parameter, defaulting to None
# - return {"item_id": item_id, "q": q}
