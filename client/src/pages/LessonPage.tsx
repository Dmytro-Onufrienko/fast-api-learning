import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getLesson, getNeighbours } from "../content/registry";
import { bootstrapLesson } from "../lib/api";
import { CheckPanel } from "../components/CheckPanel";
import { HintGroup, mdxComponents } from "../components/mdx";
import { useProgress, lessonStatus, STATUS_LABEL } from "../store/progress";

export function LessonPage() {
  const { lessonId = "" } = useParams();
  const lesson = getLesson(lessonId);
  const markOpened = useProgress((s) => s.markOpened);
  const byLesson = useProgress((s) => s.byLesson);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    if (!lesson) return;
    markOpened(lesson.manifest.id);
    // Materialize starter files into the learner's workspace. Idempotent:
    // the api never overwrites a file that already exists, so re-opening a
    // lesson can't clobber work in progress.
    bootstrapLesson(lesson.manifest.id)
      .then(() => setBootstrapError(null))
      .catch((err: Error) => setBootstrapError(err.message));
  }, [lesson, markOpened]);

  if (!lesson) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-sm font-semibold uppercase tracking-wider text-fail">Lesson not found</h1>
        <p className="mt-2 text-[14px] text-ink-400">
          No lesson with id <code className="font-mono text-ink-200">{lessonId}</code>.{" "}
          <Link to="/" className="text-accent underline underline-offset-2">
            Back to modules
          </Link>
          .
        </p>
      </div>
    );
  }

  const { manifest, Theory } = lesson;
  const { prev, next } = getNeighbours(manifest.id);
  const status = lessonStatus(byLesson, manifest.id);
  const workdirPath = `server/${manifest.workdir}`;

  return (
    <article className="mx-auto max-w-5xl px-5 py-7">
      <header className="mb-7 border-b border-ink-800 pb-4">
        <p className="mb-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-2xs uppercase tracking-wider text-ink-500">
          <span className="font-mono text-ink-600">{manifest.module.id}</span>
          <span>{manifest.module.title}</span>
          <span className="text-ink-700">·</span>
          <span>{manifest.estimateMin} min</span>
          <span className="text-ink-700">·</span>
          <span
            className={
              status === "passed" ? "text-pass" : status === "in-progress" ? "text-warn" : ""
            }
          >
            {STATUS_LABEL[status]}
          </span>
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-ink-100">{manifest.title}</h1>
      </header>

      {bootstrapError ? (
        <div className="mb-6 rounded-md border border-warn/30 bg-warn/[0.07] px-3.5 py-3">
          <p className="text-2xs font-semibold uppercase tracking-wider text-warn">
            Could not prepare the exercise files
          </p>
          <p className="mt-1 max-w-prose text-[13px] leading-5 text-ink-300">{bootstrapError}</p>
        </div>
      ) : null}

      {/* Zone 1 — theory. Components are handed to the MDX component
          explicitly rather than through a provider, because lesson.mdx files
          live under content/ and can't resolve imports from client. */}
      {/* HintGroup keys off the lesson id so a half-revealed hint chain does
          not carry over when the learner moves to the next lesson. */}
      <div className="lesson-prose">
        <HintGroup key={manifest.id}>
          <Theory components={mdxComponents} />
        </HintGroup>
      </div>

      {/* Zone 2 — the task's file location. The learner writes real Python in
          their own editor; this app never embeds one. */}
      <section className="mt-8 rounded-md border border-ink-700/70 bg-ink-900">
        <div className="border-b border-ink-700/70 bg-ink-850 px-3 py-2">
          <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-300">
            Edit this file
          </h2>
        </div>
        <div className="px-3 py-3">
          <p className="font-mono text-[13.5px] text-ink-100">
            {workdirPath}/{manifest.starterFiles[0]}
          </p>
          {manifest.starterFiles.length > 1 ? (
            <ul className="mt-1 space-y-0.5">
              {manifest.starterFiles.slice(1).map((file) => (
                <li key={file} className="font-mono text-[13.5px] text-ink-300">
                  {workdirPath}/{file}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 max-w-prose text-[13px] leading-5 text-ink-500">
            Open it in your own editor. uvicorn is running with{" "}
            <code className="font-mono text-ink-400">--reload</code>, so saving is all it takes —
            then run the checks below.
          </p>
        </div>
      </section>

      {/* Zone 3 — checks */}
      <div className="mt-5">
        <CheckPanel manifest={manifest} />
      </div>

      <nav className="mt-8 flex items-center justify-between gap-4 border-t border-ink-800 pt-4">
        {prev ? (
          <Link
            to={`/lesson/${prev.manifest.id}`}
            className="group min-w-0 text-left text-[13px] text-ink-400 hover:text-ink-100"
          >
            <span className="block text-2xs uppercase tracking-wider text-ink-600">Previous</span>
            <span className="truncate">← {prev.manifest.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`/lesson/${next.manifest.id}`}
            className="group min-w-0 text-right text-[13px] text-ink-400 hover:text-ink-100"
          >
            <span className="block text-2xs uppercase tracking-wider text-ink-600">Next</span>
            <span className="truncate">{next.manifest.title} →</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
