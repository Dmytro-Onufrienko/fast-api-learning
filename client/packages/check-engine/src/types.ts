import type { Check, Manifest } from "./schema.js";

export interface RawExchange {
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  response?: {
    status: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
}

export type CheckStatus = "pass" | "fail" | "error";

export interface CheckResult {
  name: string;
  level: Check["level"];
  status: CheckStatus;
  durationMs: number;
  /** Human-readable explanation, always set on fail/error. */
  message?: string;
  expected?: unknown;
  received?: unknown;
  raw?: RawExchange;
}

export interface ScenarioResult {
  manifestId: string;
  results: CheckResult[];
  passed: boolean;
}

/**
 * Resolves paths to fully-qualified request URLs. The web app and the CLI
 * validator implement this differently:
 *  - the web app talks to the server container through Vite's /api proxy, so
 *    lesson paths are relative (`baseUrl + path`) and root paths get an
 *    `/api` prefix.
 *  - the CLI validator talks to the server container directly (no proxy), so it
 *    strips the leading `/api` from baseUrl and prefixes everything with the
 *    container's real base URL (e.g. http://localhost:8000).
 */
export interface RunnerConfig {
  /** Resolves a path relative to the lesson's baseUrl (an http check's `request.path`) to a full URL. */
  resolveLessonPath(manifest: Manifest, path: string): string;
  /** Resolves a path relative to the api root (e.g. "/openapi.json", "/__runner/pytest") to a full URL. */
  resolveApiPath(path: string): string;
  /** Defaults to global fetch; overridable for tests. */
  fetchImpl?: typeof fetch;
  /** Per-request timeout in ms. Defaults to 5000. */
  timeoutMs?: number;
}
