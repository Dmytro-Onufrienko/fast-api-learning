/** Minimal RFC 6901 JSON Pointer resolver, e.g. "#/paths/~1items~1{item_id}/get" */
export function resolveJsonPointer(doc: unknown, pointer: string): { found: boolean; value: unknown } {
  let ptr = pointer.trim();
  if (ptr.startsWith("#")) ptr = ptr.slice(1);
  if (ptr === "") return { found: true, value: doc };
  if (!ptr.startsWith("/")) {
    throw new Error(`Invalid JSON Pointer "${pointer}": must start with "#/" or "/"`);
  }
  const segments = ptr
    .slice(1)
    .split("/")
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current: unknown = doc;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== "object") {
      return { found: false, value: undefined };
    }
    if (Array.isArray(current)) {
      const idx = Number(segment);
      if (Number.isNaN(idx) || idx < 0 || idx >= current.length) {
        return { found: false, value: undefined };
      }
      current = current[idx];
    } else {
      const obj = current as Record<string, unknown>;
      // hasOwnProperty, not `in`: `in` walks the prototype chain, so a
      // pointer ending in "constructor" or "toString" would resolve against
      // any object and report found for something the document never had.
      if (!Object.prototype.hasOwnProperty.call(obj, segment)) return { found: false, value: undefined };
      current = obj[segment];
    }
  }
  return { found: true, value: current };
}
