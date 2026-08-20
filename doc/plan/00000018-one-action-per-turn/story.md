# Story 00000018 — One action per turn

## Summary

A turn becomes **one action** instead of two.

Story 16 already cut a ship to one action per turn, and gave a winning
attacker the square its victim left. Between them, a turn can now do a great
deal: two ships each moving three squares, or a ship taking a node off an
opponent while another wakes a second node. The game reads better if a turn is
a single decision, and the opponent gets to answer it before anything else
happens.

This is deliberately **not** a removal of the concept of an action. Actions
stay in the rules, in the vocabulary and in the code; the number of them in a
turn changes from two to one. If a later story wants three, it should be a
constant change, not a restoration.

Alongside it, the turn indicator loses its action count and becomes a plain
statement of who is up: **`GREEN TO PLAY`** / **`RED TO PLAY`**, in that
player's colour.

### A note on words

Planning documents say **ply** for the rules' and the UI's **turn**, and
**hub** for the player's **node** (CLAUDE.md, Vocabulary). **Action** is the
same word everywhere, and this story is entirely about how many of them a ply
holds.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.8**.
This story takes it to **0.9** — a gameplay change, so it earns a changelog
entry and a version bump (tagging remains on hold, per CLAUDE.md).

The code side is small and already centralised: `ACTIONS_PER_PLY` in
`src/rules/gameState.ts` is the single number, and `src/hud/TurnIndicator.tsx`
renders the visible banner.

## In scope

**1. The rules edit, first and on its own.** Version 0.8 → 0.9, with a
changelog entry. Sections that state or depend on the count:

- **§2** — "A turn is two actions"; "Action — one of the two things a player
  does on their turn".
- **§5** — the count itself, and the paragraph on taking both actions if two
  are available. §5's "a ship may take at most one action per turn" and "a
  turn's two actions always involve two different ships" become redundant and
  should go, not be left as dead text.
- **§7.1** — "before the attacking player's second action" no longer
  describes anything.
- **§8.5** — the stranded obligation is written in terms of two actions
  ("with two ships stranded, both actions go to clearing them"). Under one
  action a player frees one stranded ship per turn and the rest wait. The
  principle is unchanged: while any ship owes an action, the turn's action
  must free one.

Section 8's clocks are counted in **turns**, not actions, so §8.3's nine-turn
life, §8.4's payouts and §9's 100 rounds are untouched. Their arithmetic still
holds; what changes is how much a player can do inside each of those turns.

**2. The constant.** `ACTIONS_PER_PLY` goes to 1. Nothing that consumes it
should need restructuring — if something does, that is the story's real work
and worth calling out.

**3. The stranded obligation** follows the rules edit: one action, one ship
freed, the rest still owing on later turns.

**4. The turn indicator.** `GREEN TO PLAY` / `RED TO PLAY`, all caps, coloured
to match the player about to act. No action count, no possessive. The wording
comes from `turnIndicatorText` in `announcements.ts`, which the indicator
renders verbatim; that function is this story's only change to that file.

## Out of scope

- **Any accessibility work.** Nothing in the accessible grid, the live region
  or focus handling is to be touched. That includes
  `announcementForSession` and the sentences it composes — "Green has 1 action
  left", "Red's turn, 2 actions left" — which will read wrongly under 0.9 and
  are knowingly left that way for the accessibility story to correct.
- **A test fixture that adjusts the board** to make scenarios easier to reach.
  Not needed here.
- **Rebalancing anything for the slower pace** — node lifetimes, energy
  payouts, game length. Halving what a player does per turn will change how
  the game feels, and that should be judged from games played under 0.9, not
  guessed at now.
- **Removing the action concept**, collapsing `ACTIONS_PER_PLY` away, or
  simplifying the ply machinery because the count is now 1.
- **Any other HUD change.** The indicator's wording and colour only.

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.9, and the changelog has an
  entry.
- A ply ends after one action: green moves, and it is immediately red's turn,
  with all of §8.7's end-of-turn sequence having run.
- A ship that has acted cannot act again, and no second action is offered to
  the same player.
- Stranded ships: one owing ship is freed by the turn's single action; with
  two owing, the second still owes on the following turn; the waiver for a
  stranded ship with no legal move still applies.
- A ply with no legal action still passes cleanly and still runs §8.7 in full.
- The turn indicator reads `GREEN TO PLAY` and `RED TO PLAY`, in each
  player's colour, and never mentions actions.
- The full-game test from story 12 runs to completion and ends where the
  100-round rule says it should.
