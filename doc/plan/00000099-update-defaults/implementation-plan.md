# Story 00000099 — Implementation plan

## Approach

Two steps, implemented inline in the main session rather than through the
`/implement-story` agent pipeline, by the owner's decision: the production
change is four one-line constant edits, and dispatching a fresh-context agent
per step would cost more than the work. Peer review still runs through the
normal sub-agent.

The step split follows the two audiences the change touches — the app and its
tests in one commit, the player-facing prose in another — so the README's
wording can be reviewed on its own.

Before starting, the four constants were changed on a throwaway basis and the
full suite run, to measure the blast radius rather than estimate it: 26
failures across 11 files, every one an assertion about an old default and none
a break in rule logic. That measurement is what the steps below are sized
against.

## Step 1 — The four defaults, their comments, and the tests

**Status:** Done (commit `138235c`)

Change `DEFAULT_FLEET_SIZE` 6 → 5, `DEFAULT_CHARGED_NODE_COUNT` 5 → 4,
`DEFAULT_SCORING` simple → bonus, `DEFAULT_NODE_ROTATION` continuous → planet.
Update every comment that names an old value, and every test that asserts one.

Pin, rather than re-expect, the tests that were exercising a setting they never
named — `nodePool.test.ts`'s economy harness and two in `ply.test.ts` are about
continuous rotation and must stay about it.

**Verification:** `npm run typecheck`, `npm run lint`, `npm test`,
`npm run format:check`; `rules.md`, `changelog.md` and `RULES_VERSION`
unchanged in the diff.

**Notes:** All four verifications pass; 1522 tests green. `rules.md` and
`changelog.md` are absent from the diff, as the story requires.

Two things the pre-measurement did not predict, both recorded in `story.md`:

- The four groups' ordering comments each claimed the leftmost rendered choice
  is what the app preselects. That was true of all four before this story and
  of none after, since the render order does not move. Reworded to state the
  order and point at the `DEFAULT_` constant.
- `App`'s combat test could not be re-expected at all: the five-a-side layout
  starts no two opposing ships within attack range, confirmed by probing every
  green ship's targets at the opening, so there is no first-turn attack to
  select at the new default. The test now chooses six ships explicitly, which
  is the condition it always ran under.

Two tests were left passing but hollow — they chose the value that had just
become the default — and now choose a non-default one instead.

## Step 2 — The README prose

**Status:** Done (commit `33b2c72`)

The status blurb names each group's preselected option in prose; four readings
go stale. The gameplay walkthrough separately calls continuous rotation
"today's game and the one the app starts on", two claims that come apart once
planet is preselected.

**Verification:** `npm run format:check`; a sweep of `README.md` for every
remaining statement of a default.

**Notes:** Done. Continuous keeps its place as the first rotation described,
since the start screen still renders it leftmost; only the "starts on" half
moves to planet.

The sweep left one sentence deliberately unchanged: "every starting square is
an ordinary square … so in a game with combat on ships are attackable from the
very first turn." It is a claim about starting squares granting no immunity,
which holds at every fleet size, not a claim that an attack is in range on
turn one — which, as Step 1 found, is no longer true at the default fleet.
Flagged to the owner rather than reworded.
