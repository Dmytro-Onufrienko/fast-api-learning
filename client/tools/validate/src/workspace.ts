import fs from "node:fs/promises";
import path from "node:path";

import { SERVER_DIR, WORKSPACE_DIR } from "./paths.ts";
import type { LoadedLesson } from "./loadContent.ts";

/**
 * Builds the scratch workspace the validator's api container runs against:
 * a copy of server/ (platform code + dependency manifest) in which every
 * lesson's workdir is populated from that lesson's solution/ directory
 * rather than the learner's own files.
 *
 * The learner's real server/app/** is never read and never written.
 */
export async function buildWorkspace(lessons: LoadedLesson[]): Promise<void> {
  await fs.rm(WORKSPACE_DIR, { recursive: true, force: true });
  await fs.mkdir(WORKSPACE_DIR, { recursive: true });

  // Platform files only — deliberately not server/app/**, which is the
  // learner's own work.
  await fs.copyFile(
    path.join(SERVER_DIR, "pyproject.toml"),
    path.join(WORKSPACE_DIR, "pyproject.toml"),
  );
  const pythonVersion = path.join(SERVER_DIR, ".python-version");
  if (await exists(pythonVersion)) {
    await fs.copyFile(pythonVersion, path.join(WORKSPACE_DIR, ".python-version"));
  }
  await fs.cp(path.join(SERVER_DIR, "engine"), path.join(WORKSPACE_DIR, "engine"), {
    recursive: true,
  });
  await fs.mkdir(path.join(WORKSPACE_DIR, "app"), { recursive: true });
  await fs.copyFile(
    path.join(SERVER_DIR, "app", "main.py"),
    path.join(WORKSPACE_DIR, "app", "main.py"),
  );
  await fs.writeFile(path.join(WORKSPACE_DIR, "app", "__init__.py"), "");

  for (const lesson of lessons) {
    const targetDir = path.join(WORKSPACE_DIR, lesson.manifest.workdir);
    await fs.mkdir(targetDir, { recursive: true });
    await ensureInitChain(lesson.manifest.workdir);

    const solutionDir = path.join(lesson.dir, "solution");
    for (const file of lesson.manifest.starterFiles) {
      const source = path.join(solutionDir, file);
      if (!(await exists(source))) {
        throw new Error(
          `Lesson "${lesson.manifest.id}" declares starterFiles entry "${file}" but ` +
            `content/${lesson.relDir}/solution/${file} does not exist. ` +
            `Every starter file needs a matching reference solution — see content/README.md.`,
        );
      }
      const dest = path.join(targetDir, file);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(source, dest);
    }
  }
}

async function ensureInitChain(workdir: string): Promise<void> {
  const segments = workdir.split("/").filter(Boolean);
  let current = WORKSPACE_DIR;
  for (const segment of segments) {
    current = path.join(current, segment);
    await fs.mkdir(current, { recursive: true });
    await fs.writeFile(path.join(current, "__init__.py"), "", { flag: "a" });
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
