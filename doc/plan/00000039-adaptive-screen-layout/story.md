# Story 00000039 — Adaptive screen layout

## Summary

The game screen stops being one fixed column and starts using the shape of
the window it is given. It becomes **three regions** — an **info** region
(the title and everything the HUD shows), the **play area** (the board), and
a **reserved** region held empty for content a later story will add:

- **Taller than wide** — the arrangement it has today, stacked top to bottom:
  info, play area, reserved.
- **Wider than tall** — the same three regions side by side: info on the
  left, play area in the middle, reserved on the right. The info region's
  contents restack vertically — title, green side, round, red side, who is
  to play, one under another — instead of sitting in a row.

In both cases the **play area is as large as the window allows**: it fills
the window's short dimension when there is room, and gives way only as far as
it must when the window is close to square and the two side regions still
need their space.

Purely a layout and sizing story. No rule changes, no gameplay changes, and
no change to `rules.md` or `RULES_VERSION`.

The second half of the story is a bug: **the board does not grow to fill the
window in Chromium** the way it does in Firefox. That is fixed here, because
a layout story that only works in one browser has not been done.

## Background & references

Today `src/App.css` lays out `.app` → `.app__cabinet` → `.app__board` as a
single column of `flex: 1` items rooted in `min-height: 100vh`, and
`.app__board` is a `container-type: size` box that
`src/board/Board.css` measures with `--square: max(40px, calc(100cqmin /
15))`. That chain is what this story replaces, and — see section 6 — it is
also the most likely reason Chromium never gives the board a size to grow
into.

The cabinet frame established by story 20 (one raised box holding the title,
the HUD strip and the board) stays. It goes on **spanning the window**: on a
very oblong screen the leftover space at the far edges is empty cabinet
interior, not page background.

The ruleset is untouched, so there is no version bump and no changelog entry.

## In scope

### 1. Three regions

The in-game screen inside the cabinet is composed of exactly three regions,
in this order in the DOM regardless of orientation:

1. **Info** — the `h1` title and the HUD (both scores with their pips, the
   round counter, the turn indicator).
2. **Play area** — the board.
3. **Reserved** — empty, see section 5.

Orientation changes how they are arranged and how the info region's own
contents are laid out. It never changes their order, and no element is
rendered twice or moved in the DOM to achieve a layout.

### 2. Taller than wide

Stacked, in the order above: info at the top, play area beneath it, reserved
at the bottom. The info region keeps the arrangement it has today — the title
on its own line, then a row of green side | round | red side, then the turn
indicator underneath.

### 3. Wider than tall

Side by side, in the order above. The info region becomes a column: title,
green side, round, red side, turn indicator, each under the last, centred as
a group against the play area. The title's size has to hold up in a narrow
column — its current `4vw` term grows with the window width and would not.

Nothing about what the HUD _shows_ changes: same numbers, same pips, same
words, same colours.

### 4. How big everything is

Write `W` × `H` for the room inside the cabinet's frame, `P` for the extent
of one side region (its height when stacked, its width when side by side),
and `g` for the gap between regions. The board is always a square of side
`S`:

- **Taller than wide:** `S = min(W, H − 2(P + g))`
- **Wider than tall:** `S = min(H, W − 2(P + g))`

Which is to say: the play area takes the window's short dimension whenever
the long dimension has room to spare for both side regions, and otherwise
shrinks to whatever the long dimension leaves — the near-square case, where
the board is a little smaller than the window's short dimension so that the
info and reserved regions still fit.

Two consequences that are requirements, not side effects:

- **The reserved region mirrors the info region.** Both have extent `P`, so
  the board sits **exactly centred in the window** on both axes.
- **On a very oblong window the regions stay close to the board.** The three
  regions are sized as above and centred as a group; all the leftover space
  goes to the two far edges. On an ultra-wide monitor the board is full
  height and centred, the info column sits just to its left, the reserved
  column just to its right, and the empty space is out at the far left and
  far right — not between the board and the panels.

`P` is a single value per orientation, shared by both side regions, sized so
the info region's contents fit it comfortably at any window size the game is
meant to be played at.

The existing 40px floor under a square stays: the board never shrinks below
`15 × 40px`, and a window too small to hold that overflows and scrolls as it
does today. Making the game work on a phone-sized screen is not this story.

### 5. The reserved region

It draws the word **`RESERVED`** and nothing else — enough to see that the
region is there, is the right size, and is in the right place. It is a
placeholder: no border or panel styling of its own beyond what it needs to be
visible, no accessible name, no landmark role, nothing for a later story to
have to undo.

### 6. The board fills the window in Chromium

This section is phase 2 — see Sequencing below. It is not started until the
owner has signed off on the layout.

In Firefox the board grows to fill the room it is given. In Chromium it does
not: it settles at a size of its own choosing and ignores the rest of the
window, and only browser zoom changes it. After this story both browsers
behave the same way, and the sizing rules of section 4 hold in both.

A lead, not a prescription: `100cqmin` can only resolve against a container
whose size is definite, and today `.app__board`'s size arrives through a
chain of `flex: 1` items rooted in a `min-height: 100vh`. Chromium and
Firefox do not agree on how definite that is. Section 4 gives `S` as an
expression in `W` and `H` — computing the play area's size from the window
directly, rather than inheriting it down a flex chain, would remove the
disagreement rather than paper over it. However it is done, both browsers
have to end up in the same place.

## Sequencing

The story is implemented in **two phases, with an owner gate between them**.

**Phase 1 — the layout** (sections 1–5). Everything about the three regions,
the two orientations and the sizing rules, done against Firefox, where the
board already grows the way it should.

**Gate.** Implementation stops. The owner checks the layout in a real
window — both orientations, oblong and near-square, the board centred, the
side regions holding close to it — and says whether it is right before
anything else is touched.

**Phase 2 — Chromium** (section 6). Taken up only after the gate passes.
Expect this phase to be conversational rather than a clean run of steps: the
owner is the only one who can see what a browser actually draws, so it
proceeds in short cycles of change, look, and adjust.

The split is deliberate. Phase 1 is checkable in the browser that already
behaves, so a fault found at the gate is a fault in the layout and nothing
else; phase 2 then has one variable in it.

## Out of scope

- **The start screen and the game-over panel.** Both keep filling the cabinet
  exactly as they do today. This story is about the in-game screen only.
- **What eventually goes in the reserved region.** A later story decides
  that; this one only makes the room.
- **The rules, the ruleset document, and anything about how the game is
  played.**
- **Board, ship, site and HUD artwork.** Sizes change; nothing is redrawn.
- **Phone-sized screens**, per the floor note in section 4.
- **Accessibility.** Per the accessibility section of `CLAUDE.md`, this story
  does not spend work preserving accessible behaviour and adds no plan step
  for testing it. Existing automated tests are updated where the path is
  straightforward. If a layout change costs an accessible behaviour, the cost
  is accepted and recorded in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Notes

- **Verification is the owner's, in a real browser.** The test environment is
  jsdom, which has no layout: it can confirm the three regions are rendered
  and can be given whatever structural assertions are worth having, but it
  cannot confirm a single size or position. The layout itself is checked by
  the owner resizing a real window in both Firefox and Chromium. No test
  script, fixture page or harness is to be written for that check.
- **Orientation is a property of the window, not the device.** A window
  dragged from tall to wide re-lays out live; nothing here depends on a
  device class, a user agent, or a JavaScript resize listener if CSS can
  express it.
