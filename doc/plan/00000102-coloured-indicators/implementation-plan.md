# Story 00000102 — Implementation plan

## Approach

Two steps, implemented inline in the main session rather than through the
`/implement-story` agent pipeline: the change is confined to the score
cell's pip row, and a fresh-context agent per step would cost more than the
work. Peer review still runs through the normal sub-agent.

No rules change — pip colours are the app's presentation, not a rule — so
there is no ruleset step.

## Decisions

- **D1 — The fill colour is the board's node colour, taken from the same
  source.** Under steal, a lit pip's fill is the core colour
  `colorsForSignal` (`src/board/squareArt.ts`) gives the node's signal and
  matched side — exactly what `NodeMarker` draws the charged ball in — so the
  pip and the board cannot disagree. Under the other playstyles, where nodes
  carry no signal, the fill stays `--color-node-charged`, which already
  matches the board's gold. The colour reaches the CSS as a custom property
  set inline per pip, since it is chosen per render.
- **D2 — Ordering is a display concern and lives in `ScoreDisplay`.**
  `turnCollection` (`src/rules/energy.ts`) already reports the held squares
  and the own node's square; the HUD derives the pip order and colours from
  that, rather than widening a rules module with presentation.
- **D3 — "Others" keep board order.** Under DOUBLE and REQUIRED the row runs
  own node, opponent's node, then the remaining held nodes in the order
  `turnCollection` gives them (board order). With player-matching off, the
  whole row keeps board order, as today — the story asks for no change there.
- **D4 — The X is white.** The X was drawn in the side's colour to match the
  side-coloured outline; with the outline white, the X follows it so the
  crossed pip still reads as one mark.
- **D5 — Glow follows the fill.** A lit pip's glow was the fill colour; it
  stays so, in each node's colour.

## Step 1 — Coloured pips, white outlines, own-enemy-others order

Status: committed

Notes: `pipFills` in `ScoreDisplay.tsx` builds the ordered fill list; lit
pips carry it inline as `--pip-fill`, and the per-side border and X rules are
gone from the stylesheet. Five tests added; no deviation from the plan.

In `src/hud/ScoreDisplay.tsx`, build the row's fill colours from
`turnCollection`: one entry per held node (two for the own node under
DOUBLE), ordered per D3, coloured per D1. Lit pips take their colour from
that list; X pips and unlit pips carry none. In `ScoreDisplay.css`, make every
pip's border and the X lines white (D4), drop the per-side border rules, and
fill and glow a lit pip from the per-pip custom property (D5), falling back to
`--color-node-charged`. Update the `--color-node-charged` comment in
`src/index.css` if it no longer describes the pip's use accurately.

Extend `ScoreDisplay.test.tsx`: under steal with DOUBLE, the own node's two
pips come first in the player's colour, then the opponent's, then the rest in
their signal colours; under REQUIRED once the own node is held, the same
order with the own node once; under OFF steal, board order in signal colours;
under a non-steal playstyle, lit pips fall back to the gold token; X pips
carry no fill colour.

Depends on: nothing.

Verification (automated): `npm run typecheck`, `npm run lint` and `npm test`
all pass, including the new ordering and colour tests.

## Step 2 — Accessibility note and README check

Status: pending

Add a "From story 102" section to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` recording that
which nodes a player holds is now told by pip colour alone, in a decorative
row. Confirm `README.md` needs no change (it mentions the node count shown,
not pip colours) or update it if it does.

Depends on: Step 1 (the note describes what Step 1 built).

Verification (automated): `npm test` and `npm run lint` pass; the README
review is recorded in this step's Notes.
