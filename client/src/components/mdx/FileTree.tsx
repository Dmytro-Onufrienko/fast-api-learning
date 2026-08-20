export interface FileTreeProps {
  /** Label for the tree's root, e.g. "server/". */
  root?: string;
  /** Slash-separated paths relative to `root`. */
  paths: string[];
  /** Subset of `paths` the learner actually edits — rendered with emphasis. */
  highlight?: string[];
}

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map() };
  for (const path of paths) {
    let current = root;
    const segments = path.split("/").filter(Boolean);
    segments.forEach((segment, i) => {
      const fullPath = segments.slice(0, i + 1).join("/");
      let child = current.children.get(segment);
      if (!child) {
        child = { name: segment, path: fullPath, children: new Map() };
        current.children.set(segment, child);
      }
      current = child;
    });
  }
  return root;
}

function renderNodes(
  nodes: TreeNode[],
  highlight: Set<string>,
  depth: number,
): JSX.Element[] {
  return nodes.flatMap((node) => {
    const isDir = node.children.size > 0;
    const isHighlighted = highlight.has(node.path);
    const children = [...node.children.values()].sort((a, b) => {
      const aDir = a.children.size > 0;
      const bDir = b.children.size > 0;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return [
      <li
        key={node.path}
        style={{ paddingLeft: `${depth * 1.1}rem` }}
        className={
          isHighlighted
            ? "text-ink-100"
            : isDir
              ? "text-ink-400"
              : "text-ink-300"
        }
      >
        <span className="select-none text-ink-600">{depth > 0 ? "└─ " : ""}</span>
        {node.name}
        {isDir ? "/" : ""}
        {isHighlighted ? (
          <span className="ml-2 rounded-sm bg-accent/15 px-1.5 py-px text-2xs uppercase tracking-wider text-accent">
            edit
          </span>
        ) : null}
      </li>,
      ...renderNodes(children, highlight, depth + 1),
    ];
  });
}

/** Renders the lesson's directory layout so the learner knows which file to open. */
export function FileTree({ root = ".", paths, highlight = [] }: FileTreeProps) {
  const tree = buildTree(paths);
  const topLevel = [...tree.children.values()].sort((a, b) => {
    const aDir = a.children.size > 0;
    const bDir = b.children.size > 0;
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="my-6 max-w-prose overflow-hidden rounded-md border border-ink-700/70 bg-ink-900">
      <div className="border-b border-ink-700/70 bg-ink-850 px-3 py-1.5">
        <span className="font-mono text-2xs uppercase tracking-wider text-ink-400">{root}</span>
      </div>
      <ul className="list-none space-y-0 p-3 pl-3 font-mono text-[13px] leading-6">
        {renderNodes(topLevel, new Set(highlight), 0)}
      </ul>
    </div>
  );
}
