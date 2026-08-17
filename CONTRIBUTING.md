# Contributing

## Development environment

The repository ships a [VS Code Dev Container](.devcontainer/) as the **only**
supported development environment. With Docker and the VS Code **Dev
Containers** extension installed, open the repository and choose **Reopen in
Container**. The container provisions everything on first build: Node 22, the
project's dependencies, and the linting/formatting/testing toolchain.

Nothing is installed on the host, deliberately. The host has no Node, no npm,
and no toolchain — the container is the isolation boundary, and the whole
toolchain lives inside it.

Personal environment variables (e.g. `TZ=America/Vancouver`) can be set
container-wide in `.devcontainer/devcontainer.env` — one `KEY=VALUE` per line.
To get started, rename (or copy)
[`devcontainer.env.example`](.devcontainer/devcontainer.env.example) to
`devcontainer.env`, edit it, and rebuild the container. The file is gitignored
and created empty on first container start if absent, so it is entirely
optional.

## Toolchain

Run from the container terminal, from the repository root:

```bash
npm run dev           # start the Vite dev server (forwarded to the host on :5273)
npm run typecheck     # type check (tsc)
npm run lint          # lint (eslint)
npm run format:check  # formatting check (prettier); `npm run format` to fix
npm test              # run the test suite (vitest)
npm run build         # type check + production build into dist/
```

Type check, lint, formatting check, and tests should all pass clean before a
change is submitted.

Linting includes [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)'s
recommended rules on every `.tsx` file, catching common accessibility mistakes
(missing labels, misused ARIA attributes, and the like) in static markup.

Two `no-restricted-*` rules encode project constraints that would otherwise be
invisible: `node:*` imports are banned outside test files (the app is
front-end only), and `Math.random` is banned outright (game randomness must
come from the seeded generator, so records replay exactly).

## Testing

Vitest runs in the `node` environment by default, because most tests are pure
logic and do not need a DOM. A test that needs one opts in per file with a
docblock on the first line:

```ts
// @vitest-environment jsdom
```

Component and interaction behaviour — ARIA roles, keyboard navigation, focus
management, live-region content — is tested with **Testing Library** and
`@testing-library/user-event`, and static accessibility violations are checked
with **axe-core** directly (rather than a thin wrapper package, per the
dependency policy below).

A jsdom test file follows this recipe:

```tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);
```

- The docblock must be the file's first line.
- Import `@testing-library/jest-dom/vitest` directly in every DOM test file
  rather than adding a `setupFiles` entry to `vite.config.ts`: a global setup
  file would also load into the `node`-environment pure tests, and per-file
  imports keep the dependency visible where it is used.
- Import `cleanup` from `@testing-library/react` and call it in `afterEach`.
  `vite.config.ts` does not set `test.globals: true`, so Testing Library's
  automatic cleanup never registers itself; without this line, renders from
  earlier tests in the same file stay mounted, and the symptom is not an
  obvious one — axe reports spurious violations (typically a duplicate
  landmark) from a test that never touched the element axe is complaining
  about.
- When running axe, disable the `color-contrast` rule: `jsdom` has no layout
  or canvas, so the rule cannot produce a meaningful result and instead prints
  a `HTMLCanvasElement.prototype.getContext` "not implemented" error to stderr
  on every run.

Automated coverage does not replace the manual gates. Anything about how the
game _looks_ or _feels_, and real screen-reader behaviour, is verified by hand
against a keyboard and a screen reader before a change ships.

Independently of what can be tested through the DOM, prefer to keep logic
**out** of components: accessible-name and announcement wording, navigation and
focus arithmetic, and the game's own turn/board state all belong in plain
modules with plain unit tests. That is a design preference, not a workaround.

## Comments

Comments describe **what** a module or a piece of code does — its
responsibility and its contract. Keep them proportionate: a short module header
saying what the module is for, and inline comments only where the code is not
self-evident.

Do not write design history into the code. No story numbers, no references to
plan steps or decisions, no record of approaches that were considered and
rejected. That material belongs in `doc/plan/`, which is where a reader will
look for it. Code that accumulates its own changelog becomes unreadable.

## Dependencies

- **Node/TypeScript**, current LTS Node and modern language standards.
- Prefer **major, well-maintained libraries**; do not add small or personal
  third-party packages.
- Exact dependency versions are pinned by `package-lock.json`, which is
  committed. Dependency bumps should be deliberate commits of their own, with
  a note on why.

## Architecture constraints

The app is **front-end only**: a static single-page application with no backend
API, deployable from any static file host. Every feature must run entirely in
the browser.

The ruleset lives in this repository at
[`doc/ruleset/rules.md`](doc/ruleset/rules.md) and is the single source of
truth. Rule logic in `src/` implements it and never restates or extends it.

Rules are versioned by a single number, not by parallel folders: a rules change
rewrites the rule logic in place, bumps `rules.md`'s version and the
`RULES_VERSION` constant together, and is tagged `rules-<version>` on `main`
once merged. There is **no backwards compatibility** — an old game is replayed
by checking out the tag it was played under.

Because the game has a random element, the rules layer owns a **seeded**
random source, and the seed is recorded with a game so it replays exactly. No
game logic may reach for ambient randomness.
