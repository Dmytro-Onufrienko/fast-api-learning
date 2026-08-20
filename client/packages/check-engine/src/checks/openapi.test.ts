import { describe, expect, it } from "vitest";

import type { Manifest } from "../schema.js";
import { resolveJsonPointer } from "../jsonPointer.js";
import { expandPointer } from "./openapi.js";

/**
 * `{{lessonPath}}` exists so an openapi pointer never hardcodes a lesson's
 * mount prefix. The expansion has to strip the manifest's `/api` proxy
 * prefix and escape the result as a single JSON Pointer segment — the two
 * halves of that are what break silently if it regresses, so both are pinned
 * here, ending with a round-trip through resolveJsonPointer.
 */
function manifest(baseUrl: string): Manifest {
  return {
    id: "m03-l01-first-endpoint",
    module: { id: "m03", title: "FastAPI basics", order: 3 },
    order: 1,
    title: "Your first endpoint",
    estimateMin: 20,
    workdir: "app/m03/l01",
    baseUrl,
    starterFiles: ["main.py"],
    checks: [],
  } as unknown as Manifest;
}

describe("expandPointer", () => {
  it("expands {{lessonPath}} to the escaped mount path", () => {
    const pointer = expandPointer(
      manifest("/api/m03/l01"),
      "#/paths/{{lessonPath}}~1items~1{item_id}/get/parameters/0/schema/type",
    );
    expect(pointer).toBe("#/paths/~1m03~1l01~1items~1{item_id}/get/parameters/0/schema/type");
  });

  it("strips only the leading /api prefix", () => {
    expect(expandPointer(manifest("/api/m05/l02"), "{{lessonPath}}")).toBe("~1m05~1l02");
  });

  it("does not strip an /api segment that is not at the start", () => {
    expect(expandPointer(manifest("/api/m07/api/l01"), "{{lessonPath}}")).toBe("~1m07~1api~1l01");
  });

  it("escapes '~' before '/' so a tilde in the path survives a round trip", () => {
    expect(expandPointer(manifest("/api/m01/l~1"), "{{lessonPath}}")).toBe("~1m01~1l~01");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(expandPointer(manifest("/api/m03/l01"), "#/paths/{{ lessonPath }}~1items")).toBe(
      "#/paths/~1m03~1l01~1items",
    );
  });

  it("expands every occurrence", () => {
    expect(expandPointer(manifest("/api/m03/l01"), "{{lessonPath}}|{{lessonPath}}")).toBe(
      "~1m03~1l01|~1m03~1l01",
    );
  });

  it("leaves pointers without the placeholder untouched", () => {
    const pointer = "#/components/schemas/UserCreate/properties/age/exclusiveMinimum";
    expect(expandPointer(manifest("/api/m03/l01"), pointer)).toBe(pointer);
  });

  it("produces a pointer that resolves against a FastAPI-shaped document", () => {
    const doc = {
      paths: {
        "/m03/l01/items/{item_id}": {
          get: { parameters: [{ schema: { type: "integer" } }] },
        },
      },
    };
    const pointer = expandPointer(
      manifest("/api/m03/l01"),
      "#/paths/{{lessonPath}}~1items~1{item_id}/get/parameters/0/schema/type",
    );
    expect(resolveJsonPointer(doc, pointer)).toEqual({ found: true, value: "integer" });
  });
});
