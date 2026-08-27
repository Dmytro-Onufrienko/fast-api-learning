"""Lesson M3-L02 — Path parameters.

This module must expose a module-level `router`. The exercise app mounts it
under the lesson prefix, so declare paths as if the prefix did not exist.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/users/{user_id}")
def read_user(user_id: int):
    return {"user_id": user_id}


# 1. Add GET /users/me returning {"user_id": "me"}.
#    Mind the declaration order.
#
# 2. Add GET /reports/{period} accepting only day, week or month.
#    Name the enum class `Period`.
#
# 3. Add GET /files/{file_path:path} returning {"path": "<rest of the url>"}.
