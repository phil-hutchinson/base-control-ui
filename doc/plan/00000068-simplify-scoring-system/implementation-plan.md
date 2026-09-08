# Implementation Plan — Story 00000068, One point per node, per turn

## What this story does

Today the energy a player collects at the end of their turn is priced off a
table in `rules.md` §8.4: holding one charged node pays 1, two pay 3, three
pay 6, four pay 10. This story deletes that table. **A player collects one
energy for each charged node they are standing on when their turn ends** —
hold three, collect three.

Nothing else about collection changes: the node must be **charged**, one of
that player's ships must be **standing on** it at the moment the turn ends,
and nothing in the game ever subtracts energy. The collection moment stays
step 2 of the end-of-turn order (§8.6), still ahead of depletion at step 3,
so a node held to the very end of its countdown still pays on the same turn
it traps its holder — it just pays 1 there rather than its share of a table.

`story.md` in this folder is the owner's full statement of the change and of
why the table is being dropped (it makes a fourth node worth four turns of
holding one, and it makes a score impossible to read back). This plan does
not repeat that argument; it says how to get there, in what order, and
records the decisions this plan makes, because code in this repository
deliberately carries no design history (`CONTRIBUTING.md`, "Comments").

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say. Do not mix them (`CLAUDE.md`, Vocabulary).
- **Node** is the word everywhere — code, tests and player-facing text — for
  a board position running `inactive` → `charged` → `depleted` → ends.
- **Move** means the movement action specifically, one ship changing
  squares. It is never a synonym for a ply or a turn.
- **Held** node, in this story, means a **charged** node with one of that
  player's ships standing on it. A depleted node under a ship is a **trap**,
  not a holding, and pays nothing.

## Settled decisions — do not reopen

These come from `story.md` and from the owner's discussion while writing it.
A step that finds one inconvenient should escalate, not re-decide.

- **S1.** The payout is the **count of charged nodes held**, with **no upper
  bound in the arithmetic**. Four is the most the board ever charges at once
  (§8.1, §8.2) — that is the board's limit, not the scoring rule's, and the
  scoring code must not restate it.
- **S2.** `ENERGY_BY_NODES_HELD` and `energyForNodesHeld` in
  `src/rules/energy.ts` are **deleted**, not reduced to a function that
  returns its argument. `chargedNodesHeldBy` in the same module is unchanged
  and is the module's remaining reason to exist.
- **S3.** The `RangeError` that `energyForNodesHeld` threw above four
  disappears with the function. Nothing tests it any more; no equivalent
  check is added anywhere else.
- **S4.** `src/rules/endOfTurn.ts` step 2 awards `heldSquares.length`
  directly. The existing `amount > 0` guard **stays**: a zero payout remains
  a non-event — no effect, no state change.
- **S5.** Everything downstream of the number is untouched: the `+N`
  `EnergyOverlay`, the announcement sentence in `src/board/announcements.ts`,
  and the HUD totals all read whatever number is produced. No production
  code outside `energy.ts` and `endOfTurn.ts` changes.
- **S6.** This is a **gameplay change**: `doc/ruleset/rules.md` bumps
  **0.28 → 0.29**, with a `doc/ruleset/changelog.md` entry and
  `RULES_VERSION` in `src/rules/rulesVersion.ts` updated to match, in its own
  commit ahead of the code. There is **one** version bump on this branch: a
  later rules edit folds into the same entry, never a second bump.
  **Tagging stays on hold** (`CLAUDE.md`) — bump and write the entry, do not
  run `/tag-rules`.
- **S7.** §8.4 is rewritten from a table to a sentence. §8.3's worked example
  and §8.6's step 2 mention collection but quote no figure, so they are
  expected to need **no** change — check them and leave them alone if so.
- **S8.** `README.md`'s rules summary says a node "pays energy at the end of
  each turn to the player sitting on it, and holding several at once pays far
  more than holding them one at a time would". The second half is now false
  and must become the flat rate, in the README's non-technical voice.
- **S9.** Nothing else is rebalanced. Game length is counted in rounds, there
  is no target score, and no other setting is sized against the old numbers.
- **S10.** Per `CLAUDE.md`'s pre-release stance: **no plan steps for testing
  accessibility**, and no review fixtures or manual test scripts — the owner
  drives manual testing himself. Where an existing automated test has a
  straightforward path to being updated, update it. Anything knowingly lost
  goes as a note in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`; none is
  expected here.

## Where the old table is written down

The implementer does not have to go looking. This is the complete inventory,
taken from the branch as it stands:

**Documents**

- `doc/ruleset/rules.md` §8.4 — the prose "priced off the table below" and
  the five-row table itself. §8.3 and §8.6 mention collection without a
  figure; §8.1 and §8.5 describe charged nodes paying, also without a figure.
- `README.md` — the "holding several at once pays far more" clause (S8).
- `doc/ruleset/changelog.md` — historical entries mention the table. Those
  are a **record** and are never rewritten; only the new 0.29 entry is added.

**Production code** (only two files)

- `src/rules/energy.ts` — the module header comment, `ENERGY_BY_NODES_HELD`,
  `energyForNodesHeld` and its doc comment.
- `src/rules/endOfTurn.ts` — the `energyForNodesHeld` import (line ~49) and
  its single call in step 2 (line ~259), plus the step 2 comment.

**Tests naming a figure the table produced**

- `src/rules/energy.test.ts` — the whole `energyForNodesHeld` describe block
  (five table cases plus three `RangeError` cases) and the import of the
  function. The `chargedNodesHeldBy` block stays.
- `src/rules/endOfTurn.test.ts` — two engine-driven expectations:
  `amount: 3` / `newTotal: 3` for **two** held nodes, and `amount: 6` /
  `newTotal: 6` for **three** held nodes (with a following
  `result.state.energy` assertion and a test title naming the count).
- `src/board/announcements.test.ts` — two hand-built effects: `amount: 6`
  over three squares, and `amount: 3` over two squares, each with an expected
  sentence quoting the number.
- `src/board/EnergyOverlay.test.tsx` — `THREE_NODE_COLLECTION` (`amount: 6`
  over three squares, asserted as the text `+6`), and a pass-event effect
  with `amount: 3` over two squares.

Everything else in the suite that asserts a collection uses **one** node,
which pays 1 under both the old table and the new rule and therefore does not
move: `src/rules/camping.test.ts`, `src/rules/ply.test.ts`,
`src/board/Board.test.tsx`. `src/rules/fullGame.test.ts` checks that final
totals equal the sum of the `energy-collected` amounts it observed, which is
self-consistent and stays green without edits. HUD, clock and score tests use
totals that were never derived from the table.

## Design reasoning and rejected alternatives

- **Delete the function rather than make it the identity (S2).** The
  obvious smaller diff is to leave `energyForNodesHeld` in place returning
  its argument. Rejected: it is named for a pricing step that no longer
  exists, so every future reader would go looking for the table it implies,
  and a call site reading `energyForNodesHeld(heldSquares.length)` hides the
  fact that the rule is now simply "count them". The rule is the count; the
  code should say the count.
- **No bound is re-imposed at the call site (S1, S3).** The `RangeError`
  above four existed to catch a caller pricing a fifth node the table could
  not price. With no table there is nothing to fail on, and the four-node
  ceiling belongs to the board's own invariants (§8.1, §8.2), enforced where
  the board is charged — not restated in a scoring expression. Rejected:
  keeping a defensive check in `endOfTurn.ts`, which would put a board rule
  in a place no reader would look for it and would have to be revisited
  every time the charged-node count changes.
- **The `amount > 0` guard stays (S4).** Rejected: dropping it now that the
  amount is a plain count. A player standing on nothing must not read as
  having had something happen to them: without the guard, an
  `energy-collected` effect with `amount: 0` would be pushed every turn, the
  announcement would say "collected 0 energy", and `EnergyOverlay` would draw
  a `+0`. The guard is what keeps a zero payout a non-event.
- **`chargedNodesHeldBy` is untouched and stays in `energy.ts`.** It is
  imported by `src/rules/endOfTurn.ts` and by `src/board/announcements.ts`
  (for the HUD's "nodes held" phrase), so folding it into `endOfTurn.ts`
  would leave the board layer reaching into the end-of-turn sequence for a
  question about the current board. Rejected on that ground alone.
- **Hand-built display-layer fixtures are updated even though they pass
  (see Step 3).** `announcements.test.ts` and `EnergyOverlay.test.tsx`
  construct `energy-collected` effects by hand, so they will stay green with
  the old numbers in them. Rejected: leaving them. A fixture saying six
  energy for three nodes is a statement about what the engine produces, and a
  cold reader — or a future test author copying a fixture — would take it for
  current behaviour. They are corrected for truthfulness, not to make the
  suite pass.
- **Nothing is rescaled alongside this (S9).** Rejected: adjusting game
  length or node countdowns to compensate for smaller scores. Scores are
  compared against each other only; there is no threshold anywhere in the
  code or the rules that a smaller score could fall below.

## Steps

### Step 1 — Rewrite §8.4 and bump the ruleset to 0.29

Status: committed

Notes: Rewrote §8.4 from the table to the flat one-energy-per-charged-node
sentence with no upper bound, bumped the version line to 0.29, added a 0.29
changelog entry in house style, and updated `RULES_VERSION`. §8.3's "sixth
time" sentences and §8.6 step 2 describe collection without quoting a
figure and were left unchanged, per the settled decision that §8.3's phrase
counts payments rather than an amount. `npm run format:check` reports a
pre-existing warning on `story.md` in this folder, unrelated to this step's
files; `rules.md`, `changelog.md` and `rulesVersion.ts` are all clean.

Update the ruleset first, because it is what the following steps implement
(`doc/guidelines/implementation-plan-guide.md`, "Check the rules document").

- In `doc/ruleset/rules.md` §8.4, delete the five-row table and rewrite the
  paragraph so it states the flat rate: at the end of each player's turn,
  that player collects **one energy for each charged node they are standing
  on**. Keep what the current paragraph already says and the story does not
  change — a node counts only if one of that player's ships is on it at that
  moment, flying across a charged node and moving on collects nothing, and
  nothing in the game subtracts energy so a total only ever rises. Write **no
  upper bound** into the rule (S1); if it helps the reader, note that the
  board charges four nodes at most (§8.1, §8.2) as a fact about the board,
  not as a cap on the arithmetic. Player-facing voice, like the rest of the
  document (`CLAUDE.md`, "Intended audience").
- Read §8.3 (the worked countdown example and the "pays its holder a sixth
  time" sentence) and §8.6 step 2 with its "Step 2 sits before step 3"
  note. Both describe collection without quoting a figure, so both are
  expected to stand as written (S7). If either does quote a number after all,
  fix it in this step. Also glance at §8.1 and §8.5, which describe a charged
  node paying its holder without a figure.
- Change the version line near the top of `rules.md` from
  **0.28** to **0.29**.
- Add a `doc/ruleset/changelog.md` entry at the top, `## 0.29 — <short
title>`, in the house style of the entries below it: it is a **gameplay
  change**, and it says tagging stays on hold until the game plays. Cover
  what went (the table), what replaces it (one energy per charged node held,
  no upper bound), and what deliberately did not change (which nodes count,
  the step 2 position in the end-of-turn order, nothing subtracts energy).
- Update `RULES_VERSION` in `src/rules/rulesVersion.ts` to `"0.29"`.

Do **not** run `/tag-rules` (S6).

Depends on: nothing.

Verification (automated): Run `npm test` — `src/rules/rulesVersion.test.ts`
asserts that `RULES_VERSION` equals the version in `rules.md` and that a
changelog entry exists for it, so both go red if the three are not in step.
Run `npm run typecheck`, `npm run lint` and `npm run format:check` — all
green (`format:check` covers the Markdown). Then re-read the rewritten §8.4
and confirm it contains no table, no number other than the flat one-per-node
rate, and no cap.

### Step 2 — Pay the count: delete the pricing function and award `heldSquares.length`

Status: committed

Notes: Deleted `ENERGY_BY_NODES_HELD` and `energyForNodesHeld` from
`energy.ts` (doc comments included) and rewrote the module header comment to
drop the table reference. `endOfTurn.ts` step 2 now awards
`heldSquares.length` directly, with the `amount > 0` guard and the
`energy-collected` effect fields unchanged; its comment was reworded to
describe the flat rate. Removed the `energyForNodesHeld` describe block
(table cases and `RangeError` cases) from `energy.test.ts`, and updated
`endOfTurn.test.ts`'s two-held-nodes and three-held-nodes expectations from
the old table's 3/6 to the flat 2/3. No deviations from the plan.

Implement the rule from Step 1 in the engine.

- In `src/rules/energy.ts`, delete `ENERGY_BY_NODES_HELD` and
  `energyForNodesHeld` outright (S2, S3), including their doc comments.
  Rewrite the module header comment, which currently opens "§8.4: the table
  and the charged nodes a side is standing on" — there is no table now, and
  the module's subject is which charged nodes a side is standing on. Leave
  `chargedNodesHeldBy` exactly as it is.
- In `src/rules/endOfTurn.ts`, drop `energyForNodesHeld` from the import of
  `./energy` (keeping `chargedNodesHeldBy`) and make step 2 award the number
  of held squares directly. Keep the `amount > 0` guard and everything inside
  it unchanged — the same `energy-collected` effect with the same `side`,
  `amount`, `newTotal` and `squares` fields (S4, S5). Update the step 2
  comment so it describes the flat rate rather than a priced table; keep the
  parts of it that are still true (nothing is subtracted any more; a zero
  payout is not an event).
- In `src/rules/energy.test.ts`, delete the whole `energyForNodesHeld`
  describe block — the five table cases and the three `RangeError` cases —
  and remove the function from the file's import. The `chargedNodesHeldBy`
  describe block and the file's helpers stay.
- In `src/rules/endOfTurn.test.ts`, redo the two expectations the old table
  set. The two-held-nodes case (currently `amount: 3`, `newTotal: 3`) becomes
  2, and the three-held-nodes case (currently `amount: 6`, `newTotal: 6`,
  with a following `expect(result.state.energy).toEqual({ green: 6, red: 0 })`
  and a test title naming the payout) becomes 3 throughout, title included.
  These run the real engine, so they fail until the code above is right.
- Do not touch `src/board/announcements.ts`, `src/board/EnergyOverlay.tsx`,
  the HUD, or any other production file (S5).

Depends on: Step 1 (the ruleset states the flat rate this step implements).

Verification (automated): Run `npm test` — the whole suite, not just the two
files touched. Expect it green, including `src/rules/camping.test.ts`'s
"collects energy six times" case (six turns of one node still totals 6) and
`src/rules/fullGame.test.ts`'s totals-equal-sum-of-collections invariant. Run
`npm run typecheck` (it will catch any surviving reference to the deleted
function), `npm run lint` and `npm run format:check`. Then grep `src/` for
`energyForNodesHeld` and `ENERGY_BY_NODES_HELD` and confirm there are no
hits left.

### Step 3 — Realign the display-layer test fixtures with the flat rate

Status: committed

Notes: In `src/board/announcements.test.ts`, the three-square effect's
`amount: 6` became `amount: 3` and its `newTotal: 24` became `21` (keeping the
implied prior total of 18 unchanged), with the expected sentence updated to
match; the two-square pass-turn effect's `amount: 3` / `newTotal: 3` became
`amount: 2` / `newTotal: 2`, with its sentence updated. In
`src/board/EnergyOverlay.test.tsx`, `THREE_NODE_COLLECTION` became
`amount: 3` / `newTotal: 21` and its rendered-text assertion became `+3`; the
pass-event effect over two squares became `amount: 2` / `newTotal: 2`. Pulse
counts were per-square already and needed no change. No production code
touched. No deviations from the plan.

`src/board/announcements.test.ts` and `src/board/EnergyOverlay.test.tsx`
build `energy-collected` effects by hand rather than running the engine, so
they stay green with old-table numbers in them. They are corrected here so no
fixture claims the engine pays more than one energy per node (see the design
reasoning above).

- `src/board/announcements.test.ts`: the three-square effect currently
  carrying `amount: 6` becomes `amount: 3`, and the two-square effect
  currently carrying `amount: 3` becomes `amount: 2`. Update each expected
  sentence to match the new figure, and keep each effect internally
  consistent — `newTotal` must be a total that could follow from the amount
  in that scenario, so where `newTotal` was the amount itself it moves with
  it.
- `src/board/EnergyOverlay.test.tsx`: `THREE_NODE_COLLECTION` becomes
  `amount: 3`, and the assertion on its rendered text becomes `+3`; the
  pass-event effect over two squares becomes `amount: 2`. The counts of
  rendered pulses are per **square**, not per energy point, so those
  assertions do not change.
- Change no production code in this step, and no other test file: the
  one-node fixtures elsewhere in the suite are already correct.

Depends on: Step 2 (the engine now pays the count; these fixtures are made to
describe that).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all green. Then grep the whole of `src/` for
`amount: 3`, `amount: 6` and `amount: 10` and confirm every remaining hit is
either a `power-gained` effect or unrelated to energy collection.

### Step 4 — Owner plays a game and watches the number

Status: committed

Notes: The owner played a game on 2026-09-08 and confirmed points 1, 2, 4, 5,
6 and 7. Point 3 (the announcement sentence) was not checked — the owner does
not test announcements by hand; `src/board/announcements.test.ts` covers it.
Nothing was given up visually, so no accessibility note was recorded.

The rest of the story is arithmetic; this is the one check that the change
reads correctly on the board. Nothing is implemented in this step.

Start the app with `npm run dev` and play a game — the default choices are
fine — through enough turns to hold nodes, and confirm:

1. Ending a turn with **one** charged node held draws **+1** over that node
   and raises that player's HUD total by exactly 1.
2. Ending a turn with **two** charged nodes held draws a single **+2** and
   raises the total by exactly 2, with a pulse over **each** of the two
   nodes. Three nodes pay **+3**.
3. The announcement text matches — for two nodes it reads along the lines of
   "collected 2 energy from 2 nodes at …, and now has N", with the same
   number as the overlay and the same new total as the HUD.
4. Ending a turn holding **nothing** shows no overlay, no announcement clause
   about energy, and no change to the total — a zero payout is still a
   non-event (S4).
5. A node held to the very end of its countdown still pays on the turn it
   traps its holder — the `+1` appears on the same turn the node goes
   depleted (§8.3, §8.6).
6. Flying a ship across a charged node and ending the move elsewhere pays
   nothing for it.
7. Totals only ever rise, and the score now visibly climbs by the number of
   nodes held rather than in jumps.

Depends on: Steps 1–3 (the whole change must be in place before it can be
played).

Verification (manual): The owner performs points 1–7 and confirms, or names
what to change. If something visual is knowingly given up here, record it as
a note in `doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather
than fixing it (`CLAUDE.md`, pre-release stance); no note is expected.

### Step 5 — `README.md`, the prose sweep, and the final check

Status: pending

- `README.md`'s rules summary currently reads that a node "pays energy at the
  end of each turn to the player sitting on it, and holding several at once
  pays far more than holding them one at a time would". The second clause is
  now false: rewrite it to the flat rate — each charged node a player is
  sitting on pays one energy at the end of that player's turn — in the
  README's non-technical, player-facing voice (S8). Check the opening
  paragraph too ("Hold a node and it pays you energy every turn"), which is
  still true and should be left alone unless it now reads oddly beside the
  rewritten clause.
- Running `/update-readme` is the intended route: it reviews the branch diff
  and rewrites what the change has made stale. Check its output against the
  clause above rather than trusting it blind.
- Sweep `src/` and `doc/` for prose the change has left stale: search for
  `ENERGY_BY_NODES_HELD`, `energyForNodesHeld`, "table" near energy, and the
  literal sequences "1, 3, 6" and "3, 6, 10". Fix any comment that now
  describes the code wrongly. Do **not** edit `doc/ruleset/changelog.md`'s
  historical entries or other stories' folders under `doc/plan/` — both are a
  record of what was true then.

Depends on: Steps 1–4 (the README describes finished behaviour, and the sweep
needs the code final).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all green. Then confirm the search terms above
return no stale hit outside `doc/ruleset/changelog.md` and other stories' plan
folders, and that `README.md` states the flat one-energy-per-node rate with no
claim that holding several pays more than their sum.
