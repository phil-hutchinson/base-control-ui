# Story 00000051 — A build that runs from a subfolder

## Summary

A built copy of the game must run correctly when it is served from a
**subfolder** of a static host rather than from the site root — from
`https://example.com/base-control/story-48/`, say, as happily as from
`https://example.com/`.

The point is play-testing. Several builds put side by side in their own
folders can be handed out at once, so a play-tester can compare two versions,
or go back to the one they were playing last week, without anything being
torn down and redeployed. Nothing about how the game plays changes, and
nothing about development changes: `npm run dev` goes on serving the app at
the root of the dev server, exactly as it does today.

## Background & references

The app is front-end only and deploys as a folder of static files
(`CONTRIBUTING.md`, "Architecture constraints"). What stops that folder from
working under a subfolder today is Vite's default `base` of `/`: the built
`index.html` points at `/assets/…`, so a browser asked for the page at
`/story-48/` fetches the script from `/assets/…` and gets the host's 404
instead.

Facts established while writing this story, so they are not rediscovered:

- **`vite.config.ts` sets no `base`**, so the default `/` applies.
- **Vite treats a relative `base` as build-only.** With `base: "./"`, the
  build emits relative asset URLs, and the dev server still serves at `/` —
  Vite resolves a `base` of `""` or `"./"` to `/` when it is not building
  (confirmed in the installed Vite 7.3.6). So one setting gets the deployable
  build without a second mode to maintain, and `--base=/some/path/` on the
  build command still overrides it for anyone who wants an absolute path.
- **`index.html`'s `<script src="/src/main.tsx">` does not need editing.**
  Vite rewrites that reference when it builds the page; the absolute form is
  what the dev server wants.
- **Nothing else in the app assumes it is at the root.** There is no router
  and no deep linking — the whole app is one page. There are no runtime
  `fetch` calls, no web font or other external request (`src/index.css` says
  so explicitly), no `public/` folder, and no asset referenced by path: the
  artwork is inline SVG. The only `url(...)` in the code is the SVG
  `url(#id)` form, which is document-internal.
- **A relative base resolves against the page's own URL**, so the page has to
  be fetched **with a trailing slash**: `/story-48/` plus `assets/x.js` is
  `/story-48/assets/x.js`, but `/story-48` plus `assets/x.js` is
  `/assets/x.js`, which is not there. This is a hosting condition, not
  something the build can fix, and it is the same condition for every version
  uploaded. An S3 website endpoint already satisfies it — it redirects
  `/story-48` to `/story-48/` and serves the index document. A CloudFront
  distribution over an S3 REST origin does not: its default root object
  applies only at the root, so directory URLs need a rewrite rule appending
  `index.html`. Either way it is a one-time setting on the host.
- **Nothing is persisted**, so two builds sharing an origin cannot collide
  over stored state: there is no `localStorage`, `sessionStorage`, cookie or
  IndexedDB use anywhere in `src/`.

Taken together, the whole of the fix is one config line; the work in this
story is proving that, documenting it, and confirming nothing else broke.

## In scope

### 1. The build's base

`vite.config.ts` sets `base: "./"`, with a comment in the file's established
style saying why: built pages are handed out from per-version subfolders so
several can be play-tested side by side, and a relative base makes one build
run wherever it is put. The comment should note that the dev server is
unaffected, so nobody later "fixes" it back.

### 2. Documentation

- **`README.md`** — the Development section already says the app "can be
  served from any static file host". It picks up that a built copy runs from
  a subfolder as well as from a site root, so several versions can sit side
  by side. Player-facing wording, one sentence; run `/update-readme` for the
  rest of the diff.
- **`CONTRIBUTING.md`** — the "Architecture constraints" section gains the
  technical half: the build uses a relative base, what that buys, and that
  it is why nothing in the app may reach for a root-absolute URL.

## Out of scope

- **Opening `dist/index.html` from the file system.** A relative base gets
  the URLs right, but browsers refuse ES modules over `file://`, so the built
  page still needs an HTTP server. Making the game run from a bare file is
  not a goal.
- **Any deployment automation** — no publish script, no CI workflow, no host
  chosen. Copying `dist/` into a folder is the whole deployment, and it stays
  a manual act.
- **Showing which version is being played.** A build carries no visible
  version or build stamp, and this story does not add one. If play-testing
  turns out to need it, that is its own story.
- **Routing, deep links, or shareable game URLs.** The app is one page with
  no URL state, and stays that way.
- **Namespacing stored state.** Nothing is stored, so there is nothing to
  namespace. This becomes real the day the app persists anything — a saved
  game, a chosen option, a recorded game — and that story will have to place
  the storage key under the build, not the origin.

## Verification

- `npm run dev` still serves the game at the dev server's root and it plays
  normally — the change must be invisible in development.
- `npm run build` succeeds, and the emitted `dist/index.html` references its
  script and stylesheet by relative URL, not by a path starting with `/`.
- Served over HTTP from a **nested subfolder** — for example `dist/` copied
  to `a/b/` under a scratch directory, served from that directory with
  `python3 -m http.server`, and opened at `/a/b/` — the game loads with no
  404s in the network log and a full game can be played through to the
  game-over panel.
- The same folder served at a **different depth** — one level down, three
  levels down — works without rebuilding: the folder name is nowhere in the
  build.
- Served from the **root** of that same server, the game still loads and
  plays: the relative base must not trade one location for the other.
- Two builds in sibling folders can be loaded one after the other in the same
  browser without interfering with each other.
- `npm run preview` still works.
- Typecheck, lint, format check and the whole test suite pass, unchanged.
