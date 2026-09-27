# Story 00000102 — Coloured indicators

## Summary

The pips under each player's score show how many charged nodes they hold,
but every lit pip is the same gold, and every pip's outline is the player's
own colour. Under the steal playstyle each node has a colour of its own —
and with player-matching nodes, two of them are the players' own red and
green — so the pips can say not just _how many_ nodes a player holds, but
_which_ ones.

This story colours the pips by the nodes they stand for. It is a display
change only: nothing about how the game is played, or what a turn pays,
changes.

## What changes

- **Every pip's outline is white**, for both players, lit or not.
- **A lit pip is filled with the colour of the node it stands for** — the
  same colour the board draws that node in. Under the three playstyles
  other than steal, every charged node is gold, so every lit pip is gold,
  as today.
- **REQUIRED, without the player's own node.** Each held node's pip is
  still marked with an X, as today, not filled. The X is drawn in the
  colour of the node it stands for, inside the white outline.
- **DOUBLE, holding the player's own node.** The two pips the own node
  counts for are both filled with the player's own colour.
- **Order under DOUBLE and REQUIRED.** The lit pips run own node first,
  then the opponent's node, then the rest. With player-matching nodes off,
  the order is unchanged.
- **The number row** beneath the pips is unchanged, including which value
  is highlighted in the player's colour.

## What does not change

- How many pips there are, how many light, and when an X is shown.
- Anything about the rules, so there is no ruleset version bump and no
  changelog entry.
- The live region and the hidden score sentence.

## Accessibility

The pip colours say which nodes are held by colour alone, and the whole pip
row is decorative. This is accepted and recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Verification

- Under steal, a player holding nodes sees each lit pip filled in that
  node's board colour, inside a white outline.
- Under DOUBLE, holding the own node fills two pips in the player's colour,
  first in the row; the opponent's node, if held, comes next.
- Under REQUIRED without the own node, each held node shows an X in that
  node's colour and no fill, the opponent's node first; once the own node is held, the pips fill own node first.
- Under any other playstyle, lit pips are gold in white outlines.
