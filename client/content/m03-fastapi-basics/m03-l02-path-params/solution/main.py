"""Lesson M3-L02 — Path parameters. Reference solution."""

from enum import StrEnum

from fastapi import APIRouter

router = APIRouter()


class Period(StrEnum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


# Declared before /users/{user_id}, otherwise "me" would be parsed as an int.
@router.get("/users/me")
def read_current_user():
    return {"user_id": "me"}


@router.get("/users/{user_id}")
def read_user(user_id: int):
    return {"user_id": user_id}


@router.get("/reports/{period}")
def read_report(period: Period):
    return {"period": period}


@router.get("/files/{file_path:path}")
def read_file(file_path: str):
    return {"path": file_path}
