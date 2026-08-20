import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { modules } from "../content/registry";
import { useProgress, lessonStatus, type LessonStatus } from "../store/progress";

const STATUS_TONE: Record<LessonStatus, string> = {
  "not-started": "bg-ink-700",
  "in-progress": "bg-warn",
  passed: "bg-pass",
};

function StatusPip({ status }: { status: LessonStatus }) {
  return (
    <span
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_TONE[status]}`}
      aria-hidden="true"
    />
  );
}

function Sidebar() {
  const byLesson = useProgress((s) => s.byLesson);
  const { lessonId } = useParams();

  return (
    <nav
      aria-label="Lessons"
      className="hidden w-64 shrink-0 overflow-y-auto border-r border-ink-800 bg-ink-900/40 lg:block"
    >
      <ol className="p-3">
        {modules.map((module) => (
          <li key={module.id} className="mb-5 last:mb-0">
            <p className="mb-1.5 flex items-baseline gap-2 px-2 text-2xs font-semibold uppercase tracking-wider text-ink-500">
              <span className="font-mono text-ink-600">{module.id}</span>
              {module.title}
            </p>
            <ol>
              {module.lessons.map((lesson) => (
                <li key={lesson.manifest.id}>
                  <NavLink
                    to={`/lesson/${lesson.manifest.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded px-2 py-1.5 text-[13px] transition-colors ${
                        isActive || lessonId === lesson.manifest.id
                          ? "bg-ink-800 text-ink-100"
                          : "text-ink-400 hover:bg-ink-850 hover:text-ink-200"
                      }`
                    }
                  >
                    <StatusPip status={lessonStatus(byLesson, lesson.manifest.id)} />
                    <span className="truncate">{lesson.manifest.title}</span>
                  </NavLink>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AppShell() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b border-ink-800 bg-ink-900/60 px-4 py-2.5">
        <Link
          to="/"
          className="font-mono text-[13px] font-semibold tracking-tight text-ink-100 hover:text-white"
        >
          learn<span className="text-accent">-</span>fastapi
        </Link>
        <p className="hidden text-2xs uppercase tracking-wider text-ink-500 sm:block">
          FastAPI for TypeScript developers
        </p>
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-2xs uppercase tracking-wider text-ink-500 transition-colors hover:text-ink-300"
        >
          /docs ↗
        </a>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
