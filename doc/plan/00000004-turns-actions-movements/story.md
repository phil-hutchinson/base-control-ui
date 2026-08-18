# Story 00000004 — Plies, actions and movement

## Summary

The game starts moving. Green takes the first ply, the two sides alternate, and
each ply is two actions. Combat does not exist yet, so **every action is a
move**: a player picks one of their ships, picks a square it can legally reach,
and the ship goes there. A ship may be moved at most once per ply, so a ply is
always two different ships.

Movement is implemented in full: the §6 range table by shield count, straight
lines only, a path that must be clear of ships both to pass over and to land
on, the board's edges, the ban on ending a move on a dormant or depleted site,
and the bay's shield reset.

This is the first story in which anything about the game changes while you
watch. Until now the board has been a fixed picture built once at module load;
it becomes a picture of a game state that moves.

No site changes state, no shield is ever gained, no influence is collected, and
nothing ends the game. Those are §7, §8 and §9, and they come later.

### A note on words

This is a planning document, so it says **ply** for what the rules and the UI
call a **turn** (CLAUDE.md, Vocabulary). The branch and folder name say
"turns" because they were named before the document existed; nothing else
should. Player-facing text in the app says "turn". **Move** means one ship
changing squares and never means a ply.

## Background & references

The rules are owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), **version 0.3**. The sections
this story implements are:

- **§5 Turns and actions** — green first, alternating, two actions a ply, a
  ship moved at most once per ply, the pass when no action is legal.
- **§6 Movement** — the range table by shield count, straight lines, the clear
  path, and the ban on ending on a dormant or depleted site.
- **§3.1 Bays** — a ship that ends a move in a bay loses all its shields.
- **§7.2 Returning by choice** — which is not a rule of its own so much as a
  consequence: a bay is an ordinary legal destination.
- **§8.5** — restated in §6, the same ban on ending a move on a dormant or
  depleted site, and the freedom to fly over one.

**This story does not change any rule.** `rules.md` stays at 0.3,
`RULES_VERSION` with it, and there is no changelog entry and nothing to tag.
If implementing §6 turns up a genuine ambiguity in the document, that is a
rules change and needs the owner — it is not something to settle in code.

### What is already in place

- `src/rules/board.ts` — squares, names, `ALL_SQUARES`, and the A–O / 1–15
  coordinate system. `src/rules/bays.ts` — the fourteen bays and `isBay`.
- `src/rules/sites.ts` — the seventeen sites, the `SiteState` union
  (`dormant | active | charged | depleted`), and `startingSiteState`, which
  answers from a fixed starting arrangement rather than from any stored state.
- `src/rules/shields.ts` — the `ShieldCount` type (0–4) and its bounds.
  Nothing changes a shield count anywhere in the app.
- `src/rules/fleet.ts` — `FleetEntry` (`square`, `side`, `shields`),
  `STARTING_FLEET` with all fourteen ships on 0 shields, and
  `startingShipAt(square)`.
- `src/board/Board.tsx` — builds a `BOARD_ROWS` constant **once at module
  load**, walking the grid and asking `startingShipAt` and
  `startingSiteState` about each square. This is the thing that has to change
  shape: the board must render from a game state that moves, not from a
  module-level constant computed from the starting position.
- `src/board/grid/AccessibleGrid.tsx` — a deliberately piece-agnostic grid
  implementing the WAI-ARIA grid pattern: roving tabindex, arrow-key
  navigation, and a `GridCellDescriptor` of `content`, `label` and
  `focusable`. It has **no notion of activating a cell** — no click handling,
  no Enter/Space — and **no live region**. Both are needed here.
- `src/board/squareLabel.ts` — the accessible name, built as comma-separated
  segments: square name, then `bay` or `<state> site`, then `<side> ship`,
  then the shield count.
- `src/board/ShipIcon.tsx`, `SiteMarker.tsx`, `shieldArcs.ts` — the visuals,
  including the shield arcs, all driven by props.

### What §6 actually asks for

The range table is cumulative — each shield shed adds an option and keeps the
ones below it:

| Shields | Reachable squares                                  | Count |
| ------- | -------------------------------------------------- | ----- |
| 4       | 1 orthogonal                                       | 4     |
| 3       | 1 orthogonal, 1 diagonal                           | 8     |
| 2       | 1 orthogonal, 1 diagonal, 2 orthogonal             | 12    |
| 1       | 1 orthogonal, 1 diagonal, 2 orthogonal, 2 diagonal | 16    |
| 0       | all of the above, plus 3 orthogonal                | 20    |

Two things fall out of the table that are easy to get wrong. **Three squares
diagonally is never legal**, at any shield count. And the counts above are
before the board's edge, other ships, and the site restriction cut them down —
they are the shape of the reach, not the number of moves actually available.

Blocking applies to **every square the ship passes over as well as the one it
lands on**, and does not care whose ship it is: a friendly ship blocks exactly
as an enemy one does. So a 3-square orthogonal move needs two intermediate
squares clear and the destination clear.

The site restriction is the other way round — it is about the destination
only. A ship may fly over a dormant or depleted site as freely as any other
square; it simply may not stop there. Landing on an **active** or **charged**
site is legal, and neither one becomes anything else in this story.

## In scope

1. **A game state that changes.** The app gets a state holding where every ship
   is, which side is to move, how many of the ply's two actions are left, and
   which ships have already moved this ply. The starting state is derived from
   `STARTING_FLEET` and the starting site states, exactly as the board is drawn
   today.

2. **Legal-move calculation, as rules-layer logic.** A pure function that,
   given a state and a ship, answers with the squares that ship may legally
   move to. It must account for, together:
   - the §6 range table for the ship's shield count;
   - straight lines only, orthogonal or diagonal;
   - the board's edges;
   - every intermediate square and the destination being unoccupied, by either
     side;
   - the destination not being a dormant or depleted site.

3. **Applying a move.** A pure transition that moves a ship from one square to
   another, marks it as having moved this ply, spends one action, and — per
   §3.1 — sets its shields to 0 if the destination is a bay.

4. **Plies and actions.** Green moves first. A ply is two actions; when both
   are spent, play passes to the other side and the moved-this-ply marks
   clear. A ship that has already moved this ply cannot be moved again, and
   with no combat that means every full ply moves two different ships. Only
   the side to move may move.

5. **The deadlock guard (§5).** If the side to move has no legal move at all
   with any of its eligible ships, the ply passes. This should never happen in
   a real game, but §5 states it so the game can never deadlock, and it is
   cheap to honour. The app must not sit there waiting for an impossible
   input.

6. **Selecting and moving a ship, by keyboard and by mouse.** Choose one of
   your own ships that has not yet moved, see where it can go, choose a
   destination, and it moves. Cancelling a selection and switching to a
   different ship are both possible. This needs `AccessibleGrid` extended with
   **cell activation** (click, Enter and Space) and a **live region** for
   announcements — both added in the component's existing piece-agnostic
   spirit, knowing nothing about ships or sides.

7. **Seeing the state on the board.** Legal destinations for the selected ship
   are marked; the selected ship is marked; ships that have already moved this
   ply are marked as spent. All three must be readable without relying on
   colour alone, per the standing note in `src/index.css`.

8. **A turn indicator.** Player-facing chrome saying which side's turn it is
   and how many of its two actions remain, in the players' vocabulary
   ("turn", not "ply"). No round counter and no scoring — there is nothing to
   score yet.

9. **Accessible names and announcements.** Every square's accessible name says
   what a sighted player can see: that a ship is selected, that a square is a
   legal destination for it, that a ship has already moved this turn. Moves,
   selections, cancellations and the change of turn are announced through the
   live region.

10. **A temporary fixture for manual verification**, removed by the plan's
    final step — see below.

## The temporary fixture

Every ship starts on 0 shields, in a bay, and no site starts charged or
depleted. That starting position can demonstrate exactly one of the five
movement ranges and neither of the two site restrictions, so almost everything
this story implements would be invisible to the eye without help. As in story
00000003 and story 00000006, the plan therefore installs a temporary starting
arrangement and **removes it in its final step**.

The fixture sets up three things:

- **Shields across the full 0–4 range**, so each row of the §6 table can be
  checked by reach.
- **Ships placed to make the interesting cases one move away**: a ship that
  can try to land on a dormant site and one that can try a depleted site, a
  ship with a friendly blocker in its path and one with an enemy blocker, a
  ship that can reach a bay, and a ship whose only sensible line passes over a
  site.
- **Site states covering all four**, since a real starting board has only two.

**Every ship carrying shields is placed on the board's interior, not in a
bay.** A shielded ship sitting in a bay is a position the rules cannot
produce: §3.1 strips a ship that ends a move in a bay, and §4.1 grants shields
only for standing on a node, so any ship in a bay has 0. Putting the fixture's
shielded ships out on the board keeps it an implausible position rather than
an impossible one, and stops the bay-reset gate from being tested against a
ship that should never have had shields in the first place.

The fixture is a display and hand-testing arrangement and **is not a legal
game state**. Nothing in the rules layer may assert against it, and no
automated test may depend on it — the last step deletes it, and any coverage
resting on it would go with it. Automated tests build the positions they need
directly.

## Design decisions & constraints

- **Rule logic stays out of components.** CONTRIBUTING.md names "the game's
  own turn/board state" specifically as belonging in plain modules with plain
  unit tests. The reach calculation, the blocking check, the site restriction,
  the bay reset, the action count and the change of turn are all logic; the
  components render the result and dispatch intent.

- **State transitions are pure and produce new states.** No mutation in place.
  This is worth insisting on for its own sake, and it is also what makes a
  later story able to record a game and replay it: a move should be expressible
  as a small value — which ship, from where, to where — that a list of such
  values replays deterministically from the starting state. This story does
  **not** build recording, serialisation or undo; it just declines to make them
  hard.

- **One legal-move function, not one per caller.** The highlight the player
  sees, the check that a chosen destination is allowed, and the deadlock guard
  in §5 must all be the same function. Two implementations of §6 would drift,
  and the version the player can see would not be the version the game
  enforces.

- **Reach and legality are separated inside that function.** The §6 table
  describes the shape of a ship's reach from an empty board; occupancy, the
  board edge and the site restriction then filter it. Keeping the two apart
  makes the table directly testable against the document and keeps the filter
  honest about what it is doing. `src/rules/siteSpacing.test.ts` already
  enumerates §6's ranges for its own purposes and should be reconciled with
  the real implementation rather than left as a second copy of the table.

- **`AccessibleGrid` stays piece-agnostic.** It gains activation and a live
  region because those are grid-widget concerns, not game concerns. It must not
  learn what a ship, a side, or a legal move is. The announcement _wording_
  belongs in a plain module beside `squareLabel.ts`, not inside a component.

- **Colour is never the only cue** — `src/index.css`'s standing note. This
  story adds three new square states (selected, legal destination, already
  moved) on top of bays, four site states and two ship colours. Whatever marks
  them must survive greyscale, must not be mistaken for a site marker or a bay,
  and must not obscure the ship or the site underneath.

- **The keyboard is not an afterthought.** The board is already a WAI-ARIA grid
  with roving focus, and a player must be able to play the whole game from it:
  move focus, select, review destinations, commit, cancel. Mouse support is the
  same two-step interaction, not a second model — there is no drag-and-drop,
  which would need a parallel accessible path anyway.

- **A rejected input must say why.** Activating an enemy ship, a ship that has
  already moved, or an out-of-reach square is a thing players will do
  constantly while learning. Each must produce a clear, non-technical
  explanation rather than nothing at all, and the explanation must reach a
  screen-reader user as well as a sighted one. For a sighted player, that
  explanation is the board itself: nothing highlights and nothing moves. The
  written sentence is carried only in the live region, for the screen-reader
  user who needs it read aloud — this is the intended behaviour, not a gap.

- **The app deliberately lags the document in one place.** §8.5 requires a
  player whose ship is stranded on a depleted site to spend an action moving it
  clear. That is not implemented here (see Out of scope), so the app permits a
  ply the rules would not. This is a story-by-story build catching up, not a
  disagreement: `rules.md` stays right, and the gap closes in the story that
  brings site states to life.

- **No speculative layout.** The turn indicator is the first chrome to sit
  beside the board, and story 00000006 deliberately left the board sizing
  itself from its container with no slots reserved for anything. Add what the
  indicator needs and no more; it must not reintroduce a viewport-derived size
  or stop the board filling the space it is given.

- **No randomness is involved.** Nothing in this story draws a random site, so
  no seeded generator is needed yet and the `Math.random` lint ban is
  unaffected.

## Out of scope

- **Combat, in full (§7).** No attacks, no bay returns from a lost fight, no
  equal-shields double return, no §7.1 return-position numbering or its
  counter-clockwise walk. The second kind of action does not exist yet, which
  is the premise this story is built on.
- **The §8.5 stranded-ship requirement.** A ship on a depleted site is not
  forced to move clear, and the app does not treat any ply as owing an action.
  The related waiver ("if a stranded ship has no legal move, the requirement is
  waived") is out with it.
- **Every site transition (§8.2, §8.3, §8.6).** Touching an active site does
  **not** wake it, no clock runs, nothing becomes depleted or dormant, and no
  replacement is drawn. Site states are fixed for the whole story — which is
  precisely why the fixture has to supply the ones a real starting board lacks.
- **Gaining shields (§4.1, §8.7).** No ship ever gains a shield. The only
  shield change in the story is §3.1's reset to zero on ending a move in a bay,
  and after the fixture is removed there are no shields left to reset.
- **Influence and the end-of-turn sequence (§8.4, §8.7).** Nothing is
  collected and nothing is scored, so none of §8.7's six steps runs.
- **Ending the game (§9).** No round counter, no 100-round limit, no winner.
  Play simply continues.
- **Game records.** No recording, no replay, no serialisation format, no seed.
  The state is only shaped so as not to obstruct them later.
- **Undo, redo, restart and takebacks.** A move, once made, stands.
- **Move history, a move list, or algebraic notation on screen.**
- **Any AI or engine.** Both sides are played by people at the same keyboard.
- **Any backend.** The app stays a static, front-end-only SPA; the game state
  lives in the browser and is not persisted.

## Verification

Automated (green before sign-off): `npm run typecheck`, `npm run lint`,
`npm test`, `npm run format:check`, `npm run build`.

Automated tests should cover, at minimum:

**Movement (§6)**

- the reach from an unobstructed centre square at each shield count 0–4,
  asserted as the exact set of squares, matching the table above;
- that three squares diagonally is never reachable at any shield count;
- that reach is clipped by the board's edges, from a corner and from an edge
  square;
- that a ship — friendly or enemy — blocks both the square it stands on and
  any longer move that would pass over it, at 2 and at 3 squares;
- that a destination which is a dormant or depleted site is excluded, that
  flying over one is not, and that an active or charged site is a legal
  destination.

**Applying a move**

- the ship arrives, the square it left is empty, and nothing else changes;
- ending a move in a bay sets the ship's shields to 0, and a move that only
  passes over an empty bay does not;
- an illegal destination is rejected rather than silently applied.

**Plies and actions (§5)**

- green has the first ply;
- two actions are taken, then the turn passes and the moved-this-ply marks
  clear;
- a ship that has moved this ply cannot be moved again, and is eligible again
  next ply;
- a ship of the side not to move cannot be moved;
- a side with no legal move for any eligible ship passes.

**Interaction and accessibility**

- selecting, cancelling, switching selection, and completing a move, driven by
  keyboard and by pointer, both reaching the same state;
- the accessible name of a selected ship, of a legal destination, and of a
  ship that has already moved this turn;
- announcements for a move made, a selection, a rejection, and the change of
  turn;
- axe reports no violations on the board mid-selection as well as at rest.

**After the fixture is removed**

- the starting fleet is fourteen ships, all on 0 shields, on the fourteen bays
  `STARTING_FLEET` names;
- the starting site states are five active and twelve dormant, nothing charged
  or depleted;
- `RULES_VERSION` still matches `rules.md` at 0.3.

**Manual gates** — the plan schedules these, and every gate that needs the
fixture must be scheduled **before** the step that removes it.

1. **The five ranges.** With the fixture in place, select a ship at each shield
   count and confirm the highlighted destinations match the §6 table: four
   squares at 4 shields, twenty at 0, and no three-square diagonal anywhere.
2. **Blocking.** A friendly ship and an enemy ship each block a landing square
   and each block a longer move passing over them. A move of two or three
   squares with a clear path still works.
3. **Sites.** A dormant site and a depleted site are both absent from the
   highlighted destinations, while a move that passes over either is offered
   and works. An active and a charged site are both offered as destinations.
   No site's appearance changes when a ship crosses or lands on it.
4. **Bays.** A ship can move into an empty bay and arrives with no shield arcs
   at all. Flying over an empty bay leaves its shields alone.
5. **Plies.** Green moves first. Two moves pass the turn to red. The same ship
   cannot be moved twice in one turn but can be moved again on the next. The
   turn indicator agrees with the board throughout, and says "turn", not
   "ply".
6. **Rejected input.** Trying to move an enemy ship, a ship that has already
   moved, or a ship onto an unreachable square each gives a clear explanation
   in plain language.
7. **Keyboard only.** A full turn for each side is played without touching the
   mouse — focus moves, selection, review of destinations, commit and cancel —
   and focus never goes missing after a move.
8. **Screen reader.** Selection, the destinations available, the move made, a
   rejection, and the change of turn are all announced in wording that makes
   sense read aloud and does not repeat itself into noise.
9. **After the revert.** The board is back to fourteen ships in their bays with
   no shield arcs, five active sites and twelve dormant, nothing charged or
   depleted — and a game can still be played from it, within the one range the
   real starting position exercises.

## Open items to resolve at plan time

- **Where the game state lives** — a new module under `src/rules/`, a new
  folder beside it, and whether the React side holds it with `useState`, a
  reducer, or a context. Bear in mind CONTRIBUTING.md's insistence that the
  logic itself stay outside components either way.
- **How a ship is identified.** `FleetEntry` identifies a ship by the square it
  starts on, which stops being an identity the moment it moves. Whether ships
  get stable identifiers now, and what that does to `startingShipAt` and to
  `Board.tsx`'s lookups.
- **Whether occupancy is stored as a fleet list or a square-to-ship map**, and
  which the blocking check wants — the path check asks "is this square
  occupied" many times per selection.
- **Whether site states become stored state now** or stay derived from
  `startingSiteState`. Nothing changes them in this story, but the fixture
  needs four states on the board and the legal-move check needs to ask about
  them, so a stored map may be simpler than a second source of truth.
- **How reach is expressed** — a generated set per shield count, or a
  direction-and-distance description filtered by shield count. Whichever
  reads most obviously like the §6 table when set beside it.
- **The exact interaction grammar** — which key commits, which cancels, what
  happens when a second friendly ship is activated while one is selected, and
  whether activating the selected ship's own square cancels or is inert.
- **How selection, legal destinations and already-moved are drawn** so that
  three new markings coexist with a bay, four site states, a ship and its
  shield arcs without the square turning to soup.
- **Announcement wording and how chatty the live region should be** — in
  particular whether every legal destination is enumerated on selection or
  only counted, and whether the region is polite or assertive.
- **Where the turn indicator sits** relative to the board, and what it does at
  narrow widths.
- **How the fixture is expressed** so the final step is a clean deletion rather
  than an unpicking exercise, and which exact ships, squares, shield counts and
  site states it uses to put every manual gate above one move away.
- **What becomes of `siteSpacing.test.ts`'s private copy of the §6 ranges**
  once a real implementation exists.
