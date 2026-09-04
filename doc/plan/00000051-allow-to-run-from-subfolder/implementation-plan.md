# Implementation plan — 00000051 A build that runs from a subfolder

## What this story is

A built copy of the game (`dist/`) must run when it is served from a
**subfolder** of a static host — `https://example.com/base-control/story-48/`
— as well as from a site root. The point is play-testing: several builds sit
side by side in their own folders, so a play-tester can compare versions or go
back to last week's without anything being torn down.

Today the built `index.html` points at `/assets/…` because Vite's default
`base` is `/`. A page fetched at `/story-48/` then asks the host for
`/assets/…` and gets a 404.

**The whole of the fix is one line of configuration**: `base: "./"` in
`vite.config.ts`. The work in this story is making that change with a comment
that stops it being undone, proving by hand that a built folder really does run
at any depth, and writing the one documentation note. Nothing about how the
game is played changes, and nothing about development changes.

### This story does not touch the ruleset

`doc/ruleset/rules.md` is untouched: no rule changes, **no version bump, no
`RULES_VERSION` change, no `doc/ruleset/changelog.md` entry, no tag**. If a step
seems to call for one, it is wrong — nothing here changes how the game is
played. (The guide's "check the rules document" requirement is discharged here,
deliberately, rather than by a step.)

### Accessibility (per `CLAUDE.md`)

No step tests accessibility and no step spends work on it. Nothing in this
story changes any rendered output, so nothing is lost and nothing goes in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

### Settled decisions that are not to be re-opened

These were fixed with the repository owner before planning began. A step that
finds one inconvenient should still implement it, and say so in its Notes.

1. **The change is `base: "./"` in `vite.config.ts` and nothing else in the
   build setup.** No second config, no environment variable, no extra npm
   script, no plugin.
2. **The dev server is not to be "fixed".** Vite 7.3.6 (the installed version)
   resolves a `base` of `""` or `"./"` to `/` whenever it is not building, so
   `npm run dev` and `npm run preview` are unaffected. If a step notices that
   the dev server still serves at `/`, that is the correct outcome, not a bug.
3. **`index.html` must not be edited.** Its `<script type="module"
src="/src/main.tsx">` is what the dev server needs, and Vite rewrites that
   reference when it builds the page. Making it relative would break `npm run
dev` and buy nothing.
4. **No version or build stamp.** A build carries nothing that says which
   version it is; this story does not add one, and changes nothing about how
   versions are maintained.
5. **No deployment automation.** No publish script, no CI workflow, no host
   chosen. Copying `dist/` into a folder is the whole deployment and stays a
   manual act.
6. **No routing, deep links or URL state.** The app stays one page.
7. **No storage namespacing.** Nothing is persisted anywhere in `src/` — no
   `localStorage`, `sessionStorage`, cookie or IndexedDB — so there is nothing
   two side-by-side builds could collide over. See "Follow-on work".
8. **The `README.md` is not changed.** The owner has ruled it out: where a
   built copy sits on a host is not player-facing, and the README's existing
   "served from any static file host" stays true. The note goes in
   `CONTRIBUTING.md` alone (**D8**).
9. **No review fixture and no committed test script.** The manual step tells
   the owner plainly what to type and what to look at; it does not add a file
   to the repository.

### Facts already established, so they are not rediscovered

- `vite.config.ts` currently sets `plugins`, `server` and `test`, and **no
  `base`**, so Vite's default `/` applies.
- The current `dist/index.html` emits
  `<script type="module" crossorigin src="/assets/index-<hash>.js">` and
  `<link rel="stylesheet" crossorigin href="/assets/index-<hash>.css">` — both
  root-absolute. With `base: "./"` these become `./assets/…`.
- `dist/` is in `.gitignore`, so no build output is ever committed.
- **Nothing else in the app assumes it is at the root.** No router; no runtime
  `fetch`; no `public/` folder; no web font, `@import` or any other external
  request from CSS; no asset referenced by path — the artwork is inline SVG,
  and the only `url(...)` in the code is the document-internal `url(#id)` form.
- **A relative base resolves against the page's own URL**, so the page must be
  fetched **with a trailing slash**: `/story-48/` + `assets/x.js` is
  `/story-48/assets/x.js`, but `/story-48` + `assets/x.js` is `/assets/x.js`,
  which is not there. That is a hosting condition, not something the build can
  fix (see **D5**).

---

## Where the work lands

| File              | What happens to it                                                                         | Step |
| ----------------- | ------------------------------------------------------------------------------------------ | ---- |
| `vite.config.ts`  | Gains one `base: "./"` setting with an explanatory comment in the file's established style | 1    |
| `CONTRIBUTING.md` | "Architecture constraints" gains a paragraph on the relative base and what it forbids      | 3    |

No file under `src/` changes. No test file changes. No dependency changes.

---

## Design decisions and reasoning

This plan is the only place these decisions are written down; `CONTRIBUTING.md`
forbids design history in code comments.

### D1 — A relative base, not an absolute one baked in per deployment

Vite offers `--base=/story-48/` on the build command, which would also make a
build work under `/story-48/`. It is rejected as the default because it ties a
build to the folder it was built for: every play-test copy would need its own
build, a copy moved or renamed would break, and the deployment step would stop
being "copy the folder". A relative base puts the folder name **nowhere in the
build**, so one `dist/` can be copied to any number of folders at any depth,
which is exactly the play-testing workflow the story asks for.

`--base` remains available on the command line for anyone who ever wants an
absolute path; setting `base` in the config does not remove that override.

### D2 — One setting, not a second build mode

Rejected: an environment variable, a `base` computed from `process.env`, a
second npm script, or a `mode`-conditional config. All of them create two ways
the app can be built and a second path to keep working, and buy nothing here:
the relative base is correct for **every** deployment this project has, root
included (see the manual checks in Step 2). One unconditional line has no mode
to maintain and no way to be built the wrong way by accident.

### D3 — The dev server and `npm run preview` are genuinely unaffected

Vite treats a relative base as build-only. In the installed Vite 7.3.6, config
resolution reads, in effect: if the configured base is `""` or `"./"`, the
resolved base is `"./"` when building and `"/"` otherwise. `vite preview`
resolves its config with the command `"serve"`, not `"build"`, so preview's
resolved base is `"/"` too — and the built page's relative `./assets/…` URLs
resolve against the page's own URL, which is the server root, so preview serves
the same files it always did.

(That resolution lives in Vite's bundled, minified `node_modules/vite/dist/node/chunks/config.js`;
the line number will move with any upgrade, so do not treat it as a citation to
maintain. The observable behaviour is what matters and Step 2 checks it by
hand.)

This is written down because it is the thing most likely to be "fixed" later by
someone who sees a relative base and assumes the dev server must need the same
treatment. Hence the comment required in Step 1.

### D4 — `index.html` is left exactly as it is

`<script type="module" src="/src/main.tsx">` is a dev-server URL: during `npm
run dev` the browser fetches the real source file from the server root, and at
build time Vite replaces the whole tag with the hashed, base-prefixed asset
references. Making it relative would break the dev server for no build-time
gain. This is settled decision 3 and must not be revisited by any step.

### D5 — The trailing slash is a hosting condition, documented not coded around

Because relative URLs resolve against the page's own URL, the page has to be
served **at a directory URL ending in `/`**. An S3 website endpoint already
does this (it redirects `/story-48` to `/story-48/` and serves the index
document); a CloudFront distribution over an S3 REST origin does not, because
its default root object applies only at the root, so it needs a rewrite rule
appending `index.html`. Either way it is a one-time host setting, the same for
every uploaded version. Nothing in the build can fix it, so nothing in the
build tries: it is recorded in `CONTRIBUTING.md` (Step 3) and checked by hand
in Step 2, which opens the URL **with** the trailing slash.

### D6 — No automated test asserts the base

Two candidates were considered and rejected:

- **A unit test importing `vite.config.ts` and asserting `base === "./"`.** It
  would assert a constant against itself, and it would drag the config file
  into the app's TypeScript project: tests under `src/` are typechecked by
  `tsconfig.app.json` while `vite.config.ts` belongs to `tsconfig.node.json`,
  and having one file in two composite projects is exactly the kind of build
  breakage not worth taking on for a tautology.
- **A test that runs a build and greps the output.** `npm test` is a fast,
  in-process suite (`vitest run` over `src/**`); making it shell out to a full
  `tsc -b && vite build` would multiply its runtime for one assertion.

What guards the setting instead is the comment in `vite.config.ts` (Step 1),
the `CONTRIBUTING.md` constraint (Step 3), and Step 1's build-output check run
at implementation time. If the base is ever silently reverted, the symptom is
loud and immediate: the next play-test build 404s.

### D7 — The manual checks are one gate, not six

The guide prefers a step per verification point, but every check in Step 2 is
an observation of the **same artifact** in one sitting: build once, copy it
about, look at it in one browser session. Splitting them would pause the
pipeline for the owner five extra times over the same `dist/`. Step 2 is
therefore a single gate with a numbered checklist and an explicit pass
condition for each item.

### D8 — The documentation note is technical, so it goes only in `CONTRIBUTING.md`

The owner has ruled the `README.md` out of this story: the README is
player-facing (`CLAUDE.md`: "the primary audience is players"), and where a
built copy is put on a host is not something a player needs to know. Its
Development section already says the app "can be served from any static file
host", which stays true and sufficient.

`CONTRIBUTING.md` gets the whole of the note, in "Architecture constraints":
the build uses a relative base, what that buys, that the page must be served at
a URL ending in `/`, and that this is why nothing in the app may reach for a
root-absolute URL.

---

## Step 1 — `vite.config.ts` sets a relative base

Status: committed

Notes: Added `base: "./"` before `plugins`, with a comment covering the three
required points (per-version subfolders / play-testing, dev server unaffected,
`--base` override still available). No other file touched. All five
verification checks passed: typecheck, lint, format:check and the full test
suite (898 tests) succeeded unchanged; `rm -rf dist && npm run build`
succeeded; `dist/index.html`'s script `src` and stylesheet `href` both read
`./assets/…`; the `"/assets` grep across `dist/index.html` and
`dist/assets/*.{js,css}` returned nothing; `git status --porcelain` shows only
`vite.config.ts` modified. No deviations from the plan.

Add a single `base: "./"` entry to the config object exported from
`vite.config.ts`, alongside the existing `plugins`, `server` and `test` keys.
Place it before `plugins` (Vite's own convention is that `base` is a top-level
project setting, and the file reads better with the one-line setting ahead of
the three blocks). Change nothing else in the file.

Above it, write a comment in the file's established style — the existing
comments explain _why_ a setting is what it is, in full sentences, wrapped to
the file's width. The comment must say:

- built pages are handed out from per-version subfolders so several builds can
  be play-tested side by side, and a relative base lets one build run wherever
  it is put, with the folder name nowhere in the output;
- **the dev server is not affected**: Vite resolves a relative base to `/`
  whenever it is not building, so `npm run dev` and `npm run preview` still
  serve at the root — nobody should "fix" this back;
- `--base=/some/path/` on the build command still overrides it.

Do not write story numbers, plan-step references or rejected alternatives into
the comment (`CONTRIBUTING.md`, "Comments"); the reasoning lives in this plan.

**Do not edit `index.html`.** Its `src="/src/main.tsx"` is what the dev server
needs and Vite rewrites it at build time (settled decision 3, **D4**). Do not
add an npm script, an environment variable, or a second config.

Depends on: nothing.

Verification (automated):

1. `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
   all pass, unchanged from before the edit.
2. `rm -rf dist && npm run build` succeeds.
3. `grep -n "assets/" dist/index.html` shows the script `src` and the
   stylesheet `href` both beginning `./assets/`.
4. `grep -n '"/assets' dist/index.html dist/assets/*.js dist/assets/*.css`
   returns **nothing** — no root-absolute asset URL survives anywhere in the
   output.
5. `git status --porcelain` shows only `vite.config.ts` modified (`dist/` is
   gitignored), so the commit for this step contains exactly the config
   change.

---

## Step 2 — GATE: the owner runs a build from a subfolder, from the root, and side by side

Status: committed

Notes: Passed. One `dist/` was copied to `/tmp/serve/{a/b,one,x/y/z,other}` and
to `/tmp/serve` itself, served with `python3 -m http.server 8080 --directory
/tmp/serve`. The owner ran all the location variants — the nested subfolder,
the other depths, the server root, the two sibling builds loaded one after the
other — plus the dev server and `npm run preview`, and confirmed the game loads
and plays in each. The owner chose **not** to play a full game through to the
game-over panel: the app runs entirely in the browser with no request after
load, so once the first few moves played correctly there was nothing further
the location could affect. The no-trailing-slash case (item 7) behaved as
predicted: `python3 -m http.server` answers `/a/b` with a 301 to `/a/b/`.
Nothing was observed that the plan did not predict.

No code changes. This is the story's real proof, and it needs a browser and a
person: the owner serves one built copy from several locations and confirms the
game loads and plays in each.

Nothing is added to the repository for this — no script, no fixture. The
commands below are typed ad hoc in a scratch directory outside the working
tree. `python3` (3.11) is available in the dev container.

Suggested setup, from the repository root:

- `npm run build`
- make a scratch directory, e.g. `mkdir -p /tmp/serve/a/b`, and copy the build
  into it: `cp -r dist/* /tmp/serve/a/b/`
- serve the scratch directory: `python3 -m http.server 8080 --directory /tmp/serve`
- for the sibling-builds check, copy the same `dist/` a second time to
  `/tmp/serve/other/` (a second, differently-built copy is fine too, but not
  required — the check is that loading one does not disturb the other)

The checklist, each with its pass condition:

1. **Dev server unchanged.** `npm run dev`, open the dev server at its root,
   play a few turns. Pass: the game loads and plays exactly as before; the
   page's URL is the server root, not a subfolder.
2. **Nested subfolder.** Open `http://<host>:8080/a/b/` (with the trailing
   slash). Pass: the game loads; the browser's network log shows **no 404**;
   the assets are fetched from `/a/b/assets/…`. Play a **full game through to
   the game-over panel** — the story asks for a complete game here, not a
   glance.
3. **A different depth, no rebuild.** Copy the same `dist/` to
   `/tmp/serve/one/` and to `/tmp/serve/x/y/z/`, and open each with a trailing
   slash. Pass: both load and play; nothing was rebuilt between them.
4. **The server root.** Copy the same `dist/` to a scratch directory served at
   its root and open `http://<host>:8080/`. Pass: the game loads and plays —
   the relative base must not trade one location for the other.
5. **Two builds side by side.** With copies at `/a/b/` and `/other/`, load one,
   then the other, in the same browser. Pass: each loads and plays normally;
   neither disturbs the other.
6. **`npm run preview`.** Pass: it still starts and serves a playable game at
   its root.
7. **Trailing slash, for information.** Open `http://<host>:8080/a/b` _without_
   the slash. Expected: `python3 -m http.server` redirects to `/a/b/` and the
   game loads. This is the hosting condition from **D5**, recorded so the owner
   sees the behaviour a host must provide; a host that does not redirect needs
   a rewrite rule, which is a host setting and not a defect in this build.

If any item fails, set this step's Status to `blocked`, record what was
observed in its Notes, and stop — do not proceed to the documentation step,
since Step 3 documents behaviour this gate is what proves.

Depends on: Step 1 (there is nothing to serve until the base is relative).

Verification (manual): the seven checks above, all passing, confirmed by the
owner. Record in this step's Notes which items were run and anything observed
that the plan did not predict.

---

## Step 3 — `CONTRIBUTING.md`

Status: committed

Notes: Added one paragraph to "Architecture constraints" immediately after the
opening "front-end only … deployable from any static file host" paragraph,
covering the relative base and what it buys, the trailing-slash hosting
condition (with the S3 website endpoint / CloudFront-over-S3-REST-origin
example), the resulting no-root-absolute-URL rule, and that the dev server and
`npm run preview` are unaffected. `README.md` untouched. Typecheck, lint,
format:check and the full test suite (898 tests) all passed; `git diff
--name-only` lists only `CONTRIBUTING.md`; the `base` grep shows the new
paragraph. No deviations from the plan.

Write the documentation note. **`README.md` is not touched** (**D8**), and
neither is anything else in the repository.

**`CONTRIBUTING.md`, "Architecture constraints"** — add a paragraph after the
opening "front-end only … deployable from any static file host" paragraph,
which it extends. In the section's existing voice, it says:

- the build uses a **relative base** (`base: "./"` in `vite.config.ts`), so a
  built `dist/` runs wherever it is put — a site root or any depth of
  subfolder — with the folder name nowhere in the output; this is what lets
  several play-test builds sit side by side on one host;
- the built page must therefore be served at a URL **ending in `/`**, which is
  a one-time host setting (an S3 website endpoint does this already; a
  CloudFront distribution over an S3 REST origin needs a rewrite appending
  `index.html`);
- consequently **nothing in the app may reach for a root-absolute URL** — no
  asset referenced as `/something`, no `fetch("/…")`, no root-absolute link.
  Assets are bundled by Vite or inline; anything else would break the moment
  the app is served from a subfolder;
- the dev server is unaffected: Vite resolves a relative base to `/` when it is
  not building, so `npm run dev` and `npm run preview` serve at the root as
  they always have. (This sentence is the one that stops a future reader
  "fixing" the setting.)

Do not restate the design alternatives from this plan; `CONTRIBUTING.md` states
the constraint, not its history.

Depends on: Steps 1 and 2 (the documentation states behaviour Step 1 creates
and Step 2 has confirmed).

Verification (automated):

1. `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
   all pass.
2. `git diff --name-only` for this step lists **only** `CONTRIBUTING.md` — the
   `README.md` must be untouched.
3. `grep -n "base" CONTRIBUTING.md` shows the new paragraph.
4. A read-through confirms the paragraph sits in "Architecture constraints",
   reads in that section's voice, and states the no-root-absolute-URL
   constraint explicitly.

---

## Follow-on work (not this story)

- **Showing which version is being played.** A build carries no visible version
  or build stamp. If handing out several builds turns out to need one, that is
  its own story; this one changes nothing about how versions are maintained.
- **Namespacing stored state.** Nothing is persisted today, so nothing can
  collide between two builds sharing an origin. The day the app stores anything
  — a saved game, a chosen option, a recorded game — that story must place the
  storage key **under the build**, not the origin, or two side-by-side
  play-test builds will read each other's state.
- **Deployment automation.** Copying `dist/` into a folder stays manual.
- **Opening `dist/index.html` from the file system.** A relative base gets the
  URLs right, but browsers refuse ES modules over `file://`, so a built page
  still needs an HTTP server. Not a goal.
