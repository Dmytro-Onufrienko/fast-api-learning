/**
 * Placeholder substitution for request paths/headers/bodies.
 *
 * Two families of placeholders:
 *  - {{random.email}}, {{random.uuid}} — fresh random values, one per occurrence
 *  - {{captured.<name>}} — a value captured from an earlier check in the same
 *    scenario run via that check's `capture` map
 *
 * Checks within a lesson run sequentially as a single scenario specifically so
 * this works: a POST can capture the id it created, and a later GET/DELETE can
 * reference it, instead of every check needing to be independently idempotent.
 */

export type CapturedValues = Record<string, unknown>;

function randomEmail(): string {
  const id = Math.random().toString(36).slice(2, 10);
  return `learner+${id}@example.test`;
}

function randomUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122-ish v4 UUID for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function resolveToken(token: string, captured: CapturedValues): string {
  if (token === "random.email") return randomEmail();
  if (token === "random.uuid") return randomUuid();
  if (token.startsWith("captured.")) {
    const key = token.slice("captured.".length);
    if (!(key in captured)) {
      throw new Error(
        `Unknown placeholder {{${token}}} — no earlier check in this lesson captured "${key}". ` +
          `Add a "capture" entry to the check that should produce it.`,
      );
    }
    return String(captured[key]);
  }
  throw new Error(`Unknown placeholder {{${token}}}`);
}

function substituteString(value: string, captured: CapturedValues): string {
  return value.replace(PLACEHOLDER_RE, (_match, token) => resolveToken(token, captured));
}

/** Deeply substitutes placeholders in strings, recursing through objects/arrays. Non-string leaves pass through untouched. */
export function substituteDeep<T>(value: T, captured: CapturedValues): T {
  if (typeof value === "string") {
    return substituteString(value, captured) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => substituteDeep(v, captured)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = substituteDeep(v, captured);
    }
    return out as unknown as T;
  }
  return value;
}

/** Reads a dot-path like "body.id" or "headers.location" out of a captured response shape. */
export function readDotPath(root: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = root;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
