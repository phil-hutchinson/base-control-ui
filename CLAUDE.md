# Claude project context

## Project

This repository is the web app for **Base Control**: a two-player, space-themed
board game in which each side manoeuvres a fleet of seven ships to occupy
contested nodes and collect energy. It is not a pure-strategy game — which
node site wakes up next is random.

The app is a **front-end only** TypeScript/React single-page application — no
backend API; it must be deployable from a static file host.

## The rules live here

`doc/ruleset/rules.md` is the single source of truth for how the game is
played, and `doc/ruleset/changelog.md` records every change to it. Unlike a
project whose rules come from elsewhere, **this repository owns the ruleset**:
the app is where new rules get tried first, and the document is expected to
change often.

Rule logic in `src/` implements that document. It never redefines the rules,
and it never carries a rule the document does not state. When the two disagree,
the document is right.

### Rules versioning

`rules.md` carries a version number, mirrored by a single `RULES_VERSION`
constant in the code, with a test asserting the two agree so they cannot
drift. A rules change bumps both in its own commit, together with a
`changelog.md` entry.

**Tagging is on hold until the game plays.** Once a ruleset commit is on
`main` it may be tagged `rules-<version>` (the `/tag-rules` command does
this) — but not yet. The rules move too often while the app is still being
built up story by story, and a tag is only worth having once a recorded game
can be replayed against the ruleset it was played under. Until then, bump the
version and write the changelog entry as usual, and do not tag.

**Only gameplay changes earn a tag.** When tagging does resume, it is for
versions that change how the game is _played_ — a new rule, a changed number,
a different legal move. A version that only rewords, clarifies, or adjusts
flavour text is not tagged, because a game recorded under it replays
identically against the last gameplay-affecting tag. Every rules change still
bumps the version and writes a changelog entry; not every version gets a tag,
so the tags are deliberately sparser than the version history.

**There is no backwards compatibility.** Rule logic is rewritten in place, not
versioned into parallel folders. A game recorded under an older ruleset is
replayed by checking out that ruleset's tag — nothing in the current code
accommodates old rules.

### Game records

Games can be recorded, but a record is a **development artifact**, not a
player-facing document: it exists to replay a game while working on the app,
and later to watch trained engines play each other. The format is ours to
change freely and needs no stability guarantees.

The game's one random element must come from a **seeded** generator recorded
with the game, so a record replays exactly. `Math.random` is banned by lint in
game code.

## Ownership

The AI assistant owns the architecture and the code, within these constraints:

- Node.js/TypeScript, modern libraries and approaches.
- Major, well-maintained libraries only — no little-known or personal
  third-party packages.

The repository owner owns the processes and, together with the assistant,
writes the stories. Story numbers come from GitHub issues and are usually
chosen by the owner.

## Development environment

**All development happens inside the VS Code Dev Container.** Nothing is
installed on the host beyond Docker and the Dev Containers extension — no
Node, no npm, no toolchain. Never suggest a host-side install, and never run
the toolchain anywhere but the container.

## Intended audience

The primary audience is **players of the game**. Player-facing text — the UI
itself, `README.md`, `doc/ruleset/rules.md`, error messages — should be written
for a non-technical reader. When writing user stories, the "user" is typically
a player, not a developer. Technical depth belongs in `CONTRIBUTING.md`, code,
and planning documents.

## Accessibility during pre-release

The game is still being built and iterated on: how it looks, and how it is
played, both change from story to story. Until it is released, **do not spend
work keeping accessibility intact through a change** — visual, gameplay, or
anything else. Where a change costs an accessible behaviour, accept the cost
and **record it** as a note in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, so the eventual
accessibility story picks it up deliberately.

This is affordable because the base plumbing is already in place — accessible
names, announcements, the live region, keyboard navigation. What is deferred
is repair work on top of it, which can be done when the time comes without a
rewrite.

For tests: **do not add plan steps for testing accessibility.** Where an
existing automated test has a straightforward path to being updated, update
it; where it does not, the story does not owe it one.

That document is the single ledger for these notes; it is not an audit, and
nothing goes in it that was not knowingly accepted by a story.

## Conventions

See [CONTRIBUTING.md](CONTRIBUTING.md) for the toolchain, dependency policy,
testing stance, comment convention, and architecture constraints.

## Vocabulary

**Ply** — everything one player does before play passes to their opponent; in
this game, two actions. Preferred in code over "turn" only because it is
unambiguous in general usage.

**Turn** — the player-facing word for a ply. `rules.md`, the UI, and
`README.md` all say "turn"; code, tests, and planning documents say "ply".

**Round** — one ply for each player. The same word everywhere.

**Action** — one of the two things a player does in a ply: a move, or an
attack. The same word everywhere.

**Move** — the movement action specifically: one ship changing squares. It is
**never** a synonym for a ply or a turn. This is the trap to avoid — in most
board games "move" is the ambiguous word, but here it is a precise one, so it
must not be used loosely.

**Hub** — a site that is currently in play: the thing a ship stands on to
collect energy. Code, tests and plans say "hub"; player-facing text says
**"node"**. The split exists to keep the code word clear of the search-tree
"node" that arrives with any future engine work — a collision that would be
genuinely confusing in a codebase holding both. The player-facing word is a
placeholder until the game gets a proper branding pass.

**Site** — a fixed position on the board where a hub can appear. Sites never
move; which of them are in play changes during the game. The same word
everywhere.

## Story Documentation

The folder `doc/plan/{story-name}/` (where the story name can be derived from
the branch) will contain the following, as needed. Pad the story number to 8
digits.

- **`story.md`** — the original story describing what was requested
- **`implementation-plan.md`** — the plan describing what was intended to be
  implemented
- **`peer-review.md`** — a peer review that also includes status and resolution
  of peer review items

Note: please do not make references to products with trademarked names.

## Implementation Strategy

Stories are implemented through the `/implement-story` pipeline
(`.claude/commands/implement-story.md`): an orchestrator in the main session
dispatches fresh-context agents (`.claude/agents/`) for the expensive phases —
creating the implementation plan, implementing each step, peer-reviewing, and
processing the review. The **`implementation-plan.md`** contains one or more
steps, each with a verification strategy, and doubles as the pipeline's state:
agents record per-step Status and Notes there, so the process is resumable
from a fresh session.

Steps are implemented one at a time, each verified (typecheck, lint, tests,
plus the step's own verification) and committed before the next begins. The
process pauses for the owner only at defined gates: plan approval, manual
verification steps, escalations (a step failing repeatedly), and final
sign-off after peer review — not after every step. Always check for files
that have not been committed before beginning a step: if there are
uncommitted files, **stop** and verify whether the owner wants to commit them
before continuing.

Stories should be orchestrated from a session running an opus-class (or
stronger) model; the agents set their own models.

## Creation of Implementation Plans

Before creating or modifying an `implementation-plan.md`, read
`doc/guidelines/implementation-plan-guide.md` and follow it exactly.
