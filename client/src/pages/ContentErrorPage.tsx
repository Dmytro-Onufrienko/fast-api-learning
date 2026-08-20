/**
 * Shown instead of the app when content fails to load — a malformed
 * manifest, a missing lesson.mdx, a duplicated lesson id. Failing loudly is
 * the point: a silently skipped lesson is how content rot goes unnoticed.
 */
export function ContentErrorPage({ error }: { error: Error }) {
  return (
    <div className="min-h-dvh bg-ink-950 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-sm font-semibold uppercase tracking-wider text-fail">
          Content failed to load
        </h1>
        <p className="mt-2 max-w-prose text-[14px] leading-6 text-ink-300">
          One or more files under <code className="font-mono text-ink-100">content/</code> are
          invalid, so the app refuses to start rather than silently hiding a broken lesson. Fix the
          problem below and the dev server will reload automatically.
        </p>
        <pre className="mt-4 overflow-auto rounded-md border border-fail/30 bg-ink-900 p-4 font-mono text-[13px] leading-6 text-ink-200">
          {error.message}
        </pre>
        <p className="mt-4 text-[13px] text-ink-500">
          The manifest format is documented in{" "}
          <code className="font-mono text-ink-300">content/README.md</code>.
        </p>
      </div>
    </div>
  );
}
