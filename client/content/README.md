# Writing content

This is the only document you should need to add a lesson. Nothing under
`client/content/` requires touching `client/src`, `server/engine`, or
`client/tools/validate` — the platform discovers lessons by globbing
`content/**/manifest.json` from the client workspace root. If you find yourself wanting to write React or
Python outside a lesson's own `solution/`/`starter/`/`tests/` directories to
make a lesson work, that's a sign the engine is missing a feature, not that
the lesson is unusual — open an issue instead of routing around it.

## Directory layout

```
client/content/<module-dir>/<lesson-dir>/
├─ manifest.json     # required — metadata + checks
├─ lesson.mdx         # required — theory, shown above the task
├─ starter/           # required — files copied into server/ on first open
│  └─ main.py
├─ solution/           # required — reference implementation, used by `pnpm validate`
│  └─ main.py
└─ tests/              # optional — only if any check has "level": "pytest"
   └─ test_*.py
```

`<module-dir>` and `<lesson-dir>` are just filesystem organization — the
platform doesn't parse them. It groups and orders lessons purely from the
`module`/`order` fields inside each `manifest.json`. That said, keep the
directory name equal to the manifest's `id` (e.g.
`m03-l01-first-endpoint/`) so the two are trivially cross-referenceable.

`starter/` and `solution/` mirror each other file-for-file: every file
listed in `starterFiles` must exist in both. `starter/` is what a learner
sees when they open the lesson (usually incomplete, with `# TODO` markers).
`solution/` is the reference implementation `pnpm validate` runs against
every check — it is never shipped to the learner.

## manifest.json

```jsonc
{
  // Globally unique. Convention: <module>-l<lesson-number>-<slug>.
  "id": "m03-l02-path-params",

  // Every lesson in the same module must repeat this object identically —
  // it's how the platform groups lessons into modules and orders modules
  // on the module-list page.
  "module": { "id": "m03", "title": "FastAPI basics", "order": 3 },

  // Order of this lesson within its module.
  "order": 2,

  "title": "Path and query parameters",
  "estimateMin": 25,

  // Where the learner's code lives, relative to server/. The platform
  // imports this as a Python module (app.m03.l02.main) and expects it to
  // define `router = APIRouter()`.
  "workdir": "app/m03/l02",

  // Router mount prefix as seen through the web app's /api proxy. Must
  // start with "/api". The engine strips that prefix when mounting the
  // router inside the server container (so "/api/m03/l02" mounts at
  // "/m03/l02" on the actual FastAPI app).
  "baseUrl": "/api/m03/l02",

  // Filenames (relative to the lesson dir) copied from starter/ into
  // server/<workdir>/ the first time the learner opens this lesson.
  // Existing files are never overwritten.
  "starterFiles": ["main.py"],

  "checks": [ /* see below */ ]
}
```

Every manifest is validated against a Zod schema (`@learn-fastapi/check-engine`,
`client/packages/check-engine/src/schema.ts`) both when the web app loads content and when `pnpm validate`
runs. A malformed manifest fails loudly with a field-level error instead of
silently breaking a lesson page.

## Checks

`checks` is an ordered list, run **sequentially as a single scenario** for a
given lesson (see "State across runs" below). Every check has a `level`.

### `http` — endpoint behaviour

```jsonc
{
  "level": "http",
  "name": "Returns the user by id",
  "request": {
    "method": "GET",           // GET | POST | PUT | PATCH | DELETE
    "path": "/users/42",       // relative to the lesson's baseUrl
    "headers": { "x-example": "1" },   // optional
    "body": { "any": "json value" }    // optional, ignored for GET/DELETE
  },
  "expect": {
    "status": 200,                          // optional
    "bodyMatches": { "id": 42 },            // optional, recursive PARTIAL match
    "bodyPredicate": "b => typeof b.name === 'string'", // optional
    "headerContains": { "content-type": "application/json" }, // optional
    "exact": false                          // optional, default false
  },
  "capture": { "userId": "body.id" }        // optional, see below
}
```

- `bodyMatches` only requires the fields you list. Extra fields the
  learner's response happens to include (`created_at`, `updated_at`, ...)
  are not failures. Set `exact: true` when the lesson is specifically about
  `response_model` / output filtering and extra fields *should* fail the
  check.
- `bodyPredicate` is a stringified single-argument arrow function, evaluated
  with `new Function`. Use it for anything partial matching can't express
  (array length, a computed relationship between fields, etc.). This project
  only ever runs locally against content you wrote yourself, so this is
  intentionally unsandboxed — do not repurpose the engine to run untrusted
  content.
- At least one of `status`, `bodyMatches`, `bodyPredicate`, `headerContains`
  should be set, or the check can't fail.

### `openapi` — intent, not just outcome

Black-box requests can't see whether a learner declared `response_model`,
set `status_code=201`, added a `Field(gt=0)` constraint, or annotated a
route with `tags`/`summary`. FastAPI's generated `/openapi.json` can.

```jsonc
{
  "level": "openapi",
  "name": "Schema constrains age to be greater than 0",
  "pointer": "#/components/schemas/UserCreate/properties/age/exclusiveMinimum",
  "expect": { "equals": 0 }
}
```

`pointer` is a standard [JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901)
into the document returned by `GET /openapi.json`. `expect` supports exactly
one of:

- `equals: <value>` — the pointer must resolve and deep-equal this value.
- `exists: true | false` — whether the pointer resolves at all.
- `oneOf: [<value>, ...]` — the pointer must resolve to one of these values.

Two things about pointers into `#/paths/...`:

**Escaping.** A `/` inside a JSON Pointer *segment* is written `~1` (and a
literal `~` is `~0`). So the OpenAPI path `/items/{item_id}` becomes the
single segment `~1items~1{item_id}`.

**`{{lessonPath}}`.** A lesson's routes appear in `/openapi.json` under
their full mounted path — a lesson with `"baseUrl": "/api/m03/l01"` and a
route `/items/{item_id}` shows up as `/m03/l01/items/{item_id}`. Rather than
hardcoding that prefix (and silently breaking the check if the lesson ever
moves), write `{{lessonPath}}`, which expands to the lesson's mount path
already escaped:

```jsonc
{
  "level": "openapi",
  "name": "item_id is declared as a path parameter typed integer",
  "pointer": "#/paths/{{lessonPath}}~1items~1{item_id}/get/parameters/0/schema/type",
  "expect": { "equals": "integer" }
}
```

Pointers that don't touch `#/paths/` — anything under
`#/components/schemas/...`, for instance — need neither, since schema names
come from your Pydantic model names and aren't prefixed.

A failing openapi check reports the *expanded* pointer, so what you see in
the output is exactly what was looked up.

### `pytest` — checks that need to import the module

For anything that requires inspecting the learner's code rather than just
its HTTP behavior — a synchronous call inside `async def` blocking the event
loop, business logic that belongs in a service layer instead of a router,
use of a banned API — write a real pytest test.

```jsonc
{
  "level": "pytest",
  "name": "Handler does not block the event loop",
  "file": "tests/test_async.py::test_no_blocking"
}
```

`file` is a pytest node id **relative to the lesson's own directory**. The
file must live under `client/content/<module>/<lesson>/tests/`. Inside the test,
import the learner's code exactly as the engine does:

```python
from app.m03.l02.main import router  # workdir "app/m03/l02" -> this import
```

The server container mounts `client/content/` read-only, and the dev-only
`POST /__runner/pytest` endpoint runs `pytest <node-id>` as a fresh
subprocess (so it always sees the learner's current code, never a cached
import) with `server/` on `PYTHONPATH`.

## State across runs

Checks in a lesson are not isolated — a `POST` that creates a resource is
often followed by a check that expects to find it. Two mechanisms make that
possible without every check needing to be independently idempotent:

**Capture + substitution.** A check can `capture` values from its own
response (dot-paths rooted at `{ status, headers, body }`) and later checks
in the *same* lesson can reference them with `{{captured.<name>}}` anywhere
in `request.path`, `request.headers`, or `request.body`:

```jsonc
{
  "level": "http",
  "name": "Create a user",
  "request": { "method": "POST", "path": "/users", "body": { "email": "{{random.email}}" } },
  "expect": { "status": 201 },
  "capture": { "userId": "body.id" }
},
{
  "level": "http",
  "name": "Fetch the user we just created",
  "request": { "method": "GET", "path": "/users/{{captured.userId}}" },
  "expect": { "status": 200, "bodyMatches": { "id": "{{captured.userId}}" } }
}
```

**Randomizer placeholders.** `{{random.email}}` and `{{random.uuid}}` in a
request body/path/header produce a fresh value on every run, so a lesson
about unique constraints doesn't fail on the second attempt.

Both are resolved by `@learn-fastapi/check-engine`'s `substituteDeep`, used
identically by the web app and `pnpm validate`.

## Theory: lesson.mdx and its components

`lesson.mdx` is plain Markdown plus five components, always in scope, no
import needed:

- **`<Diff>`** — the core pedagogical device: NestJS/Express on the left,
  the FastAPI equivalent on the right. Props: `left`, `right` (code as
  strings — use a template literal for multi-line), `leftLabel`,
  `rightLabel`, `leftLang`, `rightLang` (Shiki language ids, e.g.
  `"typescript"` / `"python"`), `caption` (optional).
- **`<Gotcha title="...">children</Gotcha>`** — callout for a trap (mutable
  default arguments, a type annotation that's too loose to validate
  anything, etc.). Children can be any Markdown/JSX.
- **`<Predict code={...} lang="python" choices={[...]} answerIndex={n} explanation="...">`**
  — a snippet plus a multiple-choice "what does this print/return". The
  explanation only reveals after the learner picks an answer, correct or not.
- **`<Hint hints={["...", "...", ...]} />`** — progressively revealed
  hints; each is shown only after the previous one has been read.
- **`<FileTree root="server/" paths={["app/m03/l02/main.py", ...]} highlight={[...]} />`**
  — renders the lesson's directory layout. `highlight` (optional) marks
  which paths the learner should actually edit.

Keep `lesson.mdx` prose technical and dense — this is a reference for
working developers, not a tutorial with filler.

## Adding a lesson: checklist

1. Pick an id (`<module>-l<NN>-<slug>`) and create
   `client/content/<module-dir>/<lesson-dir>/`.
2. Write `manifest.json`. Reuse the exact `module` object from an existing
   lesson in the same module.
3. Write `starter/<file>` for every entry in `starterFiles` — incomplete,
   with `# TODO` comments describing the task.
4. Write `solution/<file>` — a correct, complete implementation. This is
   what `pnpm validate` runs your checks against.
5. Write `lesson.mdx`.
6. If any check is `"level": "pytest"`, write the corresponding test(s)
   under `tests/`.
7. Run `pnpm validate` (from `client/`, like every pnpm command here). It
   brings up the server container with every lesson's
   `solution/` in place of the learner's files and runs every check —
   including yours. It must exit 0.
8. Run `docker compose up` from `client/`, open the lesson in the browser, confirm the
   starter file bootstraps into `server/app/<workdir>/`, and that the
   check panel's pass/fail output reads the way you intended.

No step above touches code outside `client/content/`.
