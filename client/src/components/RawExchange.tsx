import type { RawExchange as RawExchangeData } from "@learn-fastapi/check-engine";

function formatBody(body: unknown): string | null {
  if (body === undefined || body === null) return null;
  if (typeof body === "string") return body;
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

function HeaderList({ headers }: { headers?: Record<string, string> }) {
  const entries = Object.entries(headers ?? {});
  if (entries.length === 0) return null;
  return (
    <dl className="mt-1.5 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 font-mono text-[12px]">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-ink-500">{key}:</dt>
          <dd className="break-all text-ink-400">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The raw request and response, always available — including on success.
 *
 * This is what turns the runner from a judge into a diagnostic tool: when a
 * check fails, the learner can see exactly what was sent and exactly what
 * came back without reaching for curl or the network tab. Collapsed by
 * default so it never competes with the pass/fail summary.
 */
export function RawExchangePanel({ raw }: { raw: RawExchangeData }) {
  const requestBody = formatBody(raw.request?.body);
  const responseBody = formatBody(raw.response?.body);

  return (
    <details className="group mt-3 rounded border border-ink-800 bg-ink-950/40">
      <summary className="cursor-pointer select-none list-none px-2.5 py-1.5 text-2xs uppercase tracking-wider text-ink-500 hover:text-ink-300">
        <span className="inline-block w-3 transition-transform group-open:rotate-90">›</span>
        Raw request &amp; response
      </summary>

      <div className="space-y-3 border-t border-ink-800 px-2.5 py-2.5">
        {raw.request ? (
          <section>
            <h4 className="text-2xs font-semibold uppercase tracking-wider text-ink-400">Request</h4>
            <p className="mt-1 break-all font-mono text-[12.5px] text-ink-200">
              <span className="text-accent">{raw.request.method}</span> {raw.request.url}
            </p>
            <HeaderList headers={raw.request.headers} />
            {requestBody ? (
              <pre className="mt-1.5 overflow-x-auto rounded bg-ink-900 p-2 font-mono text-[12.5px] leading-5 text-ink-300">
                {requestBody}
              </pre>
            ) : null}
          </section>
        ) : null}

        {raw.response ? (
          <section>
            <h4 className="text-2xs font-semibold uppercase tracking-wider text-ink-400">Response</h4>
            <p className="mt-1 font-mono text-[12.5px] text-ink-200">
              status <span className="text-accent">{raw.response.status}</span>
            </p>
            <HeaderList headers={raw.response.headers} />
            {responseBody ? (
              <pre className="mt-1.5 max-h-80 overflow-auto rounded bg-ink-900 p-2 font-mono text-[12.5px] leading-5 text-ink-300">
                {responseBody}
              </pre>
            ) : null}
          </section>
        ) : (
          <p className="font-mono text-[12.5px] text-ink-500">No response was received.</p>
        )}
      </div>
    </details>
  );
}
