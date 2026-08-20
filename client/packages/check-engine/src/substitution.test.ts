import { describe, expect, it } from "vitest";

import { substituteDeep } from "./substitution.js";

/**
 * Substitution is what makes a lesson's checks work as one scenario: a POST
 * captures an id, a later GET references it as {{captured.id}}. The tests
 * below pin the traversal (strings anywhere in path/headers/body), the
 * freshness of {{random.*}} (a unique-constraint lesson must not fail on the
 * second run), and the error text an author sees when they reference a value
 * nothing captured.
 */
describe("substituteDeep", () => {
  describe("captured values", () => {
    it("substitutes a captured value inside a string", () => {
      expect(substituteDeep("/users/{{captured.userId}}", { userId: 42 })).toBe("/users/42");
    });

    it("substitutes every occurrence in one string", () => {
      expect(substituteDeep("{{captured.a}}-{{captured.a}}", { a: "x" })).toBe("x-x");
    });

    it("substitutes multiple distinct placeholders in one string", () => {
      expect(substituteDeep("/a/{{captured.x}}/b/{{captured.y}}", { x: 1, y: 2 })).toBe("/a/1/b/2");
    });

    it("tolerates whitespace inside the braces", () => {
      expect(substituteDeep("{{ captured.userId }}", { userId: 7 })).toBe("7");
    });

    it("stringifies non-string captured values", () => {
      expect(substituteDeep("{{captured.n}}", { n: 0 })).toBe("0");
      expect(substituteDeep("{{captured.b}}", { b: false })).toBe("false");
      expect(substituteDeep("{{captured.z}}", { z: null })).toBe("null");
    });

    it("substitutes a placeholder embedded in surrounding text", () => {
      expect(substituteDeep("Bearer {{captured.token}}", { token: "abc" })).toBe("Bearer abc");
    });
  });

  describe("traversal", () => {
    it("recurses through nested objects and arrays", () => {
      const input = {
        path: "/users/{{captured.id}}",
        headers: { authorization: "Bearer {{captured.token}}" },
        body: { tags: ["{{captured.tag}}", "static"], nested: { deep: "{{captured.id}}" } },
      };
      expect(substituteDeep(input, { id: 3, token: "t0k", tag: "admin" })).toEqual({
        path: "/users/3",
        headers: { authorization: "Bearer t0k" },
        body: { tags: ["admin", "static"], nested: { deep: "3" } },
      });
    });

    it("passes non-string leaves through untouched", () => {
      const input = { n: 1, b: true, z: null, arr: [1, 2] };
      expect(substituteDeep(input, {})).toEqual(input);
    });

    it("leaves strings without placeholders untouched", () => {
      expect(substituteDeep("/items/5?q=hello", {})).toBe("/items/5?q=hello");
    });

    it("does not mutate its input", () => {
      const input = { path: "/users/{{captured.id}}" };
      const output = substituteDeep(input, { id: 1 });
      expect(input.path).toBe("/users/{{captured.id}}");
      expect(output).not.toBe(input);
    });

    it("handles an empty object and an empty array", () => {
      expect(substituteDeep({}, {})).toEqual({});
      expect(substituteDeep([], {})).toEqual([]);
    });
  });

  describe("random placeholders", () => {
    it("produces a fresh email on every call", () => {
      const a = substituteDeep("{{random.email}}", {}) as string;
      const b = substituteDeep("{{random.email}}", {}) as string;
      expect(a).toMatch(/^learner\+[a-z0-9]+@example\.test$/);
      expect(a).not.toBe(b);
    });

    it("produces a fresh uuid on every call", () => {
      const a = substituteDeep("{{random.uuid}}", {}) as string;
      const b = substituteDeep("{{random.uuid}}", {}) as string;
      expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(a).not.toBe(b);
    });

    it("resolves each occurrence independently within one string", () => {
      const out = substituteDeep("{{random.uuid}}|{{random.uuid}}", {}) as string;
      const [first, second] = out.split("|");
      expect(first).not.toBe(second);
    });
  });

  describe("errors", () => {
    it("throws when no earlier check captured the referenced name", () => {
      expect(() => substituteDeep("/users/{{captured.userId}}", {})).toThrow(/no earlier check/);
      expect(() => substituteDeep("/users/{{captured.userId}}", {})).toThrow(/userId/);
    });

    it("throws on an unknown placeholder namespace", () => {
      expect(() => substituteDeep("{{lessonPath}}", {})).toThrow(/Unknown placeholder/);
      expect(() => substituteDeep("{{random.phone}}", {})).toThrow(/Unknown placeholder/);
    });

    it("throws from anywhere in a nested structure, not just the top level", () => {
      expect(() => substituteDeep({ body: { id: "{{captured.missing}}" } }, {})).toThrow(/no earlier check/);
    });

    it("distinguishes a captured value that is undefined from an uncaptured name", () => {
      expect(substituteDeep("{{captured.maybe}}", { maybe: undefined })).toBe("undefined");
    });
  });
});
