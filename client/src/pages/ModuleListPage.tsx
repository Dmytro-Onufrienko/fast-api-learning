import { Link } from "react-router-dom";
import { modules, orderedLessons } from "../content/registry";
import { useProgress, lessonStatus, STATUS_LABEL, type LessonStatus } from "../store/progress";

const STATUS_TONE: Record<LessonStatus, string> = {
  "not-started": "text-ink-600",
  "in-progress": "text-warn",
  passed: "text-pass",
};

export function ModuleListPage() {
  const byLesson = useProgress((s) => s.byLesson);
  const passedCount = orderedLessons.filter(
    (l) => lessonStatus(byLesson, l.manifest.id) === "passed",
  ).length;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-ink-800 pb-4">
        <h1 className="text-lg font-semibold tracking-tight text-ink-100">Modules</h1>
        <p className="font-mono text-2xs uppercase tracking-wider text-ink-500">
          {passedCount}/{orderedLessons.length} lessons passed
        </p>
      </div>

      {modules.length === 0 ? (
        <p className="max-w-prose text-[14px] leading-6 text-ink-400">
          No lessons found. Add one under <code className="font-mono text-ink-200">content/</code> —
          the format is documented in{" "}
          <code className="font-mono text-ink-200">content/README.md</code>.
        </p>
      ) : null}

      <div className="space-y-8">
        {modules.map((module) => (
          <section key={module.id}>
            <h2 className="mb-2.5 flex items-baseline gap-2.5">
              <span className="font-mono text-2xs uppercase tracking-wider text-ink-600">
                {module.id}
              </span>
              <span className="text-[15px] font-semibold text-ink-100">{module.title}</span>
              <span className="text-2xs uppercase tracking-wider text-ink-600">
                {module.lessons.length} lesson{module.lessons.length === 1 ? "" : "s"}
              </span>
            </h2>

            <ol className="divide-y divide-ink-800 overflow-hidden rounded-md border border-ink-800">
              {module.lessons.map((lesson, i) => {
                const status = lessonStatus(byLesson, lesson.manifest.id);
                const progress = byLesson[lesson.manifest.id];
                return (
                  <li key={lesson.manifest.id}>
                    <Link
                      to={`/lesson/${lesson.manifest.id}`}
                      className="flex items-center gap-3 bg-ink-900/40 px-3.5 py-3 transition-colors hover:bg-ink-850"
                    >
                      <span className="w-6 shrink-0 font-mono text-2xs text-ink-600">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] text-ink-200">
                        {lesson.manifest.title}
                      </span>
                      <span className="hidden shrink-0 font-mono text-2xs text-ink-600 sm:block">
                        {lesson.manifest.estimateMin} min
                      </span>
                      <span
                        className={`w-24 shrink-0 text-right text-2xs uppercase tracking-wider ${STATUS_TONE[status]}`}
                      >
                        {status === "in-progress" && progress?.totalChecks
                          ? `${progress.passedChecks}/${progress.totalChecks} checks`
                          : STATUS_LABEL[status]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
