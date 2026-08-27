# Story 00000025 — Random bay return

## Summary

A ship that loses a fight — or that draws one — goes back to a bay chosen at
**random** from the empty bays, instead of walking a numbered ring that
advances one bay each turn.

The travelling return position exists to keep the game from being a pure
strategy puzzle in the one place a fight sends a ship home, but it is
deterministic: both players can see exactly where a beaten ship will land,
this turn and every turn after. Making the destination random gives the same
place in the game a genuine unknown, and it removes a whole mechanism —
numbering the bays, drifting the number at the end of every turn, and marking
two cues on the board so players can follow it.

The game already has one random element (which site wakes next, rules.md
§8.6), and it already has the seeded generator that makes such a game
replayable. This adds a second draw from the same stream.

### A note on words

Planning documents say **ply** for the rules' and the UI's **turn**
(CLAUDE.md, Vocabulary). **Bay** and **site** are the same word everywhere.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.9**.
This story takes it to **0.10** — a gameplay change, so it earns a changelog
entry and a version bump (tagging remains on hold, per CLAUDE.md).

What exists today:

- **`src/rules/bays.ts`** — `CLOCKWISE_BAYS` (the fourteen bays as a ring
  starting at H15), `STARTING_RETURN_POSITION_INDEX`,
  `driftReturnPositionIndex`, and `bayNumberingFrom`.
- **`src/rules/gameState.ts`** — `returnPositionIndex` on the state.
- **`src/rules/combat.ts`** — `returnPositionSquare` (position 1) and
  `receptacleBay` (the first empty bay from position 1).
- **`src/rules/endOfTurn.ts`** — §8.7 step 6, the end-of-turn drift.
- **`src/board/`** — the two on-board cues: `ReturnPositionMark` and
  `ReceptacleMark` in `BoardSquare.tsx`, their CSS, the `ReturnCue` type and
  wording in `squareLabel.ts`, and the code in `Board.tsx` that decides which
  bay carries which cue.
- **`src/rules/random.ts`** — `drawIndex(seed, count)`, and the
  `randomSeed`-in-state threading pattern that `drawReplacement` in
  `src/rules/nodes.ts` already follows.

## In scope

### 1. The rules edit, first and on its own

Version 0.9 → 0.10, with a changelog entry, in its own commit ahead of the
code.

- **§7.1 is rewritten.** A returning ship goes to a bay **chosen at random
  from the bays that are empty at that moment**, every empty bay equally
  likely. The bay numbering, return position 1, H15 as its starting point,
  and the counter-clockwise drift all go.
- **The mutual return keeps its order.** The attacker is placed first and the
  defender is then drawn from the bays still empty. Which ship is drawn first
  makes no difference to the odds, but fixing the order is what lets a
  seeded game replay exactly, so the rules keep saying it.
- **"There is always somewhere to go" survives**, and is simpler: a returning
  ship was by definition on the board and not in a bay, so the set of empty
  bays is never empty; with two ships returning from one fight, at least two
  bays are empty, so the attacker's placement can never leave the defender
  without one.
- **§8.7 loses step 6.** The end-of-turn sequence goes from six steps to
  five. Nothing else in it moves.
- **§1's "The game has one random element: which node site wakes up next"**
  becomes two: which site wakes next, and which bay a returning ship lands
  in.
- Any other sentence that leans on the old mechanism — §3.1's note that bays
  are not owned is unaffected, but the section should be read through for
  stragglers.

### 2. The draw

The bay is drawn from the game's existing seeded generator
(`src/rules/random.ts`, `drawIndex`) and from the **same** `randomSeed` on
the state that site replacement draws from, threaded the same way: seed in,
square and next seed out, with the caller storing the advanced seed. A game
recorded with its opening seed replays exactly, including its fights.

`Math.random` is banned in game code (CLAUDE.md); this must not be the
exception.

`receptacleBay` — "the first empty bay from position 1" — is replaced by a
draw over the empty bays. It has two callers, both in `applyAttack`
(`src/rules/ply.ts`): the mutual return, which calls it twice against
successive states, and the single loser's return. The second call in the
mutual case must draw from the state that **already contains** the attacker,
exactly as it does today, so the two ships cannot be handed the same bay.

### 3. The state and the ring helpers go

`returnPositionIndex` comes off `GameState`, and with it
`STARTING_RETURN_POSITION_INDEX`, `driftReturnPositionIndex`,
`bayNumberingFrom` and `returnPositionSquare`. `CLOCKWISE_BAYS` also loses
its last consumer — `src/rules/fleet.ts` writes the starting fleet's squares
out in full rather than reading the ring — so it goes too. `BAYS` and
`isBay` stay: they are the fourteen bays themselves, which nothing here
changes.

Delete what becomes unused rather than leaving it in place unreferenced.

### 4. The board stops marking the next return bay

Both cues go completely: the stroked corner triangles for return position 1,
the filled ones for the receptacle, the `ReturnCue` type and its accessible-name
wording, the CSS, and the logic in `Board.tsx` that works out which bay gets
which. A bay square goes back to looking like a bay and nothing more.

There is no replacement cue. The destination is unknowable until the fight
happens, so there is nothing to show.

### 5. `README.md`

The "How it plays" paragraph currently says the bay a beaten ship returns to
"travels around the edge of the board as the game goes on, and the board marks
where it is." That is no longer true and must be replaced — a beaten ship is
pushed back to a bay chosen at random. Run `/update-readme` for the rest of
the diff.

`CLAUDE.md`'s one-line description of the project ("which node site wakes up
next is random") is now half the story; extend it in the same spirit as §1.

## Out of scope

- **Any change to what a returning ship loses.** A ship arriving in a bay
  still ends up with no shields (§3.1), and returning by choice (§7.2) is a
  perfectly ordinary move, untouched.
- **Any change to combat itself** — who may attack whom, who wins, what the
  winner keeps, or the winning attacker's advance.
- **Any change to site randomness** (§8.6), the generator, or how the opening
  seed is chosen (`src/game/seed.ts`).
- **Game recording and replay.** This story keeps the property that a seeded
  game replays exactly; it does not build anything that records or replays
  one.
- **Rebalancing for the new uncertainty.** Whether a random return makes
  attacking better or worse is a question for games played under 0.10.
- **Accessibility work**, per the accessibility section of `CLAUDE.md`. The
  square's accessible name loses its return-cue segment because the thing it
  described no longer exists — that is a removal, not a regression, so it
  needs no entry in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`. Existing
  automated tests are updated where the path is straightforward; no plan step
  is added for testing accessibility.

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.10, and the changelog has an
  entry.
- A beaten ship lands in an empty bay, and never in an occupied one.
- Over many fights from one starting state with different seeds, returns are
  spread across the empty bays rather than concentrated on one — the draw is
  actually random, not a dressed-up first-empty-bay.
- A drawn fight returns both ships, to two different bays, attacker drawn
  first.
- The same opening seed and the same sequence of actions produce the same
  bays every time; a different seed produces a different game.
- With thirteen bays occupied, the single empty bay is the one used; with
  twelve occupied and two ships returning from one fight, both are placed.
- Nothing on the board marks a return position or a receptacle, and no
  square's accessible name mentions one.
- The end-of-turn sequence runs its five steps and no longer drifts anything.
- The full-game test from story 12 still runs to completion.
