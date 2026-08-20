# Engineering notes

How this repository is put together, what must not be broken, and what is
still unproven. The learner-facing entry point is the root `README.md`; this
document is for whoever works on the platform itself. Everything below is
either verified fact or an explicitly flagged gap — nothing here is
aspirational.

It lives under `.github/` so the repository root stays at exactly two
directories, `client/` and `server/`.

## What this is

A learning platform for JS/TS developers (NestJS / Express background)
moving to Python + FastAPI. **It is the engine, not the course.** The owner
writes lessons; the platform reads them. Adding a lesson must never require
writing code — if it does, that is an engine bug, not a lesson quirk.

Exactly one lesson exists (`m03-l01-first-endpoint`) and it exists only as
an executable reference for the format. Do not invent additional lessons.
Do not fill modules with placeholder text.

All project output is English: lesson content, UI labels, error messages,
code comments, commit messages, docs. No mixed-language strings.

## Layout

The repository root holds exactly two directories. `client/` is the pnpm
workspace root and owns everything except the learner's Python: the web app,
the course content, the check engine, the validator and both compose files.
`server/` is the FastAPI workspace the learner edits.

```
fast-api-learning/
├─ client/                       # Vite + React 18 + TS strict, AND the workspace root
│  ├─ docker-compose.yml         # services: client, server (+ commented postgres)
│  ├─ docker-compose.validate.yml# service: server-validate, used by pnpm validate
│  ├─ package.json               # the app package and the workspace manifest in one
│  ├─ src/                       # textbook + test runner
│  ├─ content/                   # the course material, lessons as data
│  │  └─ README.md               # THE CONTRACT for lesson authoring. Read it first.
│  ├─ packages/check-engine/     # manifest schema + the three check runners
│  └─ tools/validate/            # pnpm validate CLI
├─ .github/
│  ├─ ENGINEERING.md             # this file
│  └─ workflows/validate.yml     # CI
├─ .githooks/pre-commit          # refuses commits on a course branch
└─ server/                       # FastAPI + uv, Python 3.12
   ├─ Makefile                   # every server-side task; `make help` lists them
   ├─ engine/                    # PLATFORM CODE — lesson discovery, mounting, runners
   ├─ app/main.py                # PLATFORM CODE — no routes of its own
   └─ app/<module>/<lesson>/     # LEARNER CODE — created on demand, not in git
```

Every pnpm command runs from `client/`, including `docker compose up`.

`client/content/README.md` is the authoritative spec for the manifest format,
the three check levels, capture/random placeholders, and the MDX components.
Read it before touching anything in `client/packages/check-engine`.

## How the loop works

```
cd client && docker compose up
  ├─ client :5173   Vite. Reads content/ via import.meta.glob, renders theory,
  │                 orchestrates checks. No embedded editor, no Python in browser.
  └─ server :8000   uvicorn --reload over server/

learner opens a lesson  → client POSTs /__runner/bootstrap
                        → starter files copied into server/app/<workdir>/
learner edits that file in their own editor
                        → uvicorn reloads (~0.8s measured)
learner hits "Run tests"
                        → client runs the manifest's checks through the Vite proxy
```

The browser only ever calls `/api/*`, `/__runner/*`, `/openapi.json`, all
proxied by Vite to the `server` container. Same-origin by construction.

## Invariants — do not break these

1. **No `CORSMiddleware` anywhere.** Not in the platform, not in any learner
   template. CORS is same-origin-by-proxy on purpose, because CORS gets its
   own deliberate lesson later in the course. Adding it spoils that lesson.
2. **Lessons are data.** Discovery is `client/content/**/manifest.json` via
   `import.meta.glob` (client) and a filesystem glob (server + validator).
   No hardcoded lesson lists anywhere.
3. **One check engine.** `client/packages/check-engine` is shared by the app and
   the CLI validator so both execute checks through the identical code path.
   Only URL resolution differs (`RunnerConfig`). Do not fork the logic.
4. **`bodyMatches` is a recursive PARTIAL match by default.** Extra fields in
   a learner's response are not failures unless `exact: true`. This is
   deliberate — otherwise learners fight a stray `created_at` instead of
   learning FastAPI. Turn on `exact` only for `response_model` / output
   filtering lessons.
5. **Checks in a lesson run sequentially as one scenario**, sharing captured
   values. They are not isolated and must not be parallelised.
6. **`server/app/<module>/<lesson>/` is learner workspace.** It is
   deliberately *not* gitignored: learners commit their own work there, on
   their own branch. What must never happen is a solved `main.py` reaching a
   course branch (`main`, `lesson-NN`) — that spoils the lesson for everyone.
   A solved file leaked into a commit once already. The `pre-commit` hook in
   `.githooks/` is the guardrail: it refuses commits on any branch that does
   not carry the committer's own name.
7. **Manifests are Zod-validated on load and fail loudly.** A malformed
   manifest must stop the app, not silently hide a lesson.

## Non-obvious implementation details

- **`{{lessonPath}}` in openapi pointers.** A lesson's routes appear in
  `/openapi.json` under their mounted path (`/m03/l01/items/{item_id}`).
  Pointers write `{{lessonPath}}` instead of hardcoding the prefix; it
  expands to the escaped mount path. Failing checks report the *expanded*
  pointer. Implemented in
  `client/packages/check-engine/src/checks/openapi.ts`.
- **MDX components are passed explicitly**, not via `MDXProvider`.
  `lesson.mdx` lives under `content/`, outside `client/node_modules`, so a
  `providerImportSource` would not resolve from there. See
  `<Theory components={mdxComponents} />` in `client/src/pages/LessonPage.tsx`.
  `content/` now sits inside the Vite project root, so the glob is
  `../../content/**` and no `server.fs.allow` widening is needed for it.
- **Shiki is imported fine-grained** (`shiki/core` + explicit langs) rather
  than the full bundle, which shipped ~4 MB of grammar chunks.
- **`.lesson-prose` element rules use `:where()`** so components rendered
  inside theory can override them with plain utility classes.
- **The pytest runner is a subprocess**, not in-process `pytest.main()`, so
  every run re-imports the learner's current code instead of a cached module.
- **`docker-compose.validate.yml` declares its own compose project name.**
  Without it, it shares the directory-derived project name with
  `docker-compose.yml`, and the validator's teardown
  (`down -v --remove-orphans`) deletes a running dev client/server as
  orphans of that project. `pnpm validate` must be safe to run while
  `docker compose up` is live.
- **`WATCHFILES_FORCE_POLLING=true`** on the server service and
  `usePolling` in Vite: bind-mount FS events do not propagate reliably on
  macOS/Windows.

## Course branches

`main` carries the whole course as it currently stands, so a visitor can read
everything without checking anything out. Each lesson also has a branch,
`lesson-NN`, holding the course **up to and including** that lesson — a
snapshot of main's history, not an isolated slice, so the engine and every
earlier lesson travel with it.

A learner never works on a course branch. The README's per-lesson command
creates `lesson-NN-<their-name>` from `origin/lesson-NN` and points
`core.hooksPath` at `.githooks/`, after which the `pre-commit` hook refuses
any commit on a branch that does not contain the name from their
`git config user.name`. It is a guardrail, not a lock: `--no-verify` skips it,
and it does nothing until that config is set. The real protection for course
branches is that nobody but the owner has push access; a GitHub ruleset over
`lesson-*` and `main` (free on public repos) blocks force-pushes and deletions
on top of that.

The README's lesson list is hand-written — the blurbs read like chapter
introductions and a generator would not write them. `pnpm check-readme` is the
counterweight: it fails when a lesson in `content/` has no README section or
branch command, and when the README describes a lesson that no longer exists.
It runs in CI.

## Verified

Run in a Linux container with Node 22 / pnpm 10.28 / uv 0.8 / Python 3.12:

- `pnpm typecheck` — clean (client, check-engine, validate)
- `pnpm build` — clean; confirmed the built bundle actually contains the
  compiled lesson MDX (the build exit code alone would not catch an
  `import.meta.glob` that silently matches nothing)
- `pnpm validate --runtime local` — 1/1 lessons, 3/3 checks, exit 0
- Full loop end to end: bootstrap → 3 failing checks → write implementation
  → uvicorn reload measured at 782ms → 3 passing checks
- Browser (headless Chromium): lesson page renders, `<Predict>` and
  `<Hint>` interactions work, "Run tests" reports 3/3 passing, failure state
  shows expected/received diffs and raw request/response panels
- All three check levels, including `pytest` with `capture` /
  `{{captured.x}}` / `{{random.email}}` and a deliberately failing test
  whose traceback reaches both the UI and the CLI — exercised via a
  throwaway lesson that was then deleted

Added in the following session, on macOS 15 / Docker Desktop 29.1.2 /
Node 24.12 / pnpm 10.28:

- `docker compose up` — both services healthy; client on :5173, server on
  :8000, Vite proxy reaching the server container for `/api/*`,
  `/__runner/*` and `/openapi.json`
- Full loop through the containers: `POST /__runner/bootstrap` →
  starter file in `server/app/m03/l01/` → lesson route 404s → dropped the
  reference solution in → uvicorn reload + first 200 measured at 704ms →
  `/items/5?q=hello` returns `{"item_id":5,"q":"hello"}`, `/items/abc`
  returns 422, and the openapi pointer resolves to `"integer"`
- `import.meta.glob` across the bind mount: Vite resolves the lesson's
  manifest.json and compiles lesson.mdx inside the container
- `pnpm validate --runtime docker` — 1/1 lessons, 3/3 checks, exit 0; also
  re-confirmed `--runtime local`, and that both stay green with a live
  `docker compose up`
- `pnpm test` — 57 unit tests over `deepMatch`, `resolveJsonPointer`,
  `substituteDeep`, `expandPointer` (vitest, in `client/packages/check-engine`)
- `pnpm install --frozen-lockfile` — clean, so CI's install step holds
- `pnpm typecheck` and `pnpm build` still clean; the built bundle still
  contains the compiled lesson MDX

### After the move to a two-directory root

`content/`, `packages/` and `tools/`, both compose files and the pnpm
workspace manifest moved into `client/`, which is now the workspace root and
the app package in one (`client/package.json`). Re-verified end to end from
`client/`:

- `pnpm install` → `pnpm typecheck` → `pnpm test` (57/57) → `pnpm build`,
  all clean; the built bundle still contains the compiled lesson MDX
- `docker compose up --build` — project `learn-fastapi`, both services
  healthy; proxy serves `/`, `/openapi.json` and `/__runner/health`; the
  content glob now resolves as plain `/content/...` URLs (no `/@fs/`
  escape hatch) and lesson.mdx still compiles inside the container
- Full learner loop again: bootstrap → 404 on the starter → reference
  solution in → **reload + 200 at 680ms** → 422 and the openapi pointer
  both correct → starter restored
- `pnpm validate` — exit 0 in both `--runtime docker` and `--runtime local`,
  and still safe to run with `docker compose up` live
- `server/engine/config.py`'s non-Docker fallback resolves to
  `../client/content`; `discover_lessons()` finds the lesson with no
  `CONTENT_DIR` set

Every `server/Makefile` target was run once, on this machine:

- `install`, `check`, `clean`, `distclean` (venv removed, then restored by
  `check`), `repl` (imported the app: 6 routes)
- `test` in three states — no tests collected (exit 0, with an explanatory
  line), a passing test (exit 0), a failing test (non-zero) — driven with
  `make test CONTENT_DIR=<scratch dir>`; `test-file` with and without `NODE`
- `run PORT=8010` — `/openapi.json` 200 and `/__runner/health` reported
  `{"status":"ok","lessons":1}` on the host
- `validate` and `validate RUNTIME=docker` — 3/3 checks both ways
- `build` (image built, 438MB), `up`, `down`, `restart`, `logs`, `ps`
- `lint` — exits non-zero on ruff's 2 findings, which is the honest result;
  `sh` is interactive and was not driven non-interactively

### Audit of stray files and containerised state

- **The container was writing its pnpm store into the repository.** Inside
  the client container `$HOME` is on the overlay fs while `/repo` is a bind
  mount, so pnpm placed its content-addressable store at `/repo/.pnpm-store`
  — ~130 MB landing in the working tree on every boot (it is gitignored, so
  it was invisible in `git status`). The service now sets
  `npm_config_store_dir=/repo/node_modules/.pnpm-store`, which is inside the
  named volume: off the bind mount, and on the same volume as node_modules
  so hardlinking still works. Verified: `pnpm store path` in the container
  reports the volume path and no `.pnpm-store` reappears on the host.
  `CI=true` was added alongside it, because without a TTY pnpm refuses to
  recreate a stale node_modules and the service dies with
  `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`.
- **The venv-as-named-volume was structurally broken.** Both compose files
  bind-mount a host directory onto `/workspace`, which masks the venv the
  image builds at `/workspace/.venv`; a named volume mounted at that path
  cannot be seeded from the image either, so uv found an empty directory,
  tried to recreate it, and died with `failed to remove directory
  /workspace/.venv: Resource busy`. This took `pnpm validate --runtime
  docker` down completely. The Dockerfile now builds the venv at `/venv`,
  outside every mount, and both `server_venv` and `validate_venv` volumes
  are gone. Verified: validate green in both runtimes, dev stack rebuilt and
  the full learner loop re-measured at 784ms.
- **`server/app/*/` is now gitignored.** `engine/bootstrap.py`'s
  `_ensure_init_chain` creates the whole `app/<module>/<lesson>/` tree
  including its empty `__init__.py` files, so all of it is generated. Before
  this, `git add .` would have staged 82 files, three of them the learner's
  workspace; it now stages 79, and `server/app/__init__.py` plus
  `server/app/main.py` (platform code) are the only things left under
  `app/`. This closes the leak described in invariant 6.
- **No dead code found.** Every module in `server/engine/` is imported;
  every file in `client/src/` is reachable from `main.tsx`.
- **`server/Makefile` added** as the entry point for Python-side work
  (install/run/test/validate/build/up/down/restart/logs/ps/sh/repl/openapi/
  clean/distclean/check, plus opt-in lint/fmt). It wraps the existing
  commands and changes no behaviour. Two details worth knowing: `make test`
  treats pytest's exit code 5 as "content ships no pytest-level check yet"
  rather than a failure, while a real failure still exits non-zero; and the
  container targets delegate to `../client`, since that is where both
  compose files live. Every target was executed once — see Verified.

## Not verified / known gaps

1. **CI has never run.** `.github/workflows/validate.yml` now runs
   `pnpm test` and, after the move, every step from `client/`
   (`defaults.run.working-directory`, `cache-dependency-path`, and
   `package_json_file` on pnpm/action-setup, since the repository root no
   longer has a package.json). `pnpm install --frozen-lockfile` was verified
   locally, but no workflow run exists yet — this is the least-proven part
   of the repo.
2. **The `pre-commit` hook is unproven against a real commit.** Its logic was
   exercised on `main`, on `lesson-02` and on `lesson-02-<name>` by pointing
   HEAD at each in turn, and it allowed only the last. But the repository has
   no commits yet, so it has never actually blocked or passed a `git commit`.
3. **`zod` is a direct dependency of `client` and `tools/validate` but
   neither imports it.** Only `packages/check-engine` uses it, and it
   declares its own. Two redundant entries, harmless but untrue.
4. **Stale docker state from earlier layouts** is still on the machine:
   ten `fast-api-learning_*` volumes (~400 MB) and three
   `fast-api-learning-*` images (~1.2 GB), plus a dead 126 MB
   `.pnpm-store/` at the repository root from before the store fix. All
   safe to remove; none of it is referenced any more.
5. **A host-side `.uv-venv` does not survive the repo moving.** The
   validator's `--runtime local` venv holds absolute paths; after the move
   it failed with `Failed to spawn: uvicorn` until the directory was
   deleted and re-synced. It is gitignored, so this only bites locally.
6. **No linter.** `pnpm lint` is a stub that echoes a message.
7. **No `pytest`-level check in the shipped lesson.** The level works, but
   nothing in `content/` exercises it, so a regression there would not be
   caught by `pnpm validate`.
8. **Bundle size warning** — the Shiki Oniguruma wasm is a 622 kB lazy
   chunk. Acceptable for a dev tool; `shiki/engine/javascript` would remove
   it if it highlights Python/TS correctly.
9. **Accessibility not audited.** Focus rings and `aria` attributes exist;
   no screen-reader or contrast pass was done.
10. **Mobile has no lesson navigation** other than the header link and
   prev/next at the page bottom (the sidebar is `hidden lg:block`).

## Before you start

Everything runs from `client/` — that is the pnpm workspace root and where
both compose files live.

```bash
cd client
pnpm install
docker compose up   # → http://localhost:5173
pnpm test           # unit tests for the check engine
```

If `docker compose up` reports a port as already allocated, containers from
an older layout are still running — clear them with
`docker compose up --remove-orphans`, or `docker ps` and remove them by hand
(the compose project is now named `learn-fastapi`, and the validator's is
`learn-fastapi-validate`).

The repo has no commits yet on this working tree; `origin` is already
configured. `pnpm validate` must stay green — it is the thing that stops
content from rotting when FastAPI or Pydantic ships a breaking change.
