import type { ReactNode } from "react";

export interface GotchaProps {
  title?: string;
  children: ReactNode;
}

/** Callout for a trap: mutable default arguments, a too-loose type annotation, and friends. */
export function Gotcha({ title = "Gotcha", children }: GotchaProps) {
  return (
    <aside className="my-6 max-w-prose rounded-md border border-warn/30 bg-warn/[0.06] p-4">
      <p className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-warn">
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 shrink-0 fill-current"
          aria-hidden="true"
        >
          <path d="M8 1.5 15 14H1L8 1.5Zm0 4a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0v-3A.75.75 0 0 0 8 5.5Zm0 6.5a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z" />
        </svg>
        {title}
      </p>
      <div className="text-[14px] leading-6 text-ink-300 [&>*+*]:mt-3">{children}</div>
    </aside>
  );
}
