/**
 * Fails when the root README's lesson list and content/ disagree.
 *
 * The lesson blurbs in the README are written by hand on purpose — they read
 * like chapter introductions and no generator would write them. The cost of
 * that freedom is drift: add a lesson, forget the README, and the front page
 * lies with nothing to catch it. This check is the counterweight. It does not
 * touch the prose; it only asserts that every lesson has a section and a
 * branch command, and that no section describes a lesson that no longer
 * exists.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { CLIENT_ROOT, REPO_ROOT } from "./paths.ts";
import { loadLessons } from "./loadContent.ts";

const README = path.join(REPO_ROOT, "README.md");

/** Course-wide lesson number: lessons ordered by module order, then lesson order. */
function lessonNumbers(lessons: Awaited<ReturnType<typeof loadLessons>>): Map<string, string> {
  const ordered = [...lessons].sort((a, b) => {
    const byModule = a.manifest.module.order - b.manifest.module.order;
    return byModule !== 0 ? byModule : a.manifest.order - b.manifest.order;
  });
  return new Map(ordered.map((l, i) => [l.manifest.id, String(i + 1).padStart(2, "0")]));
}

async function main(): Promise<void> {
  const lessons = await loadLessons();
  const readme = await fs.readFile(README, "utf8");
  const numbers = lessonNumbers(lessons);
  const problems: string[] = [];

  for (const lesson of lessons) {
    const n = numbers.get(lesson.manifest.id)!;
    const heading = `### Lesson ${n} — ${lesson.manifest.title}`;
    if (!readme.includes(heading)) {
      problems.push(
        `README has no section "${heading}" for lesson ${lesson.manifest.id} ` +
          `(${path.relative(CLIENT_ROOT, lesson.dir)}).`,
      );
    }
    if (!readme.includes(`origin/lesson-${n}`)) {
      problems.push(`README has no branch command for lesson-${n} (${lesson.manifest.id}).`);
    }
  }

  const documented = [...readme.matchAll(/^### Lesson (\d+) — (.+)$/gm)];
  const known = new Set([...numbers.values()]);
  for (const [, n, title] of documented) {
    if (!known.has(n!)) {
      problems.push(`README documents "Lesson ${n} — ${title}", but content/ has no such lesson.`);
    }
  }

  if (problems.length > 0) {
    console.error("README lesson list is out of sync with content/:\n");
    for (const p of problems) console.error(`  - ${p}`);
    console.error(
      "\nEvery lesson needs a '### Lesson NN — Title' section and a branch command in README.md.",
    );
    process.exit(1);
  }

  console.log(`README lesson list matches content/ (${lessons.length} lesson(s)).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
