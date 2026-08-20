import type { ComponentType } from "react";
import { parseManifest, type Manifest, type ModuleRef } from "@learn-fastapi/check-engine";

/**
 * The content registry. Lessons are data discovered from the filesystem —
 * adding one never requires writing code here or anywhere else in client.
 *
 * Paths are relative to this file: ../../content is client/content/, the
 * course material. It sits inside the Vite project root, so no
 * `server.fs.allow` widening is needed for it.
 */
const manifestModules = import.meta.glob("../../content/**/manifest.json", {
  eager: true,
}) as Record<string, { default: unknown }>;

const mdxModules = import.meta.glob("../../content/**/lesson.mdx", {
  eager: true,
}) as Record<string, { default: ComponentType<Record<string, unknown>> }>;

export interface Lesson {
  manifest: Manifest;
  Theory: ComponentType<Record<string, unknown>>;
  /** Directory of this lesson relative to content/, e.g. "m03-fastapi-basics/m03-l01-first-endpoint" */
  contentDir: string;
}

export interface Module extends ModuleRef {
  lessons: Lesson[];
}

function dirOf(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}

function relativeContentDir(absoluteDir: string): string {
  const marker = "/content/";
  const idx = absoluteDir.indexOf(marker);
  return idx === -1 ? absoluteDir : absoluteDir.slice(idx + marker.length);
}

function buildRegistry(): { modules: Module[]; lessonsById: Map<string, Lesson> } {
  const lessons: Lesson[] = [];

  for (const [path, mod] of Object.entries(manifestModules)) {
    const dir = dirOf(path);
    const manifest = parseManifest(mod.default, relativeContentDir(dir) + "/manifest.json");

    const mdxPath = `${dir}/lesson.mdx`;
    const mdxModule = mdxModules[mdxPath];
    if (!mdxModule) {
      throw new Error(
        `Lesson "${manifest.id}" has a manifest.json but no lesson.mdx at ${relativeContentDir(mdxPath)}. ` +
          `Every lesson needs both — see content/README.md.`,
      );
    }

    lessons.push({ manifest, Theory: mdxModule.default, contentDir: relativeContentDir(dir) });
  }

  const duplicates = lessons
    .map((l) => l.manifest.id)
    .filter((id, i, all) => all.indexOf(id) !== i);
  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate lesson id(s): ${[...new Set(duplicates)].join(", ")}. Lesson ids must be globally unique.`,
    );
  }

  // Grouping and ordering come entirely from the manifests' module/order
  // fields — never from directory names on disk.
  const byModuleId = new Map<string, Module>();
  for (const lesson of lessons) {
    const ref = lesson.manifest.module;
    let module = byModuleId.get(ref.id);
    if (!module) {
      module = { ...ref, lessons: [] };
      byModuleId.set(ref.id, module);
    } else if (module.title !== ref.title || module.order !== ref.order) {
      throw new Error(
        `Module "${ref.id}" is declared inconsistently across lessons: ` +
          `"${module.title}" (order ${module.order}) vs "${ref.title}" (order ${ref.order}). ` +
          `Every lesson in a module must repeat the same module object.`,
      );
    }
    module.lessons.push(lesson);
  }

  const modules = [...byModuleId.values()].sort((a, b) => a.order - b.order);
  for (const module of modules) {
    module.lessons.sort((a, b) => a.manifest.order - b.manifest.order);
  }

  return {
    modules,
    lessonsById: new Map(lessons.map((l) => [l.manifest.id, l])),
  };
}

let modulesValue: Module[] = [];
let lessonsByIdValue = new Map<string, Lesson>();
let error: Error | null = null;

try {
  const registry = buildRegistry();
  modulesValue = registry.modules;
  lessonsByIdValue = registry.lessonsById;
} catch (err) {
  error = err instanceof Error ? err : new Error(String(err));
}

export const modules = modulesValue;
export const lessonsById = lessonsByIdValue;
export const contentLoadError = error;

/** Flat, fully ordered lesson list — used for prev/next navigation. */
export const orderedLessons: Lesson[] = modulesValue.flatMap((m) => m.lessons);

export function getLesson(id: string): Lesson | undefined {
  return lessonsByIdValue.get(id);
}

export function getNeighbours(id: string): { prev?: Lesson; next?: Lesson } {
  const index = orderedLessons.findIndex((l) => l.manifest.id === id);
  if (index === -1) return {};
  return {
    prev: index > 0 ? orderedLessons[index - 1] : undefined,
    next: index < orderedLessons.length - 1 ? orderedLessons[index + 1] : undefined,
  };
}
