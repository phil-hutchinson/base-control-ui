# Story 00000040 — Update spaceship models

## Summary

The ships get new artwork. The flat two-tone silhouettes on the board — a
green dart and a red hexagon, each ringed by four shield arcs — are replaced
by fully drawn models: a green swept-wing craft with three turbojets, and a
red disk with a single oversized engine flanked by two command pods. Both
are drawn from the front and slightly above, in silver with player-coloured
trim.

Each model carries its own **shield gauge**: a row of four small overhead
ship icons across the top of the square, one per shield the ship could
carry. A lit icon is filled in the player's colour and carries a thick bar
just below it; an unlit one drops both the fill and the bar. The gauge
replaces the ring of arcs entirely.

The two models also appear on the **start screen**, at about triple their
board size, flanking the title and options — green on the left, red on the
right — with their shield gauges left off.

Purely a visual story. No rule changes, no gameplay changes, no change to
`doc/ruleset/rules.md` or `RULES_VERSION`.

## Background & references

The artwork was authored outside the app and handed over finished, in
`.local/eg_spaceship.html` (a git-ignored scratch file — the models must be
lifted out of it into the app, since the file itself is not part of the
repository). **Its appearance is settled**: the geometry, gradients, stroke
colours and gauge layout are taken as given and are not to be redesigned
while porting them.

What it replaces is `src/board/ShipIcon.tsx`, which draws both hulls as a
single `<path>` each (`SHAPES`) inside a 0–100 viewBox, plus a four-arc
shield ring built from `RING_RADIUS`, `ARC_GAP_DEGREES` and the positions in
`src/board/shieldArcs.ts`. The new models are drawn in the same 0–100
viewBox, so they drop into the square the same way; the ring and the
geometry constants that serve it go.

Shields run 0–4 (`rules.md` §4.1, `src/rules/shields.ts`), which is exactly
what the new four-icon gauge shows — the sample file happens to be drawn at
three of four.

## In scope

### 1. The models replace the current ship icons on the board

Every place a ship is drawn on the board shows the new model for its side.
The ship's shield count drives its gauge: 0 through 4 icons lit, filled in
the fixed left-to-right order, each lit icon carrying its bar and each unlit
one drawn as the hollow outline.

Everything the board already draws around a ship keeps working unchanged:
the site marker beneath it, the destination, target and selected marks, the
already-acted bar, the no-action bar, and the dampened treatment for a ship
with no legal action.

### 2. Element IDs must not collide

The artwork leans on `id` attributes — gradients, and the reusable ship and
turbojet groups the models `<use>`. Up to fourteen ships are on screen at
once, so the naive port would repeat every one of those ids many times over
in a single page, which is invalid and unpredictable.

How this is solved is the assistant's call: either every instance gets its
own unique ids, or the definitions are declared once and shared safely by
all instances. Either way, **no id appears twice in the rendered document**,
and the models draw correctly with any number of ships on screen.

### 3. The models appear on the start screen

The start screen gains the two models as decoration:

- **Green on the left** of the title, options and PLAY button; **red on the
  right**.
- Roughly **vertically centred** against that column.
- About **triple the size** they draw at on the board, measured against the
  current viewport — so roughly three board squares across.
- **No shield gauge**: the ships only, with the gauge omitted entirely.

They are decoration and nothing more: not focusable, not announced, and
pressing them does nothing.

**When the window is too narrow** to hold a ship either side of the centre
column, the pair restacks — both ships move below the column, side by side —
rather than squeezing or hiding.

> **Withdrawn during implementation.** This section was built and shown to
> the owner, who did not like how the start screen looked with the ships on
> it and asked for it to be left exactly as it was. The work was reverted;
> the start screen is unchanged by this story, and the story delivered
> section 1 alone. Ship artwork on the start screen, in some other form, is
> a question for a later story.

## Out of scope

- **The palette.** The new models carry brighter, more saturated greens and
  reds than the `--color-green` / `--color-red` tokens the HUD, score pips
  and selection marks use. That mismatch is knowingly accepted here: the
  models go in exactly as supplied, and whether the palette is retuned to
  match is judged after seeing the app running, as a possible later story.
- **Any rules or gameplay change.** Nothing about how the game is played
  changes, and the ruleset is untouched.
- **Accessibility repair.** The ships stay hidden from the accessibility
  tree, with a square's accessible name (`squareLabel.ts`) carrying the side
  and shield count in words, exactly as today. Per `CLAUDE.md`, any
  accessible behaviour this change costs is recorded in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather than
  repaired.
