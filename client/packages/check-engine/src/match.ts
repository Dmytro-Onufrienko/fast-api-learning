/**
 * Recursive partial-match used by the `bodyMatches` expectation.
 *
 * By default (`exact: false`) every field named in `expected` must be present
 * in `actual` with a matching value; fields present in `actual` but not in
 * `expected` are ignored. This is deliberate: a learner's response can carry
 * `created_at` or other extras without failing the check. Set `exact: true`
 * (used sparingly, e.g. for response_model / output-filtering lessons) to
 * require an exact field-for-field match at every level.
 */
export interface MatchResult {
  ok: boolean;
  /** Path to the first mismatch, e.g. "body.user.id" */
  path?: string;
  expected?: unknown;
  received?: unknown;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function deepMatch(
  actual: unknown,
  expected: unknown,
  exact: boolean,
  path = "body",
): MatchResult {
  if (isPlainObject(expected)) {
    if (!isPlainObject(actual)) {
      return { ok: false, path, expected, received: actual };
    }
    if (exact) {
      const expectedKeys = Object.keys(expected).sort();
      const actualKeys = Object.keys(actual).sort();
      if (
        expectedKeys.length !== actualKeys.length ||
        expectedKeys.some((k, i) => k !== actualKeys[i])
      ) {
        return { ok: false, path, expected, received: actual };
      }
    }
    for (const key of Object.keys(expected)) {
      const result = deepMatch(actual[key], expected[key], exact, `${path}.${key}`);
      if (!result.ok) return result;
    }
    return { ok: true };
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return { ok: false, path, expected, received: actual };
    }
    if (exact && actual.length !== expected.length) {
      return { ok: false, path, expected, received: actual };
    }
    for (let i = 0; i < expected.length; i++) {
      const result = deepMatch(actual[i], expected[i], exact, `${path}[${i}]`);
      if (!result.ok) return result;
    }
    return { ok: true };
  }

  if (actual !== expected) {
    return { ok: false, path, expected, received: actual };
  }
  return { ok: true };
}
