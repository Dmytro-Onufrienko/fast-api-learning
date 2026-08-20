import { describe, expect, it } from "vitest";

import { resolveJsonPointer } from "./jsonPointer.js";

/**
 * Pointers in manifests are written by hand against FastAPI's /openapi.json,
 * so the cases that matter are the ones authors actually hit: `~1`-escaped
 * path segments, `{param}` braces inside a segment, array indexing into
 * `parameters`, and — critically — the difference between "resolved to
 * undefined" and "did not resolve", which is what `exists` reports on.
 */
describe("resolveJsonPointer", () => {
  const doc = {
    paths: {
      "/m03/l01/items/{item_id}": {
        get: {
          parameters: [{ name: "item_id", in: "path", schema: { type: "integer" } }],
        },
      },
    },
    components: {
      schemas: {
        UserCreate: { properties: { age: { exclusiveMinimum: 0 }, nickname: { default: null } } },
      },
    },
    "weird~key": { "a/b": 1 },
  };

  it("returns the whole document for an empty pointer", () => {
    expect(resolveJsonPointer(doc, "#")).toEqual({ found: true, value: doc });
    expect(resolveJsonPointer(doc, "")).toEqual({ found: true, value: doc });
  });

  it("resolves a plain nested pointer", () => {
    expect(resolveJsonPointer(doc, "#/components/schemas/UserCreate/properties/age/exclusiveMinimum"))
      .toEqual({ found: true, value: 0 });
  });

  it("accepts a pointer with no leading '#'", () => {
    expect(resolveJsonPointer(doc, "/components/schemas/UserCreate/properties/age/exclusiveMinimum"))
      .toEqual({ found: true, value: 0 });
  });

  it("unescapes ~1 as '/' inside a segment", () => {
    const result = resolveJsonPointer(doc, "#/paths/~1m03~1l01~1items~1{item_id}/get/parameters/0/schema/type");
    expect(result).toEqual({ found: true, value: "integer" });
  });

  it("unescapes ~0 as '~'", () => {
    expect(resolveJsonPointer(doc, "#/weird~0key/a~1b")).toEqual({ found: true, value: 1 });
  });

  it("indexes into arrays", () => {
    const result = resolveJsonPointer(doc, "#/paths/~1m03~1l01~1items~1{item_id}/get/parameters/0/name");
    expect(result.value).toBe("item_id");
  });

  it("reports a missing key as not found", () => {
    expect(resolveJsonPointer(doc, "#/components/schemas/Nope")).toEqual({ found: false, value: undefined });
  });

  it("distinguishes a null value from a missing key", () => {
    expect(resolveJsonPointer(doc, "#/components/schemas/UserCreate/properties/nickname/default"))
      .toEqual({ found: true, value: null });
    expect(resolveJsonPointer(doc, "#/components/schemas/UserCreate/properties/nickname/missing").found)
      .toBe(false);
  });

  it("stops at an out-of-range or non-numeric array index", () => {
    const base = "#/paths/~1m03~1l01~1items~1{item_id}/get/parameters";
    expect(resolveJsonPointer(doc, `${base}/1`).found).toBe(false);
    expect(resolveJsonPointer(doc, `${base}/-1`).found).toBe(false);
    expect(resolveJsonPointer(doc, `${base}/name`).found).toBe(false);
  });

  it("does not walk into primitives or null", () => {
    expect(resolveJsonPointer({ a: 5 }, "#/a/b").found).toBe(false);
    expect(resolveJsonPointer({ a: null }, "#/a/b").found).toBe(false);
    expect(resolveJsonPointer({ a: "str" }, "#/a/length").found).toBe(false);
  });

  it("does not resolve inherited Object.prototype properties", () => {
    expect(resolveJsonPointer({ a: 1 }, "#/toString").found).toBe(false);
    expect(resolveJsonPointer({ a: 1 }, "#/constructor").found).toBe(false);
  });

  it("throws on a pointer that is neither empty nor rooted at '/'", () => {
    expect(() => resolveJsonPointer(doc, "paths/get")).toThrow(/must start with/);
    expect(() => resolveJsonPointer(doc, "#paths")).toThrow(/must start with/);
  });

  it("tolerates surrounding whitespace", () => {
    expect(resolveJsonPointer(doc, "  #/weird~0key/a~1b  ")).toEqual({ found: true, value: 1 });
  });
});
