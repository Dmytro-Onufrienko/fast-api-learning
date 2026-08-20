import type { Manifest, OpenApiCheck } from "../schema.js";
import type { CheckResult, RawExchange, RunnerConfig } from "../types.js";
import { resolveJsonPointer } from "../jsonPointer.js";
import { isNetworkError, UNREACHABLE_MESSAGE } from "../unreachable.js";

let openApiCache: { url: string; doc: unknown } | null = null;

async function fetchOpenApiDoc(url: string, config: RunnerConfig): Promise<unknown> {
  if (openApiCache && openApiCache.url === url) return openApiCache.doc;
  const fetchImpl = config.fetchImpl ?? fetch;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`GET ${url} returned ${response.status}`);
  }
  const doc = await response.json();
  openApiCache = { url, doc };
  return doc;
}

/** Clears the in-memory /openapi.json cache. Call between scenario runs so a reloaded app is reflected. */
export function resetOpenApiCache(): void {
  openApiCache = null;
}

function oneOfMatch(value: unknown, options: unknown[]): boolean {
  return options.some((o) => JSON.stringify(o) === JSON.stringify(value));
}

/**
 * Expands `{{lessonPath}}` inside a pointer to the lesson's router mount
 * path, already escaped for use as a JSON Pointer segment.
 *
 * A lesson's routes appear in /openapi.json under their full mounted path
 * (`/m03/l01/items/{item_id}`), which is an implementation detail of where
 * the manifest's `baseUrl` puts them. Without this, every openapi pointer
 * would hardcode the mount prefix and silently break the moment a lesson
 * moved.
 */
export function expandPointer(manifest: Manifest, pointer: string): string {
  const mountPath = manifest.baseUrl.replace(/^\/api/, "");
  const escaped = mountPath.replace(/~/g, "~0").replace(/\//g, "~1");
  return pointer.replace(/\{\{\s*lessonPath\s*\}\}/g, escaped);
}

export async function runOpenApiCheck(
  manifest: Manifest,
  check: OpenApiCheck,
  config: RunnerConfig,
): Promise<CheckResult> {
  const start = performance.now();
  const url = config.resolveApiPath("/openapi.json");
  const raw: RawExchange = { request: { method: "GET", url } };

  let doc: unknown;
  try {
    doc = await fetchOpenApiDoc(url, config);
  } catch (err) {
    const durationMs = performance.now() - start;
    return {
      name: check.name,
      level: "openapi",
      status: "error",
      durationMs,
      message: isNetworkError(err) ? UNREACHABLE_MESSAGE : `Could not fetch /openapi.json: ${(err as Error).message}`,
      raw,
    };
  }

  raw.response = { status: 200, body: doc };
  const durationMs = performance.now() - start;
  const pointer = expandPointer(manifest, check.pointer);
  const { found, value } = resolveJsonPointer(doc, pointer);

  if (check.expect.exists !== undefined) {
    if (found !== check.expect.exists) {
      return {
        name: check.name,
        level: "openapi",
        status: "fail",
        durationMs,
        message: `expected pointer "${pointer}" to ${check.expect.exists ? "exist" : "not exist"}, but it ${found ? "exists" : "does not"}`,
        expected: check.expect.exists,
        received: found,
        raw,
      };
    }
  }

  if (check.expect.equals !== undefined) {
    if (!found || JSON.stringify(value) !== JSON.stringify(check.expect.equals)) {
      return {
        name: check.name,
        level: "openapi",
        status: "fail",
        durationMs,
        message: `pointer "${pointer}" expected ${JSON.stringify(check.expect.equals)}, received ${found ? JSON.stringify(value) : "<not found>"}`,
        expected: check.expect.equals,
        received: found ? value : undefined,
        raw,
      };
    }
  }

  if (check.expect.oneOf !== undefined) {
    if (!found || !oneOfMatch(value, check.expect.oneOf)) {
      return {
        name: check.name,
        level: "openapi",
        status: "fail",
        durationMs,
        message: `pointer "${pointer}" expected one of ${JSON.stringify(check.expect.oneOf)}, received ${found ? JSON.stringify(value) : "<not found>"}`,
        expected: check.expect.oneOf,
        received: found ? value : undefined,
        raw,
      };
    }
  }

  return { name: check.name, level: "openapi", status: "pass", durationMs, raw };
}
