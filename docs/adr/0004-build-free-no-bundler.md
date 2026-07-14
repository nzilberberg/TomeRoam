# 0004 — Build-free: no bundler, classic-script modules, no-build type checking

**Status:** Accepted

## Context

The app is a solo project deployed to GitHub Pages. A bundler/transpiler
toolchain adds a compile step, a dependency surface, and a class of "works in dev
/ broken in prod" failures — for a single-author static site whose whole point is
"just push."

## Decision

The shipped app is **static files with no build step**. Modules are classic
`<script>` files that publish their public surface on the global object
(`window.X = X`), loaded in order from `index.html`. No `import`/`export` in
shipped code (yet), no bundler.

Type safety is retrofitted **without a build**: files opt in with a top
`// @ts-check` comment and `npm run typecheck` runs `tsc --noEmit` over them. The
app ships zero TypeScript and gains no runtime dependency — the same dev-only
posture as ESLint. See `jsconfig.json` and `types/globals.d.ts`.

## Consequences

- Deploy is literally "commit and push"; GitHub Pages serves the repo as-is.
- **Footgun:** a bare `const X = (()=>…)()` in a classic script is a *lexical*
  global, **not** `window.X`. Modules read via `window.X` MUST end with
  `if (typeof window !== 'undefined') window.X = X;`. Omitting it caused a
  multi-day offline-subsystem outage (every `window.Store/Net/…` was undefined).
- Type checking is incremental: pure kernels first, then module by module, with
  cross-file globals declared in `types/globals.d.ts`. Full ESM is a possible
  later phase but carries a WebView JS-MIME gotcha, so it's deferred.
- Because scripts share globals, ESLint deliberately does **not** enable
  `no-undef`; the high-signal `const`/unused-vars family is what has caught real
  bugs here.
