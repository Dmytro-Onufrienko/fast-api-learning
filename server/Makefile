# Every server-side task goes through this file. Nothing here is required by
# the platform itself — the engine, the web app and `pnpm validate` work
# exactly as before — but if you are working on the Python side, these are the
# commands, so you never have to remember uv/uvicorn/pytest/docker flags.
#
# The web app and the compose files live in ../client (that is the pnpm
# workspace root); the container targets below just delegate there.

UV        ?= uv
PY        ?= $(UV) run
HOST      ?= 127.0.0.1
PORT      ?= 8000
CLIENT_DIR = ../client
CONTENT_DIR = $(CLIENT_DIR)/content
IMAGE     ?= learn-fastapi-server
# `make validate RUNTIME=docker` runs the reference API in a container instead.
RUNTIME   ?= local

# `make` with no target prints the list below rather than doing something.
.DEFAULT_GOAL := help

.PHONY: help install run test test-file validate build up down restart logs ps sh repl openapi lint fmt clean distclean check

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Sync the virtualenv from pyproject.toml (dev group included)
	$(UV) sync --group dev

run: ## Run the API on the host with reload (http://$(HOST):$(PORT))
	$(PY) uvicorn app.main:app --host $(HOST) --port $(PORT) --reload

# pytest exits 5 when it collects nothing. No lesson ships a pytest-level
# check yet, so that is the expected state today, not a failure — but a real
# failure (exit 1) must still stop the build.
test: ## Run every lesson's pytest tests from content/
	@PYTHONPATH=$(CURDIR) $(PY) python -m pytest -q $(CONTENT_DIR) $(ARGS); \
	status=$$?; \
	if [ $$status -eq 5 ]; then \
		echo "no pytest-level checks in content/ yet — nothing to run"; \
		exit 0; \
	fi; \
	exit $$status

test-file: ## Run one pytest node id, e.g. make test-file NODE=../client/content/.../tests/test_x.py::test_y
	@test -n "$(NODE)" || { echo "usage: make test-file NODE=<pytest node id>"; exit 2; }
	PYTHONPATH=$(CURDIR) $(PY) python -m pytest -q "$(NODE)"

validate: ## Run every lesson's checks against its reference solution (RUNTIME=local|docker)
	cd $(CLIENT_DIR) && pnpm validate --runtime $(RUNTIME)

build: ## Build the server docker image
	docker build -t $(IMAGE) .

up: ## Start the full stack (client + server) from ../client
	cd $(CLIENT_DIR) && docker compose up -d

down: ## Stop the stack
	cd $(CLIENT_DIR) && docker compose down

restart: ## Recreate just the server container
	cd $(CLIENT_DIR) && docker compose up -d --force-recreate server

logs: ## Follow the server container's logs
	cd $(CLIENT_DIR) && docker compose logs -f server

ps: ## Show the stack's containers
	cd $(CLIENT_DIR) && docker compose ps

sh: ## Open a shell inside the running server container
	cd $(CLIENT_DIR) && docker compose exec server bash

repl: ## Python REPL with the server on PYTHONPATH
	PYTHONPATH=$(CURDIR) $(PY) python

openapi: ## Print the generated OpenAPI document (useful when writing openapi-level pointers)
	@PYTHONPATH=$(CURDIR) $(PY) python -c "import json; from app.main import app; print(json.dumps(app.openapi(), indent=2))"

# ruff is deliberately not a project dependency: the repo has no agreed lint
# policy yet, and `ruff check`/`ruff format` currently disagree with the
# committed code. These run it ad hoc via uvx so nothing is pinned, and they
# stay out of `make check` until that policy exists.
lint: ## Lint with ruff (ad hoc via uvx, not wired into check)
	uvx ruff check app engine

fmt: ## Format with ruff (ad hoc via uvx — review the diff, it rewrites files)
	uvx ruff format app engine

clean: ## Remove Python caches
	find . -path ./.venv -prune -o -name __pycache__ -type d -print0 | xargs -0 rm -rf
	rm -rf .pytest_cache

distclean: clean ## Remove caches and the virtualenv
	rm -rf .venv

check: install test ## What CI-equivalent work looks like locally: sync, then tests
