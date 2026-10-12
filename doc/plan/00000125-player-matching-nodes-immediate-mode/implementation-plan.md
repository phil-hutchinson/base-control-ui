# Implementation Plan — Story 00000125, Player-matching nodes: Immediate

## What this story does

Player-matching nodes (steal.md §9), a steal-only pre-play setting, gains a
fourth value, **immediate**. Under it, red's node and green's node are never
charged and never held: each is a single prospective square in the player's
colour (two while it carries an extra from Additional nodes). Landing on one
resolves at once — the landing side is paid if the node is its own, the
square landed on is removed, and the node either draws one fresh square
(anchored on the square just landed on) or, if it carried an extra, simply
keeps its other square. The payment is what the landing side's ordinary
held nodes would pay at the end of a turn, multiplied by three under simple
scoring and two under bonus scoring.

Under immediate the Charged nodes choice counts **ordinary** nodes only and
offers 4 or 3; red and green come on top, so a game has six or five nodes.
The start screen moves Player-matching nodes above Charged nodes, greys out
5 under IMMEDIATE, drops a selected 5 to 4 and restores it when the drop
was the only reason it changed. The Quick Guide gains an IMMEDIATE NODES
section with a diagram, the option tip and `README.md` gain the new choice.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions and the rejected alternatives, because code in this
repository deliberately carries no design history (`CONTRIBUTING.md`,
"Comments").

## Baseline on this branch

Branch `feat/125-player-matching-nodes-immediate-mode`, clean at the start
of planning (`story.md` already committed).

- `npm test` — **98 test files, 2162 tests, all green**.
- `npm run typecheck`, `npm run lint` and `npm run format:check` are
  expected clean. Every step must leave them that way; if a step's own edit
  trips `format:check`, run `npx prettier --write` on the files that step
  touched (including this plan file, if an edit to it flags).

The test count will **rise** over this story. No step may lower it.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what the ruleset, the
  UI, the live region and `README.md` say (`CLAUDE.md`, Vocabulary).
- **Move** is the movement action specifically — one ship changing squares —
  never a synonym for a turn or a ply.
- **Node**, **prospective node** and **signal** are used as `CLAUDE.md`
  defines them. Under steal a node is identified by its **signal**
  (`NodeSignal` in `src/rules/steal.ts`); the app shows a signal as a
  colour.
- A **matched node** is one of the two nodes matched to a player (red's
  and green's). Under immediate a matched node is an **immediate node**
  (the plan's and the code's word; the player-facing heading is IMMEDIATE
  NODES). Every other node is an **ordinary node**.
- The player-facing setting words are **OFF**, **DOUBLE**, **REQUIRED**
  and **IMMEDIATE** (start-screen chrome, living in `StartScreen.tsx`). The
  code word is `playerMatching`, values `"off"`, `"double"`, `"required"`,
  `"immediate"`.
- The Quick Guide has its own knowing vocabulary exception: it says
  **points**, **fuel** and **spaceships** where the rest of the app says
  energy, power and ships (`src/guide/guideCopy.ts` header). Copy added to
  the guide follows the guide's words; copy added anywhere else follows the
  app's.
- `rules.md` and `steal.md` **name no default** and never call anything
  "standard". Which setting the app preselects is an app matter.

## Settled decisions — do not reopen

These come from `story.md` and the owner's standing preferences. A step that
finds one inconvenient escalates to the owner rather than re-deciding.

- **S1. Four settings**, in this order everywhere they are listed: off,
  double, required, immediate. Same for both players, fixed for the game,
  offered only under steal. The app default stays REQUIRED; Charged nodes'
  default stays 4.
- **S2. Node count.** Under immediate the charged-node choice is **4 or 3**
  and counts **ordinary** nodes only; red and green come on top (six or
  five nodes in all). 5 is not offered under immediate. Off, double and
  required are unchanged, 5 included.
- **S3. Red's and green's nodes** are dealt as the second-to-last and last
  nodes, as today.
- **S4. An immediate node** has one prospective square in its player's
  colour, or two while it carries an extra. It is never charged, never
  held, never pays at the end of a turn, never counts as a node held, and
  never has a pip.
- **S5. Landing on an immediate node's square** (a move that ends there,
  from either side) resolves at once: (1) if the node is the landing side's
  own, that side is paid; the opponent's pays nothing; (2) the square
  landed on is removed; (3) if the node had only that one square, one fresh
  prospective square is drawn by steal.md §6's weighted rule, anchored on
  the square just landed on; if it had two, nothing is drawn — the extra is
  used up and the node is left with its other square.
- **S6. Leaving comes first** (steal.md §5): a ship stepping off an
  ordinary charged square onto an immediate node's square resolves the
  leave first, so the node left is no longer held when the payment is
  counted.
- **S7. Only landing counts.** Flying over does nothing; a fight's returns
  land only on planets and so never land on an immediate node.
- **S8. The payment** is counted from the ordinary charged nodes the
  landing side's ships stand on at the moment of landing, after any leave:
  one turn's collection (rules.md §8.4) × **3** under simple, × **2** under
  bonus. Simple 1/2/3/4 held pays 3/6/9/12; bonus pays 2/6/12/20. Holding
  nothing pays nothing, and the node still moves. A side out of time
  (rules.md §10) is paid nothing, and the node still moves or is used up.
- **S9. The end of the turn** prices ordinary nodes exactly as rules.md
  §8.4 says, with no doubling and nothing withheld.
- **S10. Opening deal** (steal.md §7): every node's first square uniformly
  from the strict pool in deal order, red's and green's last; red and green
  get no second square; only the ordinary nodes then draw a second square
  by the weighted rule, seeing red's and green's squares as other nodes'
  squares.
- **S11. Planet effects**: Additional nodes gives red and green an extra
  too (unavailable only while every node, red and green included, carries
  one), drawn by the weighted rule anchored on the node's remaining square.
  Node scramble treats red's and green's squares like any other prospective
  square, places the matched signals first, and keeps each signal's square
  count. Point bonuses gain two **immediate** rows equal to the required
  rows for the same node count (3: 1/2/4 and 2/4/6; 4: 2/3/5 and 3/5/8).
- **S12. The weighted rule** is unchanged for every other node; red's and
  green's squares count in `S` for every draw.
- **S13. The start screen**: under STEAL, Player-matching nodes sits
  **above** Charged nodes and offers OFF, DOUBLE, REQUIRED, IMMEDIATE. With
  IMMEDIATE, Charged nodes shows 5 greyed out and unchoosable; a selected 5
  drops to 4; choosing another player-matching setting or another
  playstyle makes 5 available again and **restores 5 if that drop is the
  only reason it changed**. Other playstyles' start screen is unchanged.
- **S14. A payment** shows the existing "+N" flash on the square landed on
  and the existing energy-gained announcement; landing on the opponent's
  node shows no "+N". No new visual beyond that (out of scope).
- **S15. The rules edit is its own commit, ahead of the code**: `rules.md`
  0.45 → **0.46**, `RULES_VERSION` to match, **one** `changelog.md` entry.
  **One version bump for the whole branch** — a later rules wording fix
  folds into 0.46's entry. **Tagging stays on hold**: do not tag, do not
  run `/tag-rules`.
- **S16. The Quick Guide** gets its own headed **IMMEDIATE NODES** section
  with a diagram; PLAYER-MATCHING NODES names the fourth choice and points
  to it.
- **S17. No accessibility repair or testing steps, no review fixtures, no
  manual test scripts** (`CLAUDE.md`; the owner drives manual testing).
  Where an existing automated test has a straightforward path to being
  updated, update it. Manual verification never asks the owner to check
  live-region wording. Any accessible behaviour knowingly lost is recorded
  in `doc/plan/00000021-accessibility-tech-debt/known-issues.md` (none is
  expected — see D13).
- **S18. No backwards compatibility** (`CLAUDE.md`). Games under off,
  double and required must still deal and replay exactly as today; that is
  a property of the design (D3, D4), not a compatibility layer, and the
  core's pinned-game hash (`src/core/stateHash.test.ts`, a **required**
  game) is the standing proof — it must not change.

## Decisions this plan makes

Each of these is a decision the story left to the plan, with the
alternatives considered and rejected.

### D1. `chargedNodeCount` keeps meaning the start screen's choice

`GameState.chargedNodeCount` (and the core `Setup.chargedNodes`) stays
exactly the number the player chose on the Charged nodes group. Under
immediate that is the **ordinary** node count, 3 or 4; the game's total
node count is derived: the chosen count, plus two under immediate.

A single derived helper in `src/rules/steal.ts` — call it the game's
**signal count** — returns that total from a
`Pick<GameState, "chargedNodeCount" | "playerMatching">`, and a companion
returns the game's signals (the first *signal-count* entries of
`NODE_SIGNALS`). Every place that today uses `chargedNodeCount` to mean
"how many signals this game has" switches to it (see D3).

Rejected: **storing the total** (5 or 6) in `chargedNodeCount`. The type
`ChargedNodeCount` would need a 6; the point table, keyed by the chosen
count with the immediate rows at 3 and 4 (S11), would be keyed by
something else; the pips (S4: one per ordinary node) and the start screen
would each have to subtract two back out; and a 5 would become ambiguous
between "five ordinary nodes" and "three ordinary plus red and green". The
chosen count is also what the canonical state hash already carries, so
keeping its meaning keeps the hash's shape.

### D2. `NodeSignal` widens to 0–5, and the palette gains a sixth colour

With four ordinary nodes plus red and green a game has six signals:
ordinary 0–3, red's 4 and green's 5 (red second-to-last, green last — S3,
unchanged rule, now applied to the signal count instead of
`chargedNodeCount`). With three ordinary: 0–2, red's 3, green's 4.
`NodeSignal` becomes `0 | 1 | 2 | 3 | 4 | 5` and `NODE_SIGNALS` gains 5.

`SIGNAL_COLORS` (`src/board/squareArt.ts`) gains a sixth entry so the
palette stays total over `NodeSignal` and existing `it.each(NODE_SIGNALS)`
tests keep working. In every game the rules allow today, signal 5 exists
only under immediate with four ordinary nodes, where it is green's and
drawn in green's colour, so the sixth colour is never seen. Pick a colour
clearly distinct from the five existing ones and from both player colours
(a pink or a teal far from the green, for instance), and say in its
comment that it is reachable only by an unmatched signal 5, which no
current setting produces. Typing `SIGNAL_COLORS` so the compiler enforces
one entry per signal is encouraged.

Rejected: leaving the palette at five and special-casing signal 5 — it
leaves `colorsForSignal` partial over its own parameter type, and a later
setting that unmatches signal 5 would render `undefined`.

### D3. Signal-aware functions take the game's settings, not a bare count

Today `matchedSignalForSide`, `sideMatchedToSignal`,
`dealStealOpeningBoard`, `everyNodeHasExtra`, `addExtraProspectiveSquares`,
`shuffleProspectiveSignals` and `isActivityBonusKindAvailable` take a
`nodeCount: ChargedNodeCount` and use it as the number of signals. Change
each to take the game's settings (a `Pick<GameState, "chargedNodeCount" |
"playerMatching">`, or the signal count derived from it where a function
truly needs only the count) so that no caller can pass the chosen count
where the signal count is meant. `matchedSideForSignal` already takes that
`Pick` and only needs its body switched to the signal count.

Under off, double and required the signal count equals `chargedNodeCount`,
so every one of these functions computes exactly what it computes today —
same signals, same order, same draws. That is what keeps S18 true.

Rejected: keeping the `nodeCount` parameters and asking callers to pass
the signal count. Nothing in the type system would catch a caller passing
`state.chargedNodeCount`, and under immediate that silently drops red and
green from the deal, from Additional nodes and from the scramble.

### D4. The opening deal under immediate

`dealStealOpeningBoard` draws every signal's first square (ordinary
signals first, then red's, then green's — i.e. signal order) uniformly from
the strict pool exactly as today, then the **second** square for the
ordinary signals only, in signal order, by
`drawStealOpeningProspectiveSquare`, with red's and green's squares
counting among the other nodes' squares. Draw count under immediate:
`(chargedNodeCount + 2) + chargedNodeCount`. Under the other settings it
is `2 × chargedNodeCount`, unchanged. Update the module header's draw-order
listing and the `startingGameState` doc comment that states draw counts.

### D5. Which nodes are immediate, and when one carries an extra

A helper in `steal.ts` answers "is this signal an immediate node in this
game" (player-matching immediate and the signal matched to a side).

`nodeCarriesExtra` gains the immediate case: an immediate node carries an
extra exactly when it has **two** prospective squares (its usual count is
one). It therefore needs the game's settings too (D3). Ordinary nodes keep
today's rule (usual is 1 when Held, 2 when Open).

`nodeAnchor` needs no change: an immediate node is never Held, so its
anchor is its prospective square (or the nearer of two), which is what
steal.md §10 already says and what S11 asks for when Additional nodes
gives it an extra.

### D6. `turnCollection` treats immediate like off

Under immediate the end-of-turn collection prices the ordinary charged
nodes held, with no doubling and nothing withheld for player-matching
(S9). In `src/rules/energy.ts`, `turnCollection` should take the off path
for immediate: `standingOnOwnNode` false, `ownNodeSquare` absent,
`withheldReason` never `"required"`. Out of time still withholds exactly as
today (rules.md §10). An immediate node is never charged, so it can never
appear in `heldSquares` — no special exclusion is needed, but a test should
pin it.

### D7. The immediate payment lives in `energy.ts`

Add one function in `src/rules/energy.ts` that, given a state (as it
stands after the move and any leave have resolved) and a side, returns
what an immediate landing pays that side: `energyForNodesHeld(held count,
scoring)` times the scoring's multiplier — **3** for simple, **2** for
bonus, named constants citing steal.md §9 — or 0 when the side is out of
time. It should also report the held squares it counted, for tests and for
any later display. Keeping it beside `turnCollection` keeps all node
pricing in one module, and reusing `energyForNodesHeld` means the payment
can never drift from what a turn pays (S8: "what those nodes would pay at
the end of a turn, multiplied").

Rejected: a lookup table of 3/6/9/12 and 2/6/12/20 — it would duplicate the
scoring formula and need a bound, the exact reason `energyForNodesHeld` is
written as a formula.

### D8. Landing resolves in a new `steal.ts` function and a new move effect

`steal.ts` gains a pure function for landing on an immediate node's square
(the counterpart to `claimNode` and `abandonNode`): it removes the landed
square and, if the node had no other square, draws one fresh square by
`drawStealProspectiveSquare`, anchored on the landed square, weighted
against every other signal's squares, over the board's ship squares as
they stand after the move. It makes exactly **one** draw when the node had
one square and **none** when it had two. It returns the resulting node map
and the fresh square, if any. It knows nothing about energy.

`ply.ts`'s `applyMove` steal branch then has three destination cases
instead of two: an ordinary node's prospective square → `claimNode` (as
today); an immediate node's square → the new function; anything else →
nothing. The abandon check before it is unchanged (its "not landing on the
same node's prospective square" test already holds, since an immediate
node is never the node a ship is leaving). After the new function runs,
the payment (D7) is computed on the state with the ship moved and the
leave resolved, credited to the side's energy immediately — mid-ply, as a
points bonus is — and a new `MoveEffect` is raised.

The new effect — call it `ImmediateNodeLandedEffect`, type
`"immediate-node-landed"` — carries the landing ship and side, the node's
signal, the matched side the node belongs to, the square landed on, the
amount paid (0 when nothing was paid: the opponent's node, nothing held,
or out of time), and the fresh square when one was drawn (absent when the
extra was used up). It sits where `NodeClaimedEffect` would: after any
`NodeAbandonedEffect` (S6), before the `EndOfPlyEffect`. A move lands on
one square, so a move raises at most one of `node-claimed` and
`immediate-node-landed`, never both, and a prospective square is never a
planet, so it never shares a move with a bonus claim.

Rejected: **reusing `NodeClaimedEffect`** — every consumer reads it as
"this square is now charged" (the board's charge animation, the
announcement's claim clause), which is false for an immediate node.
Rejected: **paying at the end of the ply** — the rule pays at once, and the
end-of-turn collection would then see the board after the landing, not at
it; the two are equal here but the rule's wording is "at once", and mid-ply
crediting matches how a points bonus already pays.

The new effect type becomes part of the core's `PlyEffect` automatically
(it is a `MoveEffect`); that is a contract addition the online-play server
will see in a new core release — see Concerns in the hand-off, not a step.

### D9. Validation of 5 under immediate

`startingGameState` throws a `RangeError` for `playerMatching: "immediate"`
with `chargedNodeCount: 5`, in the same style as its other cross-checks.
The core's `parseSetup` reports it rather than letting `startGame` throw:
a new `SetupProblemKind`, `"not-allowed-with-player-matching"`, on the
**`chargedNodes`** field (the dependent field, as `planetBonus` is the
dependent field of the playstyle cross-check). The check is skipped when
`playerMatching` is missing or not offered, exactly as the playstyle
cross-check is skipped when `playstyle` is. Problems must still be
reported in `Setup`'s declared field order, so the `chargedNodes` problem
appears at `chargedNodes`' position — validate `chargedNodes` against a
peek at the raw `playerMatching` value (only when that is an offered
setting), or otherwise preserve the order.

The offered counts belong to the rules: `src/rules/playerMatching.ts`
gains a function giving the charged-node counts offered under a
player-matching setting (`[4, 3]` under immediate, `CHARGED_NODE_COUNTS`
otherwise, same render order), which `startingGameState`, `parseSetup`
and the start screen all use.

### D10. The start screen keeps the player's choice and resolves it

Follow the pattern `resolvePlayerMatching` already sets: the start screen
**remembers** the count the player last chose and **resolves** the count
the game actually uses. `src/rules/playerMatching.ts` gains a resolve
function: given the node playstyle, the remembered player-matching
setting and the remembered count, it returns 4 when the resolved
player-matching setting is immediate and the remembered count is 5,
otherwise the remembered count. `useAppScreen` keeps the remembered count
in state, exposes the **resolved** count to the start screen as the
checked value and passes the resolved count in `new-game`.

This gives S13's restore rule for free: choosing IMMEDIATE with 5
remembered shows 4 checked; choosing REQUIRED, or another playstyle, shows
5 again because the remembered value never changed. If the player clicks 4
or 3 while IMMEDIATE is on, that becomes the remembered value, so a later
switch away does **not** restore 5 — "the drop is the only reason it
changed" is exactly "the remembered value is still 5".

Rejected: an effect or handler that rewrites the count to 4 and stores a
"was 5" flag — more state, and two places that must agree.

The disabled 5 is a real disabled radio (`OptionChoice` gains a disabled
prop), styled greyed out in `StartScreen.css`. Group order under steal:
Node playstyle, Ships, **Player-matching nodes**, **Charged nodes**, Node
scoring, Planet effects, Rounds, Clock. Under the other playstyles the
Player-matching group is absent and the order is otherwise unchanged.

### D11. The "+N" flash for a payment

`EnergyOverlay.tsx` already draws a "+N" and pulse for each end-of-turn
settlement. Extend it to draw one more settlement for an
`immediate-node-landed` effect with `amount > 0`: the landing side, the
amount, and the landed square as its only square. A zero amount (the
opponent's node, nothing held, out of time) draws nothing. The end-of-turn
settlement of the same ply still draws as today, so a payment ply can show
two "+N"s — the immediate one on the landed square and the turn's own at
its held squares' centroid. That is the existing flash used twice, which
S14 allows; no new visual.

### D12. Pips and colours under immediate

`ScoreDisplay.tsx`: the pip row's length is `min(ships, chargedNodeCount)`
as today — under immediate that is the ordinary count (D1), so three or
four. `pipFills` takes the **off** path under immediate (no own/opponent
ordering, nothing doubled). Under immediate no player-matching rule
crosses a pip. Being out of time still crosses held pips exactly as it
does under every other setting (rules.md §10) — see the Concerns note in
the hand-off: the story's "no pip is ever crossed under immediate" is read
here as "nothing about immediate crosses a pip".

`activityBonusSymbolColors` (`src/bonus/activityBonusColors.ts`) returns
gold, red, green under immediate too, since red and green nodes are on the
board.

`matchedSideForSignal` is already the one place the board, the pips and
the animations ask "is this signal drawn in a player's colour"; with D3 it
answers correctly for immediate and nothing in `Board.tsx`, `NodeMarker`
or `boardAnimations.ts` needs to know immediate exists. An immediate
node's square is a prospective square and is drawn as one.

### D13. Accessibility

The announcement for an immediate landing is added (Step 5), with an
automated test, so nothing is lost. The disabled 5 is a native disabled
radio. No entry in the accessibility ledger is expected; if a step
knowingly drops an accessible behaviour, it records it there.

### D14. Step granularity

The rules work is two steps, not one, although both touch `steal.ts` and
`energy.ts`: Step 2 (the setting, the counts, the deal, planet effects and
validation) and Step 3 (what landing does) each carry an independent rule
with its own verification, and a single step would have two verification
points (the implementation plan guide's split rule). Step 2 alone leaves
an immediate game in which landing on red's or green's square **claims**
it like an ordinary node; that is a transitional state on the branch,
fixed by Step 3 before anything else builds on it.

## Step sequence at a glance

1. Ruleset 0.46 — automated
2. The setting, the node count, the deal and planet effects — automated
3. Landing on an immediate node — automated
4. The start screen — automated
5. Board, HUD and announcements — automated
6. Quick Guide: IMMEDIATE NODES — automated
7. `README.md` — automated
8. The owner plays it — manual

---

### Step 1 — Ruleset 0.46: immediate player-matching nodes

Status: committed

Notes: Wrote the immediate setting into `rules.md` (§1, §8.1, §8.4) and
`steal.md` (§1–§3, §5–§10, the new Immediate part of §9, the Additional
nodes/Node scramble exceptions and the two new point-table rows in §10),
bumped `RULES_VERSION` to 0.46, added the 0.46 changelog entry, and
corrected `story.md`'s "The ruleset" list to name the §2/§3/§5/§8 pointers
it builds in place, per the owner's standing preference. Owner decision
carried from the task brief — immediate still crosses held pips when a
player is out of time, same as every other setting — needed no ruleset
change, since pips are a UI detail rules.md never mentions; it is recorded
for Step 5. `npm run format:check` required a `prettier --write` on
`changelog.md` and `steal.md` after editing (one paragraph in §10's Node
scramble section settled on a line over 80 characters, matching several
pre-existing lines in the same file). No other deviation from the plan:
`npm test` stayed at 98 files / 2162 tests, unchanged, since this step is
docs-only; `npm run typecheck` and `npm run lint` are clean.

Edit `doc/ruleset/rules.md`, `doc/ruleset/steal.md` and
`doc/ruleset/changelog.md`, and set `RULES_VERSION` in
`src/rules/rulesVersion.ts` to `"0.46"`. Commit on its own.

Write the rules for a player, following the existing documents' tone; name
no default; say "turn", never "ply". Everything in S1–S12 is the content.
Where to put it:

- **rules.md**: version line to **0.46**. §1 Overview — name an immediate
  node among the ways to collect energy (alongside holding nodes and the
  planet settings), pointing to steal.md §9. §8.1 — the paragraph giving
  the charged-node choice (five, four or three) says it works differently
  under steal's immediate player-matching setting, pointing to steal.md
  (§1 and §9). §8.4 — "Node collection is not the only source of energy"
  names an immediate node too, and the steal paragraph's "the
  player-matching nodes setting can change what a turn pays" stays true.
- **steal.md §1** — under immediate the charged-node choice counts the
  ordinary nodes only and offers four or three; red's and green's nodes
  come on top.
- **steal.md §2, §3, §5 and §8** — short pointers only, so the document
  stays consistent: §2's "always occupies exactly two squares" and its
  configuration table hold for every node except an immediate node
  (section 9); §3's claim rule applies to an ordinary node's prospective
  square — landing on an immediate node's square is section 9's instead;
  §5's leave-first ordering covers landing on an immediate node too; §8's
  closing sentence about energy being priced at the end of the turn notes
  that an immediate node pays on landing (section 9). These go slightly
  beyond the story's own list of touched sections; they are pointers, not
  new rules (see the "story.md" bullet below).
- **steal.md §6** — the anchor exception: when an immediate node draws a
  fresh square, its anchor is the square just landed on. Red's and green's
  squares count among `S` for every draw.
- **steal.md §7** — under immediate, red and green get no second square;
  only the ordinary nodes draw one, and those draws see red's and green's
  squares as other nodes' squares.
- **steal.md §9** — the choice becomes **off, double, required or
  immediate**; add an **Immediate** part covering S4–S9 (single square,
  landing resolution in its three numbered steps, leaving first, only
  landing counts, the payment with both scoring worked examples, nothing
  when holding nothing, nothing when out of time, the end of the turn).
  Keep the opening statement about which nodes are matched and the closing
  statement about off. The "Planet effects is unaffected by either setting"
  sentence becomes "by any of these settings" or similar, and its
  reference to required withholding stays accurate.
- **steal.md §10** — Additional nodes: an immediate node carries an extra
  when it has two squares; red and green get an extra too; unavailable only
  while every node, red and green included, carries one; the extra is
  drawn anchored on the node's remaining square; landing on one of its two
  squares uses the extra up (section 9). Node scramble: "with
  player-matching double or required" becomes "with player-matching on
  (double, required or immediate)"; red's and green's squares take part
  like any other prospective square and each signal keeps its count. Point
  table: add the two **immediate** rows exactly as the story gives them,
  and one sentence that immediate uses the required amounts until it has
  been measured. Place the rows so the table still reads by node count
  (an immediate row after each count's required row, for 3 and 4 only).
- **changelog.md** — one `## 0.46 — …` entry, newest first, in the
  existing entries' style: a gameplay change, so a tag candidate; tagging
  on hold. List what changed by section.
- **story.md** — this story's "The ruleset" list names steal.md §1, §6,
  §7, §9, §10 and rules.md §1, §8.1, §8.4; add the §2, §3, §5 and §8
  pointers in place, so the story says what was built (owner preference:
  correct story.md in place when a decision changes it).

The point-table mirror test (`src/rules/activityBonus.test.ts`, "the point
table mirrors steal.md §10") parses rows whose player-matching column is
`off|double|required` only, so the new immediate rows are ignored until
Step 2 extends it; the suite stays green.

Depends on: nothing. Every later step implements what this step writes.

Verification (automated): full `npm test` green (in particular
`src/rules/rulesVersion.test.ts` — `RULES_VERSION` equals rules.md's
0.46 and changelog.md has a `## 0.46 ` entry), `npm run typecheck`,
`npm run lint`, `npm run format:check` clean. By inspection: the immediate
point rows read 3 → 1/2/4 and 2/4/6, 4 → 2/3/5 and 3/5/8; no default is
named anywhere.

---

### Step 2 — The setting, the node count, the deal and planet effects

Status: committed

Notes: Implemented as planned. `playerMatching.ts` gains `"immediate"`,
`chargedNodeCountsForPlayerMatching` and
`resolvePlayerMatchingChargedNodeCount`. `steal.ts` widens `NodeSignal`/
`NODE_SIGNALS` to 0–5, adds `GameSettings` (the `Pick<GameState,
"chargedNodeCount" | "playerMatching">` D3 calls for), `gameSignalCount`,
`gameSignals` and `isImmediateSignal`, and switches `matchedSignalForSide`,
`sideMatchedToSignal`, `matchedSideForSignal`, `dealStealOpeningBoard`,
`nodeCarriesExtra` (gains a third `settings` parameter), `everyNodeHasExtra`,
`addExtraProspectiveSquares` and `shuffleProspectiveSignals` (drops its
separate `playerMatching` parameter, folded into `settings`) to take it.
`gameState.ts` validates `chargedNodeCount` against
`chargedNodeCountsForPlayerMatching` and passes `{ chargedNodeCount,
playerMatching }` into the steal deal and the activity-bonus deal.
`energy.ts`'s `turnCollection` needed no code change for D6: since
`"immediate"` is neither `"double"` nor `"required"`, it already takes the
`else` branch (off's own), and an immediate node can never appear in
`heldSquares` since it is never charged — only the doc comment changed; a
test pins this. `activityBonus.ts`'s point table is now `Partial` over
`PlayerMatchingSetting` so the five-node row can omit `immediate`;
`activityBonusPoints` throws a `RangeError` for that one unoffered
combination; `isActivityBonusKindAvailable`, `drawActivityBonusKind` and
`dealActivityBonuses` take `settings` in place of a bare `nodeCount`, and
`resolveActivityBonusClaim`'s internal calls pass its own `state` parameter
straight through (it already carries both fields). `core/setup.ts` gains
`"not-allowed-with-player-matching"` and peeks at the raw `playerMatching`
value to validate `chargedNodes` in field order, exactly as D9 describes.
Compile-through: `StartScreen.tsx`'s and `StartScreen.test.tsx`'s
`PLAYER_MATCHING_LABELS` gain `immediate: "IMMEDIATE"`; `squareArt.ts`'s
`SIGNAL_COLORS` gains a sixth (teal) entry; `ScoreDisplay.tsx`'s
`matchedSignalForSide` call passes `state` instead of
`state.chargedNodeCount`. `PlanetBonusPanel`/`ActivityBonusCell` needed no
change — `activityBonusPoints`'s own signature is unchanged by D3.

Deviations from the plan: (1) `fullGame.test.ts`'s existing
`describe.each`/`it.each` sweep over every `PLAYER_MATCHING_SETTINGS` ×
`CHARGED_NODE_COUNTS` combination now has to skip immediate at five nodes
(the one combination `startingGameState` rejects), since the setting union
it iterates widened under this step; added a `.filter` rather than touching
the pinned-hash test. (2) `assertActivityBonusInvariants` in the same file
lost its now-unused `chargedNodeCount` parameter (its one use became
`everyNodeHasExtra(state.nodes, state)`, `state` already satisfying
`GameSettings`); both call sites updated. (3)
`stealPlacement.test.ts`'s "the fallback never fires" test iterated the
bare `NODE_SIGNALS` constant, which widened from 5 to 6 entries under D2;
sliced to the game's actual 5 signals in the two places that assumed the
old length, rather than changing the test's seeded five-node setup. No
rule, decision or settled item from the plan was reopened. `npm test` rose
from 98 files/2162 tests to 98 files/2212 tests (+50); `npm run typecheck`,
`npm run lint` and `npm run format:check` are clean;
`src/core/stateHash.test.ts` was not touched and its pinned hash is
unchanged.

Bring immediate into the rules layer up to, but not including, what
landing on an immediate node does (Step 3).

- **`src/rules/playerMatching.ts`** — `"immediate"` joins the union and
  `PLAYER_MATCHING_SETTINGS` (last, S1). Add the offered-counts function
  (D9) and the count resolve function (D10). Update the module and type
  doc comments.
- **`src/rules/steal.ts`** — widen `NodeSignal` and `NODE_SIGNALS` (D2);
  add the signal-count and game-signals helpers (D1) and the
  is-immediate-signal helper (D5); switch the signal-aware functions to
  the game's settings (D3); deal the opening board per D4; teach
  `nodeCarriesExtra` the immediate case (D5), which `everyNodeHasExtra`
  and `addExtraProspectiveSquares` then pick up; `shuffleProspectiveSignals`
  places the matched signals first whenever player-matching is not off
  (immediate included) and keeps every count. Update the module header's
  draw-order notes.
- **`src/rules/gameState.ts`** — `startingGameState` validates the count
  against the offered counts for the player-matching setting (D9), and
  passes the game's settings into the deal. Update the doc comments on
  `chargedNodeCount` (the chosen ordinary count under immediate),
  `playerMatching`, `StartingGameStateOptions` and the draw counts.
- **`src/rules/energy.ts`** — `turnCollection` takes the off path under
  immediate (D6).
- **`src/rules/activityBonus.ts`** — the point table gains immediate rows
  at 3 and 4 only, equal to the required rows (S11). Restructure the
  table's type as needed so it holds no row for 5 × immediate (the ruleset
  states none — the code must not carry a rule the ruleset does not
  state); `activityBonusPoints` throws a `RangeError` for that unoffered
  combination. Availability and claim resolution pass the game's settings
  (D3).
- **`src/core/setup.ts`** — the new problem kind and cross-check (D9);
  update `parseSetup`'s doc comment.
- **Compile-through outside the rules layer** — `StartScreen.tsx`'s
  `PLAYER_MATCHING_LABELS` gains `immediate: "IMMEDIATE"` (the record is
  exhaustive, so typecheck requires it; the group will therefore show
  IMMEDIATE from this step on — the rest of the start screen is Step 4);
  `SIGNAL_COLORS` gains its sixth entry (D2); any other caller of a
  changed signature (for instance `ScoreDisplay.tsx`'s
  `matchedSignalForSide` call, `PlanetBonusPanel`/`ActivityBonusCell`'s
  node count props) is updated to compile with today's behaviour.
  Behavioural UI changes wait for Steps 4 and 5.

Tests (add to the existing files beside each module):

- `playerMatching.test.ts`: the four settings in order; offered counts
  `[4, 3]` under immediate and `[5, 4, 3]` otherwise; the resolve function
  drops a remembered 5 to 4 under steal + immediate only, and passes 5
  through under every other combination.
- `steal.test.ts` / `stealPlacement.test.ts`: signal count is
  `chargedNodeCount` under off/double/required and `+2` under immediate;
  matched signals are red 4/green 5 at four, red 3/green 4 at three under
  immediate; an immediate opening deal at three has three ordinary signals
  with two squares each and one square each for red and green (the
  story's verification), and at four likewise; the deal makes exactly
  `(N + 2) + N` draws under immediate; immediate ordinary second squares
  are weighted against red's and green's first squares; `nodeCarriesExtra`
  is false for a one-square immediate node and true for a two-square one;
  Additional nodes gives red and green an extra and is unavailable only
  when every node including red and green carries one; Node scramble under
  immediate keeps every signal's count and places red and green first.
- `gameState.test.ts`: immediate with 5 throws; immediate with 3 or 4
  deals; immediate outside steal throws (existing cross-check).
- `activityBonus.test.ts`: extend the mirror test's regex and expected row
  count to include the immediate rows (9 + 2 = 11 rows); the "covers every
  cell" loops iterate only offered combinations; 5 × immediate throws.
- `energy.test.ts`: under immediate, `turnCollection` prices held ordinary
  nodes as off would, never withholds for player-matching, still
  withholds for out of time.
- `core/setup.test.ts`: `chargedNodes: 5` with `playerMatching:
  "immediate"` under steal reports `{ field: "chargedNodes", problem:
  "not-allowed-with-player-matching" }` in field order; 4 and 3 parse;
  the check is skipped when `playerMatching` is missing or not offered.
- S18 regression: the existing seeded-replay, full-game and core pinned
  game tests pass **unchanged** (the pinned hash is not edited).

Depends on: Step 1 (the rules it implements, and the point table rows the
mirror test now reads).

Verification (automated): full `npm test` green with the new tests above,
`npm run typecheck`, `npm run lint`, `npm run format:check` clean, and
`src/core/stateHash.test.ts`'s pinned hash untouched.

---

### Step 3 — Landing on an immediate node

Status: committed

Notes: Implemented as planned. `steal.ts` gains `landOnImmediateNode`
(removes the landed square; draws one fresh square anchored on it via
`drawStealProspectiveSquare` when the node had only that square, none when
it had two) and a header note on its draw count. `energy.ts` gains
`immediateNodePayment` (reuses `energyForNodesHeld` on
`chargedNodesHeldBy`, times 3 under simple / 2 under bonus via two named
constants, 0 when out of time) beside `turnCollection`, touching nothing
outside its own return value — `ply.ts` credits the energy itself. `ply.ts`
adds `ImmediateNodeLandedEffect` to `MoveEffect`, and `applyMove`'s steal
branch gains a third destination case ahead of the ordinary claim: when
`isImmediateSignal` is true, `landOnImmediateNode` runs, the payment is
priced on the state with the ship moved and any leave already resolved,
credited to `energy` (a new local alongside `nodes`) only when the landing
side is the node's own matched side and the amount is positive, and the
effect is pushed with that amount (0 for the opponent's node, nothing held,
or out of time) and the fresh square if one was drawn. `EnergyOverlay.tsx`'s
explicit `endOfPlySettlements` union gains the new effect with no behaviour
(Step 5's), which is the one other place in the app that exhaustively named
`MoveEffect`'s members.

Deviations from the plan: (1) `fullGame.test.ts`'s `assertStealNodeInvariants`
dropped its separate `chargedNodeCount` parameter in favour of reading
`state` directly (it already carries `chargedNodeCount` and
`playerMatching`), iterating `gameSignals(state)` instead of
`NODE_SIGNALS.slice(0, chargedNodeCount)`, and branching on
`isImmediateSignal` to check red's and green's signals separately (never
charged, one or two prospective squares) from ordinary ones (today's
invariants unchanged); all four call sites updated. This mirrors Step 2's
own note on `assertActivityBonusInvariants` losing the same kind of
now-redundant parameter, and was needed because the existing immediate +
planet-effects sweep in this file was already calling the old signature
with only the ordinary count, silently skipping red's and green's
invariants — Step 3's own verification asked for exactly the check this
exposed. A new `describe.each` block runs a hundred-round immediate game at
3 and 4 ordinary nodes, under each planet effects setting, asserting the
invariant throughout and that paid landings, unpaid landings and moved
nodes are all non-vacuous. (2) `seededReplay.test.ts`'s `StealNodeEvent`
union gained a third `"landed"` member and `stealNodeEvents` records
`immediate-node-landed` effects too, rather than a wholly separate event
type, since the existing `chooseStealPly` policy already heads for any
`"prospective"` square — red's and green's included — with no change
needed; a new harness and describe block mirror the existing steal replay
tests. (3) `ply.test.ts`'s shared `buildState` helper gained `scoring` and
`playerMatching` config fields (previously hard-coded to `"simple"` and
`"off"`), needed to build an immediate game; both default to the prior
hard-coded values, so no existing test's behaviour changed. No rule,
decision or settled item from the plan was reopened. `npm test` rose from
98 files/2212 tests to 98 files/2241 tests (+29); `npm run typecheck`,
`npm run lint` and `npm run format:check` are clean; the pinned required
game's hash in `src/core/stateHash.test.ts` is unchanged, and a new
immediate setup was added to its "draws round-trip" coverage.

Implement S5–S8: the new `steal.ts` landing function (D8), the payment
function in `energy.ts` (D7), `applyMove`'s third destination case in
`ply.ts`, the new `ImmediateNodeLandedEffect` added to `MoveEffect`, and
the energy credited at once. Update `ply.ts`'s `applyMove` doc comment
(the steal paragraph) and `steal.ts`'s header (one draw per immediate
landing on a one-square node, none on a two-square one; leave-then-land
makes the abandon's draw first).

Any exhaustive handling of `MoveEffect` elsewhere (a `switch` with a
`never` check, or an explicit union like `EnergyOverlay.tsx`'s
`endOfPlySettlements` parameter) must still compile; widen such unions to
include the new effect without giving it behaviour — behaviour is
Step 5's.

Tests:

- `steal.test.ts`: the landing function removes the landed square and
  draws exactly one fresh square, anchored on the landed square, for a
  one-square node; removes only the landed square and draws nothing for a
  two-square node; the fresh square is never on a ship or adjacent to a
  node (the widened pool).
- `energy.test.ts`: the payment is 3/6/9/12 under simple and 2/6/12/20
  under bonus for 1–4 held; 0 holding nothing; 0 out of time.
- `ply.test.ts` (the story's verification list, each as a case):
  - landing on one's own node holding nothing pays nothing and the node
    moves;
  - holding two pays 6 under simple and 6 under bonus; holding one pays 3
    under simple and 2 under bonus;
  - stepping off a held ordinary node straight onto one's own immediate
    node pays for the nodes still held, not the one just left, and the
    effects are `node-abandoned` then `immediate-node-landed`;
  - landing on the opponent's node pays nothing and moves it;
  - after Additional nodes, landing on either of a two-square immediate
    node's squares removes only that square, draws nothing, and pays as
    usual when it is one's own;
  - an immediate node is never charged after any landing, and the same
    ply's end-of-turn collection still pays the ordinary nodes held;
  - out of time is unreachable by a move (a side out of time only passes),
    so pin the out-of-time zero at the energy-function level above, and
    note that in the test.
- `fullGame.test.ts`: extend the steal node invariants (or add a sibling)
  so an immediate game checks, at every ply, that red's and green's
  signals have no charged square and one or two prospective squares, and
  every ordinary signal keeps today's invariants; run a long immediate
  game (with and without planet effects) under it.
- `seededReplay.test.ts`: an immediate game replays exactly from the same
  seed and the same moves, and is non-vacuous (it actually produces
  immediate landings, paid and unpaid, and at least one moved node).
- `core/stateHash.test.ts`: add an immediate setup to the "draws round-trip"
  coverage; the pinned required game's hash is unchanged.

Depends on: Step 2 (the setting, signal helpers, deal and extras this
resolves against).

Verification (automated): full `npm test` green including every case
above, `npm run typecheck`, `npm run lint`, `npm run format:check` clean;
pinned core hash untouched.

---

### Step 4 — The start screen

Status: committed

Notes: Implemented as planned. `useAppScreen.ts`'s `chargedNodeCount` state
was renamed `rememberedChargedNodeCount`; the hook now returns and dispatches
`resolvePlayerMatchingChargedNodeCount(nodePlaystyle, playerMatching,
rememberedChargedNodeCount)` as `chargedNodeCount`, while `setChargedNodeCount`
still writes the remembered value, giving the restore behaviour D10
describes for free. `StartScreen.tsx` swapped the Player-matching nodes and
Charged nodes blocks (Player-matching now renders first, under steal only, as
before); `OptionChoice` gained an optional `disabled` prop forwarded to the
radio input; the Charged nodes group computes
`chargedNodeCountsForPlayerMatching(nodePlaystyle === "steal" ? playerMatching
: "off")` and disables any value it excludes (only 5 under immediate).
`StartScreen.css` gained a disabled-choice style (dimmed, `not-allowed`
cursor, hover suppressed) layered the same way the checked style is.
`optionTips.ts`'s Player-matching nodes tip gained the IMMEDIATE line given
in the plan, verbatim — a draft, to be reviewed with the owner in Step 8, not
yet marked as approved anywhere in code, per the comment convention (no
design-process language in source). Updated tests: `StartScreen.test.tsx`
(group order under STEAL, two new tests for the disabled/enabled 5 radio),
`optionTips.test.ts` (the IMMEDIATE choice), `useAppScreen.test.tsx` (four new
tests: resolves 5 to 4 under immediate and dispatches 4, restores 5 on
REQUIRED, restores 5 on switching playstyle, does not restore 5 once 3 or 4
was clicked meanwhile), `App.test.tsx` (the eight-group order assertion).

No deviation from the plan. `npm test` rose from 98 files/2241 tests to 98
files/2247 tests (+6); `npm run typecheck`, `npm run lint` and `npm run
format:check` are clean. The look of the greyed-out 5 and the tip wording are
for the owner to check in Step 8, per the plan's own verification note.

Implement S13 per D10:

- `src/useAppScreen.ts` — keep the remembered count; expose the resolved
  count (using `resolvePlayerMatching` for the effective setting, then the
  count resolve function) as `chargedNodeCount`; `setChargedNodeCount`
  sets the remembered value; `handlePlay` passes the resolved count.
  Update the hook's doc comment.
- `src/start/StartScreen.tsx` — move the Player-matching nodes group above
  Charged nodes (still steal-only); render all three counts, disabling
  each one not in the offered counts for the currently effective
  player-matching setting (only 5, only under steal + IMMEDIATE);
  `OptionChoice` gains a disabled prop. Update the module header (option
  order) and the component's doc comment.
- `src/start/StartScreen.css` — a greyed-out style for a disabled choice
  (reduced opacity and a not-allowed cursor, or the existing visual
  language for unavailable things if there is one); the disabled choice
  must not show the hover/checked treatment.
- `src/start/optionTips.ts` — Player-matching nodes' tip gains an
  IMMEDIATE line in the existing style, e.g. "Your own node pays at once
  when you land on it — more for every node you hold — then moves
  elsewhere. Landing on your opponent's moves it without paying." Mark it
  as a draft for the owner's approval in Step 8.

Tests (`StartScreen.test.tsx`, `useAppScreen.test.tsx`,
`optionTips.test.ts`, `App.test.tsx` where it asserts group order):

- under STEAL the group order is Node playstyle, Ships, Player-matching
  nodes, Charged nodes, …; under another playstyle the order is as today
  without the group;
- the group offers OFF, DOUBLE, REQUIRED, IMMEDIATE in that order;
- with IMMEDIATE, the 5 radio is disabled and 4 and 3 are not;
- with 5 remembered, choosing IMMEDIATE shows 4 checked; choosing
  REQUIRED again shows 5; choosing another playstyle shows 5;
- with 5 remembered, choosing IMMEDIATE then clicking 3 and then choosing
  REQUIRED leaves 3 (no restore);
- PLAY under STEAL + IMMEDIATE with 5 remembered dispatches `new-game`
  with `chargedNodeCount: 4` and `playerMatching: "immediate"`;
- the tip lists IMMEDIATE.

Depends on: Step 2 (the setting value and the offered-counts and resolve
functions). Independent of Step 3, but placed after it so the start screen
never offers a playable IMMEDIATE whose landing is unimplemented for longer
than necessary.

Verification (automated): full `npm test` green with the cases above,
`npm run typecheck`, `npm run lint`, `npm run format:check` clean. The
look of the greyed-out 5 is checked by the owner in Step 8.

---

### Step 5 — Board, HUD and announcements

Status: committed

Notes: Implemented as planned. `EnergyOverlay.tsx` gains
`immediateNodeLandedSettlement`, drawing a settlement for a `moved` event's
`immediate-node-landed` effect when `amount > 0` (the landed square as its
only square); `settlementsForEvent` now branches `"moved"` separately from
`"attacked"` so it can prepend this settlement ahead of the ply's own
end-of-turn one — a paying landing can show two "+N"s, as D11 describes.
`ScoreDisplay.tsx`'s `pipFills` takes the off path for `"immediate"` too
(functionally already the result the DOUBLE/REQUIRED branch computed, since
`turnCollection` never gives immediate an `ownNodeSquare` and an immediate
node can never appear in `heldSquares`, but written explicitly per D12
rather than left to that coincidence); `pipCount` needed no change, since
`chargedNodeCount` is already the ordinary count under immediate (D1) and
immediate gets no extra pip. `SCORE_DIGITS`'s and `pipCount`'s comments were
updated for immediate's own largest single-ply total (a landing's 20 plus
that same ply's own 10, 30 at four nodes under bonus). `activityBonusColors.ts`
now returns gold/red/green whenever player-matching is not off (immediate
included), rather than naming "double or required" explicitly.
`announcements.ts` gains `immediateNodeLandedClause`/
`immediateNodeLandedClauseText`, wired into `moveSentence` after the claim
clause (mutually exclusive with it, so order between them never matters in
practice): the landing side's own node names the amount paid or that it
paid nothing, the opponent's node names only the landing, and a further
clause says the node moved to its fresh square or lost its extra square.
`Board.tsx` and `boardAnimations.ts` needed no change — confirmed by a new
Board.test.tsx describe block that a one-square immediate node draws as a
single set of prospective rings in its matched side's colour and a
two-square one as two, never charged, through the existing
`matchedSideForSignal` wiring (D12). `boardAnimations.ts`'s
`signalsBeforeScramble` was left untouched per the plan's own fallback: an
immediate landing's `newProspective` can never coincide with a Node scramble
claim in the same event, since landing on an immediate node's square is
never landing on a planet.

No deviation from the plan. `npm test` rose from 98 files/2247 tests to 98
files/2260 tests (+13); `npm run typecheck` and `npm run lint` are clean;
`npm run format:check` needed one `prettier --write` pass on
`EnergyOverlay.tsx` and `EnergyOverlay.test.tsx` (a long object-literal line
in each), after which it is clean too. The look of the "+N" flash, the pip
row and the announcement wording are for the owner to check in Step 8, per
the plan's own verification note.

Make the game screen show immediate correctly (S4, S14, D11, D12):

- `src/board/EnergyOverlay.tsx` — draw a "+N" settlement on the landed
  square for an `immediate-node-landed` effect with a positive amount
  (D11); nothing for a zero amount. Keys must stay unique when the same
  ply also draws its end-of-turn settlement.
- `src/hud/ScoreDisplay.tsx` — `pipFills` takes the off path under
  immediate; update the pip-count and `SCORE_DIGITS` comments for
  immediate (the largest single ply under immediate, 20 + 10 at four
  nodes under bonus, still fits four digits over 90 rounds).
- `src/bonus/activityBonusColors.ts` — gold, red, green under immediate
  (D12); update its header.
- `src/board/announcements.ts` — a clause for the new effect in
  `moveSentence`, after the abandon clause and in place of a claim clause:
  the side landed on its own node and gained N energy, or landed on its
  own node and gained nothing, or landed on the opponent's node; and that
  the node moved (when a fresh square was drawn) or lost its extra square.
  Follow the existing clauses' plain style and square naming. This is
  covered only by automated tests (S17).
- `src/board/boardAnimations.ts` — no new animation (S14). If
  `signalsBeforeScramble`'s "made by this event" set is meant to list every
  square an event made prospective, add the new effect's fresh square for
  completeness; otherwise leave it, since a move that lands on an
  immediate node never also claims a planet bonus.
- Confirm by test that `Board.tsx` draws a one-square immediate node as a
  single set of prospective rings in its player's colour and a two-square
  one as two, and never as charged — through `matchedSideForSignal` (D12),
  so no board change should be needed.

Tests: `EnergyOverlay.test.tsx` (a "+N" on the landed square for a paid
landing; none for an unpaid landing); `ScoreDisplay.test.tsx` (under
immediate the row is three or four pips, filled in ordinary signals'
colours only, and no player-matching cross); `activityBonusColors.test.ts`
(immediate → gold, red, green); `announcements.test.ts` (the paid, unpaid
own, opponent's, moved and extra-used-up wordings); `Board.test.tsx` (the
rings above, at three and at four ordinary nodes).

Depends on: Step 3 (the effect and the landing behaviour this displays).

Verification (automated): full `npm test` green with the cases above,
`npm run typecheck`, `npm run lint`, `npm run format:check` clean. The
look is checked by the owner in Step 8.

---

### Step 6 — Quick Guide: IMMEDIATE NODES

Status: committed

Notes: Implemented as planned. `guideCopy.ts` gains the `immediateNodes`
section id, inserted between `playerMatchingNodes` and `planetBonus`, with
its heading IMMEDIATE NODES and a paragraph covering the single set of
rings, paying at once (three times a turn's collection under simple, twice
under bonus, most when several nodes are already held, nothing when none
are), moving elsewhere, the opponent's node moving without paying, and the
Charged nodes choice counting only the other nodes; `GuideSectionId` and the
module's doc comments now say nine sections. PLAYER-MATCHING NODES' own
paragraph gains one closing sentence naming IMMEDIATE and pointing to the
new section, verbatim: "There is also an IMMEDIATE choice, explained in
IMMEDIATE NODES below." `guideDiagrams.tsx` gains `ImmediateNodesDiagram`: a
before → after strip — a held ordinary charged node beside green's single
prospective rings and a second green ship about to land, an arrow, then
that ship on the now-ordinary square and green's rings moved on further
along the strip — using signal 5 (green's signal in a four-ordinary-node
immediate game) with a comment naming why, and drawing no "+N" overlay.
`GuideScreen.tsx` pairs the new section with the new diagram, and its doc
comments move from eight to nine sections. Updated `guideCopy.test.ts`,
`GuideScreen.test.tsx` and `guideDiagrams.test.tsx` for the new section,
its position, its paragraph text and its diagram's markers.

No deviation from the plan. `npm test` rose from 98 files/2260 tests to 98
files/2263 tests (+3); `npm run typecheck`, `npm run lint` and `npm run
format:check` are clean. The copy and the diagram are drafts for the owner's
approval in Step 8, per the plan's own verification note; `guideCopy.ts`'s
header comment records them as drafted for story 125, awaiting approval,
following the file's existing provenance-note convention.

- `src/guide/guideCopy.ts` — a new section, id `immediateNodes`, heading
  **IMMEDIATE NODES**, placed straight after PLAYER-MATCHING NODES. Its
  paragraph, in the guide's own vocabulary (points, spaceships), explains:
  under IMMEDIATE, your own node is a single set of rings in your colour
  that is never charged; landing a spaceship on it pays you at once —
  three times what your charged nodes pay in a turn under simple scoring,
  twice under bonus — so it pays most when you already hold several
  nodes, and nothing if you hold none; it then moves elsewhere; landing on
  your opponent's node moves it without paying anyone; and under IMMEDIATE
  the Charged nodes choice counts only the other nodes. PLAYER-MATCHING
  NODES' paragraph names IMMEDIATE as the fourth choice in one short
  sentence and points to the IMMEDIATE NODES section. Update the header's
  section count and provenance note (drafted by the plan, for the owner's
  approval in Step 8), `GuideSectionId`, and the "eight sections"
  wording.
- `src/guide/guideDiagrams.tsx` — an `ImmediateNodesDiagram`: a before →
  after strip in the style of `StealingNodesDiagram`. Before: a green ship
  beside green's single set of rings (and, optionally, the ship's
  neighbour holding a charged ordinary node, to suggest "holding the board
  first"); after: the ship on the square where the rings were, now an
  ordinary square, and green's rings standing further along the strip.
  Use green's matched side for the rings and a signal constant naming why
  it was chosen, as the PLAYER-MATCHING NODES diagram does. No "+N" (the
  diagram component draws no overlay, and S14 forbids a new visual).
- `src/guide/GuideScreen.tsx` — pair the section with its diagram.

Tests: `guideCopy.test.ts` (the section exists, in order, with its
heading), `GuideScreen.test.tsx` (it renders with its diagram, in order),
`guideDiagrams.test.tsx` (the diagram draws green rings before and after
and a green ship on an ordinary square after).

Depends on: Step 2 (the setting exists; the guide describes it). Does not
depend on Steps 3–5 in code, but its wording describes their behaviour.

Verification (automated): full `npm test` green with the cases above,
`npm run typecheck`, `npm run lint`, `npm run format:check` clean. The
owner approves the copy and the diagram in Step 8.

---

### Step 7 — `README.md`

Status: committed

Notes: Done inline by the orchestrator. The status blurb lists
player-matching nodes before the lit-node count under steal, with immediate
as its fourth choice and four or three as the only counts under it; the
quick guide list names immediate nodes; the player-matching passage gains
a plain description of immediate and of what the count means under it.

Run `/update-readme` (or do its job by hand). Where the README lists the
start screen's choices, add IMMEDIATE to the player-matching choices (off,
double, required or immediate, required to start) and reflect the new
order under steal (player-matching nodes before charged nodes). Where it
describes player-matching nodes (the "required means you collect nothing
…" passage), add one plain sentence on immediate: your own node is a
single square that pays at once when you land on it, more the more nodes
you hold, then moves. Mention that under immediate the charged-nodes
choice counts only the other nodes and offers four or three. Add
"immediate nodes" to the list of what the Quick Guide explains, if the
README keeps such a list. Keep it for a non-technical reader.

Depends on: Steps 4 and 6 (the start screen and the guide as built).

Verification (automated): `npm run format:check` clean and full `npm test`
green (unaffected). By inspection: every start-screen choice the README
lists exists in `StartScreen.tsx` in that order under steal, and no count
or default it states is false.

---

### Step 8 — The owner plays it

Status: committed

Notes: The owner played it and passed the verification list with no
defects, and approved the option tip's IMMEDIATE line, the IMMEDIATE NODES
section, the PLAYER-MATCHING NODES pointer sentence and the diagram as
drafted. `guideCopy.ts`'s header now records the copy as approved.

No code, unless the owner's play turns up a defect — fix it here, with a
test where the defect is in logic, and record it in the Notes. A rules
wording fix folds into 0.46's entry (S15). Copy changes the owner asks for
in the option tip or the guide are made here, and `guideCopy.ts`'s header
then records that the section's copy is the owner's.

Depends on: every step above.

Verification (manual): the owner runs `npm run dev` and walks the story's
own Verification list:

- `RULES_VERSION` and `rules.md` both read 0.46, with one changelog entry
  (already asserted by the suite).
- Under STEAL, Player-matching nodes sits above Charged nodes and offers
  OFF, DOUBLE, REQUIRED, IMMEDIATE; under the other playstyles the start
  screen looks as before.
- With IMMEDIATE, Charged nodes' 5 is visibly greyed out and cannot be
  chosen. Choosing IMMEDIATE while 5 is selected drops it to 4; choosing
  REQUIRED again restores 5.
- An IMMEDIATE game with 3 charged nodes opens with three ordinary nodes
  of two squares each, plus a single red square and a single green square.
- Landing on your own node while holding nothing pays nothing (no "+N"),
  and the node moves.
- Landing on your own node while holding two nodes shows "+6" on the
  landed square under SIMPLE and under BONUS; holding one shows "+3" under
  SIMPLE and "+2" under BONUS.
- Stepping off a held node straight onto your own node pays for the nodes
  still held, not the one just left.
- Landing on the opponent's node shows no "+N" and moves it.
- After an Additional nodes bonus, red and green each show two squares;
  landing on either removes only that square and nothing new appears;
  landing on your own still pays.
- Ordinary nodes still pay at the end of the turn; red's and green's nodes
  never do, and the pips show one per ordinary node (three or four), never
  red or green.
- The Quick Guide has an IMMEDIATE NODES section with a diagram, and
  PLAYER-MATCHING NODES names the fourth choice; the owner approves both
  texts and the Player-matching nodes tip's IMMEDIATE line.

(The same seed and the same moves giving the same game is asserted by the
automated suite in Step 3.)
