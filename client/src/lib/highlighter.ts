import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

import theme from "shiki/themes/github-dark-default.mjs";
import python from "shiki/langs/python.mjs";
import typescript from "shiki/langs/typescript.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import bash from "shiki/langs/bash.mjs";
import sql from "shiki/langs/sql.mjs";

/**
 * A single lazily-created Shiki highlighter shared by every code block.
 *
 * Grammars are imported explicitly rather than through Shiki's full bundle:
 * the full bundle ships every language it knows about, which is ~4 MB of
 * chunks for a course that only ever shows Python, TypeScript, and a little
 * shell/SQL.
 */
const LANGS = ["python", "typescript", "javascript", "json", "bash", "sql", "text"] as const;
export type SupportedLang = (typeof LANGS)[number];

const THEME = "github-dark-default";

let highlighterPromise: Promise<HighlighterCore> | null = null;

export function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [theme],
    langs: [python, typescript, javascript, json, bash, sql],
    engine: createOnigurumaEngine(() => import("shiki/wasm")),
  });
  return highlighterPromise;
}

export function normalizeLang(lang: string | undefined): SupportedLang {
  if (!lang) return "text";
  const lower = lang.toLowerCase();
  if (lower === "ts" || lower === "tsx") return "typescript";
  if (lower === "js" || lower === "jsx") return "javascript";
  if (lower === "py") return "python";
  if (lower === "sh" || lower === "shell") return "bash";
  return (LANGS as readonly string[]).includes(lower) ? (lower as SupportedLang) : "text";
}

export async function highlight(code: string, lang: string | undefined): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code.replace(/\n$/, ""), {
    lang: normalizeLang(lang),
    theme: THEME,
  });
}
