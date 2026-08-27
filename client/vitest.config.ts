import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";

// The mdx plugin is here for the same reason it is in vite.config.ts: the
// lesson render test imports real lesson.mdx files, and without it they would
// arrive as raw text instead of components.
//
// Scoped to src/ on purpose: packages/check-engine has its own vitest project
// and `pnpm test` recurses into it, so an unscoped include would run those
// tests twice and report inflated numbers.
export default defineConfig({
  plugins: [{ enforce: "pre", ...mdx() }, react({ include: [/\.tsx?$/, /\.mdx?$/] })],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
