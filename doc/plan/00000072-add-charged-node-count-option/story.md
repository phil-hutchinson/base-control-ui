# Story 00000072 — A chosen number of charged nodes

## Summary

Today the board keeps **four** nodes charged, and that number is written
into the rules as a fact about the game. This story makes it a **choice the
players make before play begins**, like the fleet size, the number of rounds
and the clock already are: **five or four charged nodes, with five the
standard game**.

The start screen gains a fourth option group, **CHARGED NODES**, sitting
**after Ships and before Rounds**, offering **5** and **4** with **5**
selected by default — largest first, leftmost the default, exactly as Ships
does.

Because five becomes the default, this story also **changes the standard
game**: a board that has been dealing four charged nodes since version 0.21
now deals five. Four remains playable, one click away.

Nothing else about a node changes. It is born, waits inactive with a
priority, is charged, is held, depletes, traps or expires, retires — all at
the same rates, from the same pools, under the same placement constraints.
Only how many are lit at once, and where that number comes from, moves.

Two smaller things ride along. The HUD's **score pips** are re-cut: a
side's row becomes as long as the most charged nodes that side could ever
hold at once — the **smaller of its fleet size and the game's charged-node
count** — rather than always as long as the board's charged count, which has
over-drawn the row for a three- or four-ship fleet since version 0.28. And
the Clock group's **`Unlimited`** label becomes **`UNLIMITED`**.

## What changes

- **The charged-node count is chosen before play**, five or four, and is
  **fixed for that game's lifetime**, exactly as the length in rounds is.
- **Five is the standard game** and the default everywhere a default is
  reached for.
- **The opening deal follows the choice**: five charged and three inactive
  (eight nodes) at five, four and three (seven nodes) at four. Nothing is
  dealt depleted, as now.
- **The end-of-turn charge follows the choice**: the shortfall is measured
  against the game's own number, not against a constant.
- **The score pips are re-cut against both numbers**: a side's row is as
  long as the most charged nodes that side could ever hold at once — the
  **smaller of its fleet size and the game's charged-node count**. Six ships
  against five nodes draws five pips; three ships against five nodes draws
  three.
- **`TARGET_CHARGED_NODES` goes away.** No module-level constant may state
  the target any more, because there is no longer one answer to state.
- **`UNLIMITED`** replaces `Unlimited` on the start screen.

## What does not change

- **Three inactive nodes**, always, at both counts, with priorities 1, 2 and
  3 and the same rotation and the same refill (§8.2). The queue is sized by
  the _shortfall_ it must cover, not by the target it fills towards — see
  below — so it needs no change.
- **Where a node may appear** (§3.2): the same six constraints, the same
  widening after the first draw of a refill, the same weighting, the same
  fallback.
- **How long a node lives** (§8.3): baseline with no countdown, 11 turns
  once a ship steps on, 11 as a trap, 2 as an exit.
- **Energy** (§8.4): one per charged node held, nothing subtracted. Five
  charged nodes simply mean a player standing on all of them collects five.
- **Fleet size, rounds, the clock, movement, combat, power, planets, the
  trap and its relief.** None of them consult this number.
- **The five- and four-node games use the same rules.** This is one game
  with a dial on it, not two variants.

## Why the queue does not grow with the target

§8.2's three inactive nodes are sized against the largest shortfall a single
turn can produce, and that argument does not mention the target at all: a
turn is one action, so **at most one countdown can start per turn** and
therefore at most one node expires per turn, plus at most one node a player
can walk off in the same turn — **never more than two**. Three inactive
nodes cover a shortfall of two whether the board is filling towards four or
towards five. The board is still never left short at the end of a turn.

What does change is the arithmetic around the board's occupancy: at five
charged the board carries eight nodes before any depleted ones are counted,
where it carried seven. Appendix B's measured figures are stated at four
charged today and must be re-stated for five.

## The pip row, re-cut

A side's pip row is a picture of what that side could be holding. Today it
is drawn to the board's charged-node count, which was right while every
fleet had at least as many ships as the board had nodes — but fleets now run
as small as **three a side** (version 0.28), so a three-ship side has been
shown four pips, two of which it could never light at once. A ship holds a
charged node by standing on it, so **the most a side can hold is the smaller
of its ship count and the board's charged count**, and that is the length
the row should be.

This is a display change only. Nothing in `rules.md` describes the pips, no
rule is added or altered by it, and it changes no game state — it is folded
into this story because this story is already re-cutting the row against a
number that now varies, and both sides of that `min` are options set on the
same screen.

Both players always have the same fleet size (§4), so the two rows stay the
same length as each other; the row is still derived per side rather than
from a game-wide number, because that is where the fact lives.

## Effect on the game

A fifth lit node is a fifth thing to want, on a board whose fleets are three
to six ships a side. At six a side, holding everything is still out of
reach but less so; at three a side, a fifth node mostly means a fifth place
you are _not_, and the board spreads thinner. The pools a refill draws from
narrow slightly, since one more square and its neighbours are blocked at any
moment, and the node count Appendix B watches breathes one higher.

Which of the two makes the better game is exactly what the option exists to
find out. This story does not retune anything else against five — not the
countdown lengths, not the pressure the weighting applies, not the game
length.

## In scope

### 1. The rules edit, first and on its own

`doc/ruleset/rules.md` goes from **0.29** to **0.30**, with a changelog
entry, in its own commit ahead of the code. This is a gameplay change.
Tagging stays on hold (`CLAUDE.md`).

The document currently states "four charged" as a fact in a dozen places.
Each becomes the chosen number, phrased the way §4 and §9 already phrase a
choice — named where the choice is defined, referred back to elsewhere.

- **§2, the Node entry** — the board carries the **chosen number** of
  charged nodes, five or four, and three inactive ones, plus however many
  are depleted.
- **§8.1** — the choice is defined here, since this is where a node's states
  and the opening board live: **five or four charged nodes, chosen before
  play begins, five the standard game**, then the shortfall sentence and the
  opening deal both stated against it. The opening board is **eight nodes at
  five, seven at four** — the charged ones drawn under §3.2 at random, each
  at baseline with no countdown, the other three inactive by the refill
  procedure with priorities dealt at random, nothing depleted.
- **§8.2** — the shortfall is against the chosen number. The three inactive
  nodes, the priorities, the rotation, the sweep-and-refill and the refill
  procedure are all unchanged, and the section should say plainly that the
  queue's size is unrelated to the target.
- **§8.3** — the "shortfall against four charged" left by a ship walking off
  becomes the shortfall against the chosen number.
- **§8.4** — "The board never charges more than four nodes at once" becomes
  the chosen number. The collection rule itself is untouched.
- **§8.6 step 4** — the shortfall is against the chosen number.
- **§9 and §10** — where they list what is chosen before play, the
  charged-node count joins the fleet size, the rounds and the clock. §10's
  opening sentence is the natural place to say the full set.
- **Appendix B** — re-stated for a board whose charged count is chosen. The
  "never short" argument stands as written (it never depended on the
  target). The **measured** figures — the node count breathing between seven
  and eleven, the refill pool sizes 25/38/34, the trio's mean smallest gap
  of 4.78 against 3.78 unweighted — are quoted from the app's own long-run
  test at four charged; they are **re-measured at five** and the appendix
  states both, or states five and says how four differs. **No figure may be
  left claiming a number the board no longer produces, and none may be
  invented** — if a figure cannot be re-measured from the existing test, it
  is re-stated as the approximation it is rather than guessed at.

### 2. The count becomes part of the game

The number must be **a property of the game state**, set once when the game
starts and read from there by everything that needs it. It cannot be derived
from the board the way fleet size is derived from `state.ships` — a board
that is legitimately one node short mid-sequence would derive the wrong
answer — so, like `lengthInRounds`, it is stored.

- `TARGET_CHARGED_NODES` is **deleted**, replaced by the offered counts, the
  default (**5**) and a type guard, in the shape `fleet.ts` and
  `gameLength.ts` already use for their own options.
- `dealOpeningBoard` deals against the count it is handed. Its documented
  draw order is otherwise unchanged: the charged squares one at a time by
  `drawNodeSquare`, then one `refillQueue` call for the three inactive ones.
  The deal's seed-step count therefore becomes **nine** at five charged
  (5 + 4) and stays eight at four, and the comment saying so is corrected.
- `runCharging` measures its shortfall against the state's own count.
- The `new-game` intent carries the chosen count, alongside the seed, the
  length and the fleet size; the reducer uses what it is handed and reaches
  for no default of its own.
- `startingGameState` validates it — a count that is not one of the offered
  ones is a caller bug and throws a `RangeError`, exactly as a bad fleet
  size does.

Whether these arguments stay positional or become an options object is the
implementation plan's call; `startingGameState` gaining a fourth optional
positional parameter is worth a moment's thought rather than a reflex.

### 3. What the player sees

- **The start screen gains a fourth group**, legend **Charged nodes**
  (the stylesheet uppercases it), between Ships and Rounds, offering **5**
  and **4** with 5 checked at first — rendered by the same `OptionChoice`
  the other three groups use, with no new styling.
- **The chosen count survives a return to the start screen**, like the other
  three options, so a second game starts from the same choices.
- **The score pips** are as many as that side could ever hold at once — the
  smaller of the side's ship count and the game's charged-node count — at
  their current size and spacing. `ScoreDisplay` derives both numbers from
  the state it is already given; nothing about a pip's size, colour or
  lighting rule changes. The longest row any combination of options can
  produce is **five** (six ships, five nodes); the shortest is **three**.
- **`ScoreDisplay`'s `SCORE_DIGITS` comment** is corrected: a turn now pays
  at most the chosen number of nodes. Four digits stays, for the fixed-width
  readout.
- **`App.css`'s sizing comment** is corrected. It currently reasons from a
  four-pip row at about `0.61P` and concludes the title and turn indicator
  (about `0.72P`) are the widest things in the info column; the longest row
  this story can produce — five pips — is wider than either. **`--region-extent` is not re-derived** — the column
  is back to roughly the content width it was sized for before version
  0.21 — but the comment must stop asserting something the app no longer
  does. If the wider row actually breaks the landscape layout at the floor
  end of the clamp, that is a finding to raise, not to silently retune.
- **`UNLIMITED`** replaces `Unlimited` in the Clock group's labels. The
  `6s` / `4s` / `2s` labels are **left exactly as they are**, with the `s`
  for seconds lowercase — the owner's decision, confirmed while this story
  was written. This is a one-label change, not a typographic pass over the
  screen.
- **`README.md`** describes the choice in the player's words: a game opens
  with five lit nodes, or four if you chose four, and the board is kept
  topped up to whichever you chose. Run `/update-readme` for the rest of the
  diff.

### 4. The tests

Most of the suite derives from the constants or from state and needs
nothing. The ones that do:

- **`nodes.test.ts`** — the deal is asserted at **both** counts: five
  charged and three inactive, four charged and three inactive, nothing
  depleted, every square legal under §3.2.
- **`charging.test.ts`** — the shortfall cases are asserted against a
  state's own count rather than a module constant, at both counts.
- **`openingBoard.test.ts`**, **`nodePool.test.ts`**, **`fullGame.test.ts`**
  — must pass at **both** counts. `nodePool.test.ts` is the long-run
  economy test and the source of Appendix B's figures, so it is the natural
  place to run the board at five and read the re-measured numbers off; its
  tuned floors are re-checked at five and retuned there if one of them was
  fitted to four.
- **`seededReplay.test.ts`** — recorded expectations are **regenerated**,
  not worked around: at five charged the deal consumes a ninth seed step, so
  a given seed deals a different board. The property guarded — same seed,
  same game — is exactly as true afterwards.
- **`gameState.test.ts`** — the new field is set from the argument, defaults
  to five, is rejected when invalid, and is fixed for the game's lifetime.
- **`session.test.ts`**, **`useAppScreen.test.tsx`**, **`App.test.tsx`** —
  the option reaches `new-game` from the start screen, the default is 5, and
  a chosen 4 produces a four-charged game.
- **`StartScreen.test.tsx`** — the fourth group, its order among the others,
  its options, its default, and `UNLIMITED`.
- **`ScoreDisplay.test.tsx`** — the pip row's length is the smaller of the
  side's ship count and the game's charged-node count: five pips at six
  ships and five nodes, four at six ships and four nodes, three at three
  ships whichever count the game was dealt with, and the lighting rule
  unchanged in each case.

Per `CLAUDE.md`'s pre-release stance: **no plan steps for testing
accessibility**, and no review fixtures or manual test scripts. Existing
automated tests are updated where the path is straightforward. Anything
knowingly lost is recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Out of scope

- **Any count other than five and four.** Three, six or a free number are
  not offered, and nothing is built to make them easy later.
- **Re-tuning anything against five charged**: the countdown lengths, the
  weighting, the pool constraints, the node capacity, the game lengths and
  the fleet sizes all keep their current values. Appendix B is re-measured,
  not re-fitted.
- **Growing or shrinking the inactive queue.** Three stays three at both
  counts.
- **Re-scaling the pips or the info column** for the wider row, or drawing
  anything in the space a shorter row leaves. A row of three is three pips
  and nothing else — no placeholders for the pips a side cannot light.
- **A typographic pass over the start screen.** Only `Unlimited` changes.
- **Backwards compatibility** for games recorded under 0.29 (`CLAUDE.md`).

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.30**, and the changelog has
  one entry for it.
- No section of `rules.md` states four charged nodes as a fact about the
  board, and no section states five as one either: every mention refers to
  the number chosen before play.
- The start screen shows four option groups in the order **Ships, Charged
  nodes, Rounds, Clock**, with **5** checked in the new group, and the Clock
  group reads **UNLIMITED**.
- Starting a game with 5 deals **eight** nodes — five charged at baseline,
  three inactive at priorities 1, 2 and 3 — and with 4 deals **seven**.
- The board returns to the chosen count by the end of every turn, over a
  long run, at both counts and whatever the seed, and is never charged above
  it.
- The queue is always exactly three inactive nodes carrying 1, 2 and 3, at
  both counts.
- Every node placed — the opening deal's and every refill's — is legal under
  §3.2, from the right pool, at both counts.
- A side standing on five charged nodes collects five energy in a turn, and
  a six-ship, five-node game draws five pips a row.
- A three-ship side draws **three** pips whatever the charged-node count,
  and a six-ship side in a four-node game draws four.
- Returning to the start screen after a game leaves the chosen count
  selected.
- The same opening seed and the same sequence of actions produce the same
  game every time, with `seededReplay.test.ts`'s expectations regenerated.
- `README.md` describes the choice and no longer describes a board that is
  always four.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary). "Charged node" is the word everywhere in the
  rules and the code; `README.md`'s player voice says "lit".
- The rules edit is one commit, ahead of the code, and there is **one**
  version bump on this branch however many later rules edits it turns out to
  need.
- Manual check worth making once it runs: the start screen with four option
  groups on a short landscape window, and the HUD's info column with a
  five-pip row at the narrow end of `--region-extent`.
