# Story 00000050 — Quick Guide

## Summary

The start screen gains a **Quick Guide** button, directly below the game
title and above the three option groups. Pressing it replaces the start
screen with a **guide screen**: a scrollable page of five short sections,
each a paragraph of text and one diagram, with a **back** button that
returns to the start screen with the three options exactly as they were.

The guide is a first read for someone who has never played, not a reference.
It covers scoring, movement, refuelling, the node lifecycle, and how the
next charged node is chosen. It deliberately leaves out combat.

## The guide's text

This is the copy, verbatim. The five headings are the five sections, each
followed by its paragraph and then its diagram.

> **QUICK GUIDE**
>
> The object of the game is to have the most points at the end of the game.
> At the end of each turn, gain one point for each spaceship you have in a
> charged node.
>
> _{Diagram 1}_
>
> **MOVEMENT**
>
> One spaceship can move per turn. For longer moves, fuel is required, as
> follows:
>
> _{Diagram 2}_
>
> **REFUELING**
>
> Spaceships can hold up to six fuel. At the end of a player's turn,
> spaceships sitting on planets regain one fuel. If a player has only one
> spaceship gaining fuel and it has room, it gains two fuel.
>
> _{Diagram 3}_
>
> **NODE LIFECYCLE**
>
> There are always four charged nodes. When a spaceship enters a charged
> node, a countdown begins before it is depleted. The spaceship gains 6
> points if it stays on the node until it becomes depleted. A charged node
> also becomes depleted if the spaceship leaves it. When the node becomes
> depleted, a new charged node is created. If a node depletes with a
> spaceship still inside it, the spaceship is trapped for 5 turns.
>
> _{Diagram 4}_
>
> **NEW CHARGED NODE SELECTION**
>
> Three indicators appear on the board, with one, two, and three rings,
> rotating at the end of each turn. When a new charged node is needed, it
> appears at the three-ring indicator — and all three indicators are then
> replaced by a fresh set elsewhere.
>
> _{Diagram 5}_

## Vocabulary: a knowing exception

The guide says **points** and **fuel**. The rules, the HUD and the game-over
panel say **energy** and **power**, and this story **changes none of them** —
not `rules.md`, not `README.md`, not the UI. The owner has decided the
guide's words are the friendlier ones for a first read and that renaming the
rest of the game is a separate question, not this story's.

This is recorded here so that a reviewer reads it as a decision rather than
a slip, and so that nobody "fixes" the guide's wording into line later
without asking.

## The diagrams

All five are **rendered from the app's own components**, not drawn as static
assets. Ship art and node art have already been redrawn three times (stories
00000023, 00000040, 00000041); a static asset would be wrong within two
stories, whereas a rendered one cannot drift.

`BoardSquare` is the piece to build on. It is already purely presentational —
a plain `<div>` taking `isPlanet`, `planet`, `nodeState`, `cyclePosition`,
`priority`, `countdownNumber` and `occupant`, with no session, no state and
no interactivity — so a diagram is a small fixed grid of `BoardSquare`s with
hand-written props. `Board` itself is **not** reusable here: it is bound to a
`Session`, is a full 15 × 15, and is an interactive `role="grid"`. Nor is
`EnergyOverlay`, which also takes a `Session`; the "+3" in diagram 1 is the
guide's own drawing, matching the overlay's appearance.

**Every ship in every diagram is green**, whatever it is doing, so that
colour never reads as meaning something it does not. The guide never shows a
red ship, which is consistent with combat being out of scope.

The five:

1. **Scoring.** Three spaceships, each on a charged node, the three nodes
   showing remaining-turn numbers **3, 1 and 2**, and the three ships each
   carrying a **different amount of fuel**. An arrow, then a graphic reading
   **+3**, so the picture reads as the three ships producing that total. The
   differing fuel levels and differing countdowns are the point: neither
   changes what the position scores.
2. **Movement.** A 5 × 5 grid with a **fully-fuelled** spaceship in the
   centre square, and a large number on each square giving what it costs to
   move there: **0** on the four orthogonal neighbours, **1** on the four
   diagonal neighbours, and **2** on the twelve squares two steps away that
   are reachable — the four straight-line-of-two and the eight L-shapes. The
   **four corner squares are not reachable in one move**; they carry no
   number, and may be left undrawn entirely.
3. **Refuelling.** A spaceship on a planet with **four** fuel, an arrow, and
   the same spaceship on the same planet with **six** — the double rate, one
   turn.
4. **Node lifecycle.** A charged node showing **1** turn remaining with a
   spaceship on it, an arrow, and the same square as a depleted node with the
   spaceship still on it showing its trapped count of **5**.
5. **Node selection.** One indicator through a full rotation: **three rings →
   one ring → two rings → three rings**, arrows between.

The diagrams sit at whatever size reads on a phone and on a desktop window
alike; they are pictures in a page, not a board to be played on, so they
carry no interactivity, no selection marks and no square names on screen.

## Navigation

`useAppScreen`'s `Screen` union gains a third value for the guide, alongside
`start` and `game`, with an action to open it and an action to leave it. The
guide is reachable **only from the start screen** and returns **only to the
start screen**:

- The three options are held where they already are, so opening and closing
  the guide leaves Ships, Rounds and Timer exactly as they were set.
- No game is started, dispatched to, or disturbed by any of this.
- There is no route to the guide from a game in progress, and no Play button
  on the guide.

## In scope

- The **Quick Guide** button on the start screen, below the title and above
  the Ships group.
- The guide screen: the copy above, the five diagrams, and a back button.
- A small diagram component built on `BoardSquare`, plus the fixed
  positions each of the five diagrams needs.
- Whatever `App.tsx` and `useAppScreen` need to show a third screen.
- The guide's own styling, following the start screen's, and reading
  correctly at the window sizes story 00000039's layout covers, in both
  orientations.

## Out of scope

- **Combat.** Deliberately absent. Attacking, what a fight costs, where the
  two ships go, and the protection a node or a planet gives are all left for
  the player to meet in the game.
- **Renaming energy to points or power to fuel** anywhere outside the guide's
  own copy — see above.
- **Any rules change.** The guide states what the ruleset already says, so
  `rules.md` keeps version 0.29, `RULES_VERSION` does not move, and there is
  no changelog entry.
- **Reaching the guide from inside a game**, or any in-game help, tooltip or
  hint.
- **Animating the diagrams.** The arrows carry the before-and-after; nothing
  moves.
- **A full rules reference.** Anything a player needs beyond a first read is
  in `rules.md`, and this story does not link to it or ship it.
- **Interactivity of any kind on the guide** — no clickable squares, no
  worked example the reader plays through.

## Verification

- The start screen shows a **Quick Guide** button between the title and the
  Ships group.
- Pressing it shows the guide; pressing back returns to the start screen with
  Ships, Rounds and Timer still set the way they were left, and no game
  started.
- The guide's five sections appear in order with the copy above, and each has
  its diagram.
- Every ship drawn anywhere in the guide is green.
- Diagram 1 shows three charged nodes reading 3, 1 and 2, three ships at
  three different fuel levels, and **+3**.
- Diagram 2's centre ship is at full fuel; the four orthogonal neighbours
  read 0, the four diagonals read 1, the twelve reachable two-step squares
  read 2, and the four corners carry no number.
- Diagram 3 shows four fuel becoming six on a planet; diagram 4 shows a
  charged node at 1 becoming a depleted node at 5 with the ship still on it;
  diagram 5 shows three rings to one to two to three.
- The diagrams are built from `BoardSquare`, so a change to ship or node art
  changes them too.
- The guide reads correctly on a phone-sized window and a desktop one, in
  portrait and landscape.
- `RULES_VERSION` and `rules.md` are both unchanged at 0.29.
- Typecheck, lint, format check and the whole test suite pass.

## Notes

Per the pre-release stance in `CLAUDE.md`, no accessibility work is owed by
this story and no plan step is added for testing it; anything knowingly
given up goes in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`.
