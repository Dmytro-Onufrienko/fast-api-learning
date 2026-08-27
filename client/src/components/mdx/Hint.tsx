import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Progressively revealed hints, written one per element:
 *
 *   <Hint>Declaration order matters here.</Hint>
 *   <Hint>`StrEnum` lives in the standard library.</Hint>
 *
 * A learner who wants a nudge must not accidentally read the third hint while
 * reading the first, so only one "Show hint" affordance is ever visible. That
 * is the whole difficulty: the hints are siblings in the MDX with no wrapper
 * element to hold shared state, so they coordinate through a context that
 * <HintGroup> puts around the lesson's theory.
 *
 * Each hint registers itself on mount and takes its position from the
 * registration order, which React runs in document order for siblings.
 * Outside a group (a stray hint somewhere else in the app) it degrades to a
 * self-contained show/hide, so it is never simply invisible.
 */

interface HintGroupValue {
  register: (id: string) => void;
  order: string[];
  revealed: number;
  revealNext: () => void;
}

const HintGroupContext = createContext<HintGroupValue | null>(null);

export function HintGroup({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(0);

  const value = useMemo<HintGroupValue>(
    () => ({
      // Ignores an id that is already known, so React 18's double-invoked
      // effects in development do not register a hint twice.
      register: (id) => setOrder((current) => (current.includes(id) ? current : [...current, id])),
      order,
      revealed,
      revealNext: () => setRevealed((n) => n + 1),
    }),
    [order, revealed],
  );

  return <HintGroupContext.Provider value={value}>{children}</HintGroupContext.Provider>;
}

export interface HintProps {
  children: ReactNode;
}

export function Hint({ children }: HintProps) {
  const group = useContext(HintGroupContext);
  return group ? (
    <GroupedHint group={group}>{children}</GroupedHint>
  ) : (
    <StandaloneHint>{children}</StandaloneHint>
  );
}

function GroupedHint({ group, children }: { group: HintGroupValue; children: ReactNode }) {
  const id = useId();
  const { register, order, revealed, revealNext } = group;

  useEffect(() => {
    register(id);
  }, [register, id]);

  const index = order.indexOf(id);

  // One frame between mount and registration; rendering nothing avoids a
  // "Show a hint" button that flashes into a different position.
  if (index === -1) return null;

  if (index < revealed) {
    return <RevealedHint number={index + 1} total={order.length}>{children}</RevealedHint>;
  }

  // Only the next unrevealed hint offers the affordance.
  if (index !== revealed) return null;

  return (
    <div className="my-4 max-w-prose">
      <button
        type="button"
        onClick={revealNext}
        className="rounded border border-ink-600 px-2.5 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100"
      >
        {index === 0 ? "Show a hint" : "Show next hint"}
        <span className="ml-2 text-2xs text-ink-500">
          {index + 1}/{order.length}
        </span>
      </button>
    </div>
  );
}

function StandaloneHint({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open) return <RevealedHint>{children}</RevealedHint>;
  return (
    <div className="my-4 max-w-prose">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-ink-600 px-2.5 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100"
      >
        Show a hint
      </button>
    </div>
  );
}

function RevealedHint({
  number,
  total,
  children,
}: {
  number?: number;
  total?: number;
  children: ReactNode;
}) {
  return (
    <div className="my-4 max-w-prose rounded-md border border-ink-700/70 bg-ink-900/60 p-4">
      <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-400">
        {number && total ? `Hint ${number} of ${total}` : "Hint"}
      </p>
      <div className="text-[14px] leading-6 text-ink-300 [&>p]:m-0">{children}</div>
    </div>
  );
}
