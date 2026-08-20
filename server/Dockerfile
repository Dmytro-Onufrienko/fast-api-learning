FROM python:3.12-slim

# uv gives us fast, reproducible installs without pip/poetry.
COPY --from=ghcr.io/astral-sh/uv:0.8.17 /uv /uvx /bin/

WORKDIR /workspace

# The venv lives at /venv, OUTSIDE /workspace, deliberately. Both compose
# files bind-mount a host directory onto /workspace, which masks anything the
# image built underneath it — so a venv at /workspace/.venv is invisible at
# runtime, and mounting a named volume there cannot be seeded from the image
# either (Docker has no image content to copy for a path under a bind mount).
# uv then tries to recreate the venv, fails to remove the mount point, and the
# container dies with "failed to remove directory /workspace/.venv: Resource
# busy". At /venv it is plain image content and always matches the image's
# own Python.
ENV UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/venv \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/workspace

COPY pyproject.toml ./
RUN uv sync --group dev

# The compose bind mount overlays ./server here at runtime; this COPY only
# matters for building the image standalone (e.g. in CI/validate).
COPY . .

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
