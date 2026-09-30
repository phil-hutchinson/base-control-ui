# Story 00000118 — Improve pip rendering

## Summary

The pips under each side's score are drawn more cleanly. Their circles
come out smooth, not jagged, and the cross drawn through a pip whose
energy is held back comes out as two even lines that no longer thin out
or break up.

## What changes

- **Every pip's outline** is a smooth circle at every size, in portrait
  and landscape, including the slightly smaller pips of a six-pip row.
- **A lit pip** is still filled with its node's colour (gold for a node
  with no colour of its own) and still glows, with a round glow.
- **A crossed pip** (the Required option, while a side holds a node but
  not its own) still shows two diagonal lines in its node's colour,
  cutting the circle into quarters, now drawn evenly across the circle.

## What does not change

- **What the pips mean.** How many pips a row has, which ones light or
  are crossed, their order, their colours and the numbers under them all
  stay as they are.
- **The pips' size and spacing**, and the layout of the score cell.
- **The ruleset.** This is a drawing change only: no rules-version bump
  and no changelog entry.

## Verification

- Unlit, lit and crossed pips look smooth in portrait and landscape.
- A six-pip row (the Double option) looks as smooth as a shorter one.
