# learn-fastapi

A FastAPI course for developers who already write JavaScript or TypeScript —
NestJS, Express, or both. Every idea is introduced as a diff against what you
already do in Node, so you are learning what is *different*, not what an HTTP
route is. You write real Python in your own editor; the browser is the
textbook and the test runner.

## Contents

- [Quick start](#quick-start)
- [Lessons](#lessons)
- [Working through a lesson](#working-through-a-lesson)
- [Committing your work](#committing-your-work)
- [Writing lessons](#writing-lessons)
- [Working on the platform](#working-on-the-platform)

## Quick start

You need Docker and nothing else.

```bash
git clone git@github.com:Dmytro-Onufrienko/fast-api-learning.git
cd fast-api-learning/client
docker compose up
```

Then open <http://localhost:5173>. First boot installs dependencies inside
the container, so give it a minute.

`main` always holds the whole course as it currently stands — clone it to look
around. When you actually want to *do* a lesson, start from that lesson's
branch with the command listed under it below.

## Lessons

Each lesson has its own branch. A lesson branch contains that lesson **and
every lesson before it**, so `lesson-04` is the course up to and including
lesson 4 — you never lose earlier material by moving forward.

The command under each lesson creates your own branch from it, named after
your git config, and switches on the repo's commit guard. Copy it as is.

---

### Lesson 01 — Your first endpoint

Your first route, and the idea the rest of the course is built on: FastAPI
reads your function's **signature** instead of reflecting over decorators the
way Nest does. Parameter names, type annotations and defaults *are* the
contract — `item_id: int` is simultaneously the path parameter, the parser,
the validator that returns 422, and the OpenAPI schema entry. Path parameters,
optional query parameters, and no DTO class in sight.

Module: FastAPI basics · about 20 minutes ·
branch: [`lesson-01`](https://github.com/Dmytro-Onufrienko/fast-api-learning/tree/lesson-01)

```bash
git fetch origin && git checkout -b lesson-01-$(git config user.name | tr '[:upper:] ' '[:lower:]-') origin/lesson-01 && git config core.hooksPath .githooks
```

---

### Lesson 02 — Path parameters

In Nest a path parameter arrives as a string and stays one until you pipe it
somewhere — `ParseIntPipe` exists because the `number` you sometimes write
there is a lie the compiler cannot catch. FastAPI deletes that layer: the
annotation *is* the parser, the validator and the schema entry. Route ordering
(`/users/me` before `/users/{user_id}`), `StrEnum` for a closed set of values,
and the `:path` converter for parameters that contain slashes.

Module: FastAPI basics · about 25 minutes ·
branch: [`lesson-02`](https://github.com/Dmytro-Onufrienko/fast-api-learning/tree/lesson-02)

```bash
git fetch origin && git checkout -b lesson-02-$(git config user.name | tr '[:upper:] ' '[:lower:]-') origin/lesson-02 && git config core.hooksPath .githooks
```

---

## Working through a lesson

```
cd client && docker compose up
  ├─ client :5173   the textbook: theory, the task, and the check panel
  └─ server :8000   your FastAPI code, reloaded on every save
```

1. Open the lesson in the browser. Its starter file is copied into
   `server/app/<module>/<lesson>/main.py` the first time you open it — your
   existing work is never overwritten.
2. Edit that file in your own editor. uvicorn reloads in under a second.
3. Hit **Run tests**. Checks run in order and show you the request, the
   response, and what was expected where they differ.

Checks come at three levels: `http` for behaviour, `openapi` for intent your
response body cannot show (did you actually declare `response_model`?), and
`pytest` for anything that needs to import your module.

Nothing here uses CORS, deliberately: the browser talks to `/api/*`, Vite
proxies it to the server, so every request is same-origin. CORS gets its own
lesson later.

## Committing your work

Course branches (`main`, `lesson-01`, `lesson-02`, …) are read-only starting
points. Your work lives on the branch the lesson command created for you —
`lesson-01-yourname` — and a `pre-commit` hook refuses commits on any branch
that is not yours, so you cannot scribble on a course branch by accident.

Your Python under `server/app/` is yours to commit; it is not ignored. Commit
as you go rather than in one lump at the end — a history that shows the work
is worth more than a perfect final diff.

## Writing lessons

Lessons are data, not code: a directory under `client/content/` with a
`manifest.json`, theory in MDX, a starter file and a reference solution.
Adding one never means touching the client, the server, or the check engine.

See [`client/content/README.md`](client/content/README.md) — it is the full
contract, and it is the only document you need to add a lesson.

## Working on the platform

`client/` is the web app and the pnpm workspace root; it owns the course
content, the check engine, the validator and the compose files. `server/` is
the FastAPI workspace, driven by `make` — run `make help` in it.

```bash
cd client
pnpm install
pnpm test      # unit tests for the check engine
pnpm validate  # runs every lesson's checks against its reference solution
```

`pnpm validate` is what keeps the course from rotting: it brings the server up
against every lesson's reference solution and fails if any check breaks. CI
runs it on every push and weekly.

Architecture, invariants and known gaps live in
[`.github/ENGINEERING.md`](.github/ENGINEERING.md).
