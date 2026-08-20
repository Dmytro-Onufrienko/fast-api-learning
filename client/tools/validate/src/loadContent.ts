import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "tinyglobby";
import { parseManifest, type Manifest } from "@learn-fastapi/check-engine";

import { CONTENT_DIR } from "./paths.ts";

export interface LoadedLesson {
  manifest: Manifest;
  /** Absolute path to the lesson's directory under content/. */
  dir: string;
  /** Path relative to content/, for messages. */
  relDir: string;
}

/**
 * Loads every lesson from content/**\/manifest.json — the same discovery the
 * web app does with import.meta.glob, and the same Zod schema. If the two
 * ever disagree about what a valid lesson is, that's a bug in the engine, not
 * something a lesson author should have to reason about.
 */
export async function loadLessons(): Promise<LoadedLesson[]> {
  const manifestPaths = await glob("**/manifest.json", {
    cwd: CONTENT_DIR,
    absolute: true,
  });
  manifestPaths.sort();

  const lessons: LoadedLesson[] = [];
  const errors: string[] = [];

  for (const manifestPath of manifestPaths) {
    const relPath = path.relative(CONTENT_DIR, manifestPath);
    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    } catch (err) {
      errors.push(`${relPath}: not valid JSON — ${(err as Error).message}`);
      continue;
    }

    try {
      const manifest = parseManifest(raw, relPath);
      const dir = path.dirname(manifestPath);
      lessons.push({ manifest, dir, relDir: path.relative(CONTENT_DIR, dir) });
    } catch (err) {
      errors.push((err as Error).message);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid content:\n${errors.join("\n")}`);
  }

  const ids = lessons.map((l) => l.manifest.id);
  const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (duplicates.length > 0) {
    throw new Error(`Duplicate lesson id(s): ${duplicates.join(", ")}`);
  }

  lessons.sort((a, b) => {
    if (a.manifest.module.order !== b.manifest.module.order) {
      return a.manifest.module.order - b.manifest.module.order;
    }
    return a.manifest.order - b.manifest.order;
  });

  return lessons;
}
