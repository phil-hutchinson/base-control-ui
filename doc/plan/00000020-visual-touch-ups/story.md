# Story 00000020 — Visual touch-ups

## Summary

A pass of purely visual changes to the board and the surrounding frame. No
rule changes, no gameplay changes, and no change to `rules.md` or
`RULES_VERSION`. Accessibility work is deliberately **out of scope** — a
later story picks it up — so existing accessible names, hidden sentences and
`aria-hidden` markings stay as they are unless a change here makes one
factually wrong.

## In scope

### 1. New site artwork

`SiteMarker.tsx` / `SiteMarker.css` are redrawn. A charged site is the only
kind a ship normally stands in front of, so for the other three states the
border alone has to survive being partly covered.

- **Depleted** — small grey circle at the square's centre, grey border.
- **Dormant** — small white circle at the centre, white border.
- **Active** — small orange-yellow circle at the centre, orange-yellow
  border.
- **Charged** — small orange-yellow circle at the centre, with a radial
  gradient spreading out from it to whitish-yellow at its outer edge. The
  gradient circle is larger than the square and clipped to it, so it fills
  almost all of the square. No border — the artwork covers where one would
  be.

The three bordered states use the same border attributes as the bay borders
(`--bay-border` in `Board.css`), differing only in colour.

### 2. No row or column labels

Drop the lettered and numbered strips and the tracks that hold them, so
`.board-frame` becomes a plain 15 x 15 of playing squares, sized and
recentred as such. Square _names_ are unaffected: A–O and 1–15 still name
squares in the rules and in accessible names, they are just no longer drawn
on screen.

### 3. Faster stranded flash

The blink that marks a ship owing a move drops from 1s to **0.25s**
(`board-square-owes-action-blink` in `BoardSquare.css`).

### 4. Unlit shield arcs

A ship draws all four shield arcs. Lit ones keep the ship's colour; the
positions the ship does not currently have are drawn in grey, so the ring
shows how much shielding is missing as well as how much is present.

### 5. One containing box

`.app__cabinet` grows to hold everything — the title, the HUD strip and the
board — instead of the board alone. The HUD's own separately-coloured panel
goes away, since it is now inside the same box.

### 6. Full-box game over screen

When the game ends, the game-over screen takes over the whole cabinet box:
the title, HUD and board are switched off, leaving the "Game over" heading,
both final scores and the "Play again" button.

The final scores must not appear until any energy scored on the last turn
has finished counting up on the HUD — the panel waits for the count-up to
settle, then shows the settled totals.

## Out of scope

- Accessibility (a later story).
- Any change to the rules, the ruleset document, or how the game plays.
