import { describe, expect, it } from "vitest";

import { deepMatch } from "./match.js";

/**
 * `bodyMatches` is a recursive PARTIAL match by default — extra fields in a
 * learner's response are not failures unless `exact: true`. That rule is the
 * reason learners debug FastAPI instead of a stray `created_at`, so most of
 * what is pinned here is the partial/exact split and the reported mismatch
 * path (which is what the failure panel shows).
 */
describe("deepMatch", () => {
  describe("partial mode (exact: false)", () => {
    it("ignores fields the expectation does not mention", () => {
      const result = deepMatch(
        { id: 1, name: "ada", created_at: "2026-01-01T00:00:00Z" },
        { id: 1 },
        false,
      );
      expect(result.ok).toBe(true);
    });

    it("matches nested objects partially at every level", () => {
      const result = deepMatch(
        { user: { id: 7, email: "a@b.test", roles: ["admin"] }, meta: { page: 1 } },
        { user: { id: 7 } },
        false,
      );
      expect(result.ok).toBe(true);
    });

    it("accepts an actual array longer than the expected one", () => {
      expect(deepMatch([1, 2, 3], [1, 2], false).ok).toBe(true);
    });

    it("still fails on a field that is present but different", () => {
      const result = deepMatch({ id: 1, name: "ada" }, { name: "grace" }, false);
      expect(result).toEqual({ ok: false, path: "body.name", expected: "grace", received: "ada" });
    });

    it("fails on a missing field, reporting it as undefined", () => {
      const result = deepMatch({ id: 1 }, { q: "hello" }, false);
      expect(result).toEqual({ ok: false, path: "body.q", expected: "hello", received: undefined });
    });

    it("treats an empty expectation object as matching any object", () => {
      expect(deepMatch({ a: 1 }, {}, false).ok).toBe(true);
    });
  });

  describe("exact mode", () => {
    it("fails when the response carries an extra field", () => {
      const result = deepMatch({ id: 1, password: "hunter2" }, { id: 1 }, true);
      expect(result.ok).toBe(false);
      expect(result.path).toBe("body");
      expect(result.received).toEqual({ id: 1, password: "hunter2" });
    });

    it("passes when the key sets are identical regardless of key order", () => {
      expect(deepMatch({ b: 2, a: 1 }, { a: 1, b: 2 }, true).ok).toBe(true);
    });

    it("enforces exactness in nested objects too", () => {
      const result = deepMatch({ user: { id: 1, secret: "x" } }, { user: { id: 1 } }, true);
      expect(result.ok).toBe(false);
      expect(result.path).toBe("body.user");
    });

    it("requires arrays to have equal length", () => {
      const result = deepMatch([1, 2, 3], [1, 2], true);
      expect(result.ok).toBe(false);
      expect(result.path).toBe("body");
    });
  });

  describe("type mismatches", () => {
    it("fails when an object is expected but an array is received", () => {
      const result = deepMatch([1], { id: 1 }, false);
      expect(result).toEqual({ ok: false, path: "body", expected: { id: 1 }, received: [1] });
    });

    it("fails when an object is expected but null is received", () => {
      const result = deepMatch(null, { id: 1 }, false);
      expect(result.ok).toBe(false);
      expect(result.received).toBeNull();
    });

    it("fails when an array is expected but an object is received", () => {
      const result = deepMatch({ 0: 1 }, [1], false);
      expect(result.ok).toBe(false);
      expect(result.path).toBe("body");
    });

    it("compares primitives strictly — no type coercion", () => {
      expect(deepMatch("5", 5, false).ok).toBe(false);
      expect(deepMatch(1, true, false).ok).toBe(false);
      expect(deepMatch(null, undefined, false).ok).toBe(false);
    });

    it("matches null against an explicit null expectation", () => {
      expect(deepMatch({ q: null }, { q: null }, false).ok).toBe(true);
    });
  });

  describe("mismatch paths", () => {
    it("indexes into arrays with bracket notation", () => {
      const result = deepMatch({ items: [{ id: 1 }, { id: 2 }] }, { items: [{ id: 1 }, { id: 9 }] }, false);
      expect(result.path).toBe("body.items[1].id");
    });

    it("reports the first mismatch only", () => {
      const result = deepMatch({ a: 1, b: 2 }, { a: 99, b: 99 }, false);
      expect(result.path).toBe("body.a");
    });

    it("honours a caller-supplied root path", () => {
      const result = deepMatch({ id: 1 }, { id: 2 }, false, "response");
      expect(result.path).toBe("response.id");
    });
  });
});
