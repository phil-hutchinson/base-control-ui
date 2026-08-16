# Story 00000001 — Draw the starting board

## Summary

Put the board on screen. A player opening the app sees the 15 x 15 board, the
fourteen bays around its edge, and the fourteen ships sitting in those bays in
their starting positions — seven green, seven red.

Nothing moves. There are no turns, no nodes, no attacks, and no way to interact
with a ship beyond looking at it and reaching it with the keyboard. This story
is the picture the rest of the game will be built on top of.

## Background & references

This is the first story after the bootstrap commit. The app is currently a
placeholder welcome screen (`src/App.tsx`) and there is no game code at all.

The rules are owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), **version 0.1**. The sections
this story implements are:

- **§3 The board** — 15 x 15; columns **A**–**O** left to right, rows **1**–**15**
  bottom to top.
- **§3.1 Bays** — the fourteen bay squares and their positions.
- **§4 Ships** — seven ships a side, and the starting fleet layout.

This story does **not** change the ruleset, so there is no version bump and no
`/tag-rules` run at the end of it.

**Site positions are deliberately absent.** §3.2 leaves them **TBD**
([Appendix A](../../ruleset/rules.md#appendix-a--open-items) item 1), and the
owner wants them settled by looking at a drawn board. Drawing the board is
therefore a prerequisite for that decision, not blocked by it.

**The accessible grid is a port, not a fresh design.** The owner has approved
bringing across proven infrastructure early. The reference project's
keyboard- and screen-reader-friendly WAI-ARIA grid lives at
`.local/reference/capture-the-flag-ui/src/board/grid/` (`AccessibleGrid.tsx`,
`gridNavigation.ts`, `gridNavigation.test.ts`, `AccessibleGrid.css`). It is
piece-agnostic — it knows only about a 2-D array of cell descriptors and an
activation callback — so it should be adoptable here without a rewrite.
Adopting it while the board is first drawn is preferable to drawing the board
twice.

## In scope

1. **The board.** 15 x 15 squares, rendered with row 15 at the top and row 1 at
   the bottom, column A at the left and column O at the right. A square is
   identified as column-letter + row-number (`H8`, `A1`).
2. **The bays.** The fourteen bay squares from §3.1, visually distinguishable
   from ordinary squares:

   | Edge   | Bays             |
   | ------ | ---------------- |
   | Top    | D15, H15, L15    |
   | Right  | O14, O10, O6, O2 |
   | Bottom | D1, H1, L1       |
   | Left   | A2, A6, A10, A14 |

3. **The ships in their starting positions.** Fourteen ships, one per bay,
   alternating sides. Clockwise from H15 (§4):

   > H15 green, L15 red, O14 green, O10 red, O6 green, O2 red, L1 green,
   > H1 red, D1 green, A2 red, A6 green, A10 red, A14 green, D15 red.

4. **An accessible board.** The board is a WAI-ARIA grid: reachable and
   navigable by keyboard with arrow keys and a roving tabindex, and every
   square carries an accessible name saying where it is, whether it is a bay,
   and which ship (if any) stands on it. Decorative ship artwork is
   `aria-hidden`.
5. **`RULES_VERSION`.** This story is the first to put rule content in `src/`
   (board size, bay positions, starting layout), so it brings the single
   `RULES_VERSION` constant and the test asserting it matches the version in
   `rules.md`, per CLAUDE.md.

## Design decisions & constraints

- **Rule data is derived from the document, not duplicated by hand where that
  can be avoided.** The bay positions and the starting fleet are stated
  explicitly in `rules.md` and must appear in `src/` as data that a test can
  check against the rules — in particular that there are exactly fourteen bays,
  none on a corner, all on the outer edge, spaced every fourth square, and that
  the two fleets are a half-turn rotation of each other (§4). That rotational
  symmetry is a property worth testing directly: it is the reason the opening
  is fair, and a typo in the list would silently break it.
- **Colour is never the only cue.** `src/index.css` already carries
  `--color-green` / `--color-red` with a note that the two sides must stay
  distinguishable to a colour-blind viewer and must always be paired with a
  non-colour cue. The accessible name is one such cue; the plan should decide
  whether a visible one is also needed at this stage.
- **Logic stays out of components.** Per CONTRIBUTING.md: square naming,
  accessible-name wording, and the coordinate arithmetic mapping board squares
  onto the grid's row/column index space belong in plain modules with plain
  unit tests, not inside the React components.
- **Board coordinates vs. grid indices.** The rules number rows bottom-to-top;
  the grid renders top-to-bottom. That inversion is exactly the kind of
  off-by-one that should live in one tested function rather than being done
  inline wherever it is needed.
- **Ported code gets this project's comment style.** The reference grid's files
  open with long design-history headers citing story numbers and plan steps.
  CONTRIBUTING.md forbids that here. The port must rewrite those comments to
  say what the code does, and drop the story archaeology.
- **This project can test what the reference project could not.** The reference
  grid's ARIA behaviour was verified only by hand, because that project had no
  jsdom or component-testing library. This repository ships jsdom, Testing
  Library, `user-event`, and axe-core — none of it exercised yet. This story is
  the first consumer, so it is where that wiring gets proven: component tests
  opt in per file with `// @vitest-environment jsdom`, and if
  `@testing-library/jest-dom`'s matchers need a `setupFiles` entry in
  `vite.config.ts`, this story adds it. It was left out of the bootstrap rather
  than added blind.
- **`npm test` currently exits 1** with "No test files found". The first test
  this story lands retires that, and the suite should be green from then on.

## Out of scope

- **Sites and nodes** — positions are TBD (Appendix A item 1); no site is drawn
  and no node state exists.
- **Movement, attacks, turns, rounds, influence, and the bay return order** —
  §§5–9 entirely. Activating a square does nothing yet.
- **Shields.** Every ship starts on 0 and the starting value is itself TBD
  (Appendix A item 2). No shield count is displayed and no shield logic exists;
  the board's design should simply leave room for one later.
- **Game records, seeded randomness, and any engine work.** The board is static,
  so nothing random happens yet.
- **Any backend.** The app stays a static, front-end-only SPA.

## Verification

Automated (must be green before sign-off): `npm run typecheck`, `npm run lint`,
`npm test`, `npm run format:check`, `npm run build`.

Automated tests should cover, at minimum, the bay set and the starting fleet
against the properties in §3.1 and §4, the board-coordinate ↔ grid-index
mapping, the accessible-name wording, and `RULES_VERSION` matching `rules.md`.

**Manual gates** — the plan should schedule these; anything about how the board
looks, and real assistive-technology behaviour, is checked by hand:

1. **It looks right.** `npm run dev`, open `localhost:5273`. The board is
   square and legible, A1 is bottom-left and O15 top-right, the fourteen bays
   are where §3.1 says and are visually distinct, and the fourteen ships sit
   one per bay in the §4 pattern with the two colours clearly distinguishable.
2. **Keyboard.** The board can be reached by Tab, arrow keys move between
   squares, and the focused square is unmistakably visible.
3. **Screen reader.** Moving across squares announces position, bay status, and
   the ship standing there, in wording that makes sense read aloud.

## Open items to resolve at plan time

- Whether the port of the accessible grid comes across as-is or is trimmed —
  the reference component carries `initialFocus` and activation behaviour this
  story has no use for yet.
- How a square's accessible name is worded, given there is no action to
  perform on it yet.
- Whether the two sides need a visible non-colour cue at this stage, or whether
  the accessible name is sufficient until ships gain shield counts.
- Whether the board needs visible column letters and row numbers, or whether
  the per-square accessible name is enough for now.
