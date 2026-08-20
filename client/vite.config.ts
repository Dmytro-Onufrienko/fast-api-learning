import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import path from "node:path";


export default defineConfig({
  plugins: [
    // MDX must run before the React plugin so the JSX it emits gets the
    // usual Fast Refresh treatment.
    //
    // Deliberately no `providerImportSource`: lesson.mdx files live under
    // content/, outside client's node_modules, so a provider import would
    // not resolve from there. Components are passed explicitly instead —
    // see LessonPage's <Theory components={mdxComponents} />.
    { enforce: "pre", ...mdx() },
    react({ include: [/\.tsx?$/, /\.mdx?$/] }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    watch: {
      // Bind-mounted FS events don't propagate reliably on macOS/Windows.
      usePolling: true,
    },
    fs: {
      // content/ now lives inside this project root, so the default allow
      // list already covers it. Kept explicit so the content loader's
      // requirement stays visible if the layout moves again.
      allow: [__dirname],
    },
    proxy: {
      // Everything the check runner and lesson endpoints touch goes through
      // here. From the browser's point of view every request is same-origin,
      // so CORS never enters the picture — which is deliberate: CORS gets
      // its own lesson later, and a CORSMiddleware bolted onto the learner
      // template would spoil it.
      "/api": {
        target: process.env.API_TARGET ?? "http://server:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
      // The dev-only pytest/bootstrap runner, proxied unrewritten.
      "/__runner": {
        target: process.env.API_TARGET ?? "http://server:8000",
        changeOrigin: true,
      },
      // FastAPI's generated schema, used by `openapi`-level checks.
      "/openapi.json": {
        target: process.env.API_TARGET ?? "http://server:8000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
