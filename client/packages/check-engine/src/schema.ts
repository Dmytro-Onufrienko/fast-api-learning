import { z } from "zod";

/**
 * Zod schema for a lesson's manifest.json.
 * This is the single source of truth for what a manifest must contain.
 * Both the web app (at content-load time) and `pnpm validate` parse every
 * manifest through this schema and fail loudly on anything malformed.
 */

const HttpRequestSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  /** Path relative to the lesson's baseUrl, e.g. "/users/42" */
  path: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
});

const HttpExpectSchema = z.object({
  status: z.number().int().optional(),
  /** Recursive partial match against the response body. Extra fields are allowed unless `exact` is true. */
  bodyMatches: z.unknown().optional(),
  /** Stringified arrow function, e.g. "b => typeof b.name === 'string'". Evaluated with `new Function`. */
  bodyPredicate: z.string().optional(),
  headerContains: z.record(z.string(), z.string()).optional(),
  /** When true, bodyMatches must account for every field in the response (no extra fields allowed). */
  exact: z.boolean().optional().default(false),
});

const HttpCheckSchema = z.object({
  level: z.literal("http"),
  name: z.string(),
  request: HttpRequestSchema,
  expect: HttpExpectSchema,
  /**
   * Extract values from this check's response for use in later checks via
   * "{{captured.<name>}}". Dot-paths are rooted at { status, headers, body }.
   * e.g. { "userId": "body.id" }
   */
  capture: z.record(z.string(), z.string()).optional(),
});

const OpenApiExpectSchema = z
  .object({
    equals: z.unknown().optional(),
    exists: z.boolean().optional(),
    oneOf: z.array(z.unknown()).optional(),
  })
  .refine(
    (v) => v.equals !== undefined || v.exists !== undefined || v.oneOf !== undefined,
    { message: "openapi check expect must set one of: equals, exists, oneOf" },
  );

const OpenApiCheckSchema = z.object({
  level: z.literal("openapi"),
  name: z.string(),
  /** JSON Pointer into the api's /openapi.json document, e.g. "#/paths/~1items~1{item_id}/get" */
  pointer: z.string(),
  expect: OpenApiExpectSchema,
});

const PytestCheckSchema = z.object({
  level: z.literal("pytest"),
  name: z.string(),
  /** Node id relative to the lesson directory, e.g. "tests/test_async.py::test_no_blocking" */
  file: z.string(),
});

export const CheckSchema = z.discriminatedUnion("level", [
  HttpCheckSchema,
  OpenApiCheckSchema,
  PytestCheckSchema,
]);

export const ModuleRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number().int(),
});

export const ManifestSchema = z.object({
  id: z.string(),
  module: ModuleRefSchema,
  order: z.number().int(),
  title: z.string(),
  estimateMin: z.number().int().positive(),
  /** Directory the learner works in, relative to server/, e.g. "app/m03/l02" */
  workdir: z.string(),
  /** Router prefix used by the checks, as seen through the web app's /api proxy, e.g. "/api/m03/l02" */
  baseUrl: z.string().startsWith("/api/"),
  /** Files copied into server/<workdir>/ the first time the lesson is opened */
  starterFiles: z.array(z.string()).min(1),
  checks: z.array(CheckSchema).min(1),
});

export type HttpRequest = z.infer<typeof HttpRequestSchema>;
export type HttpExpect = z.infer<typeof HttpExpectSchema>;
export type HttpCheck = z.infer<typeof HttpCheckSchema>;
export type OpenApiCheck = z.infer<typeof OpenApiCheckSchema>;
export type PytestCheck = z.infer<typeof PytestCheckSchema>;
export type Check = z.infer<typeof CheckSchema>;
export type ModuleRef = z.infer<typeof ModuleRefSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;

export function parseManifest(raw: unknown, sourcePath?: string): Manifest {
  const result = ManifestSchema.safeParse(raw);
  if (!result.success) {
    const where = sourcePath ? ` in ${sourcePath}` : "";
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid manifest${where}:\n${issues}`);
  }
  return result.data;
}
