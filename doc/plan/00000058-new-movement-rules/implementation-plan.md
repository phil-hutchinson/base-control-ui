# Implementation Plan — Story 00000058, Power becomes a fuel tank, and movement is priced

## What this story does

Today a ship's power **unlocks** movement options: §6's table gives it a
longer straight line at every point it carries, and a ship's power is a
property of where it has been standing — a charged node drains it, a depleted
node and a planet refill it.

This story turns power into a **budget the ship spends**:

- the tank widens from **0–4** to **0–6**, and every ship still starts full;
- each move shape has a **price** — one square orthogonally 0, one square
  diagonally 1, two squares orthogonally 2, and the new **L** (one orthogonal
  step and one diagonal step, in either order) 2 — and a ship may take any
  shape it can afford;
- two squares diagonally and three squares orthogonally are **gone**;
- **only enemy ships block**: a ship flies over its own side freely, by move
  and by attack alike, but still cannot land on any occupied square;
- an **attack pays** the price of the shape it strikes down, out of the
  attacker's reserve; the defender's power is untouched;
- **planets are the only source of power**: a ship on a planet at the end of
  its owner's turn gains 1, or 2 if it is the only one of that player's ships
  charging, where "charging" means standing on a planet **with room to gain**;
- a charged node no longer drains, and a depleted node no longer refills;
- the ship's power gauge is redrawn as **six lines in two rows of three**,
  with the little overhead ship icon dropped.

`story.md` in this folder is the full statement of the change, including the
owner's reasoning about what it does to the game. This plan does not repeat
it: it says how to get there, in what order, and records the design reasoning,
because code in this repository deliberately carries no design history
(`CONTRIBUTING.md`, "Comments").

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say. Do not mix them (`CLAUDE.md`, Vocabulary).
- **Move** means the movement action specifically — one ship changing
  squares. It is never a synonym for a ply or a turn.
- **Action** is one move or one attack. `ACTIONS_PER_PLY` is currently 1.
- **Node** is the word everywhere. "Hub" and "site" are retired.
- The **L** is this story's new move shape. It is not called a knight's move
  in player-facing text; `rules.md` and the UI say "an L". Code may use the
  word `L` as an identifier.

## Settled decisions — do not reopen

These were settled by the owner in `story.md` before planning began. A step
that finds one inconvenient should escalate, not re-decide.

- **S1.** The rules edit is version **0.23 → 0.24**, with exactly **one**
  changelog entry covering the whole story, in its **own commit ahead of the
  code** (`CLAUDE.md`). If a later step on this branch needs a further rules
  edit, it folds into the same 0.24 entry — there is never a second version
  bump on one branch. Tagging is on hold: bump and write the entry, do **not**
  run `/tag-rules`.
- **S2.** No move costs more than 2, and there is no way to spend power on
  anything but a move or an attack.
- **S3.** Energy, node capacity, the drain/recovery/pressure tables, the
  charge draw, node placement, fleet sizes, starting squares, rounds and the
  clock are all **untouched**. The only thing this story takes from nodes is
  their effect on a ship's power.
- **S4.** Combat's protections are untouched: a planet and a charged node
  still shield a ship from attack and still stop it attacking, and a fight
  still returns both ships to random empty planets, attacker drawn first.
- **S5.** The board does **not** label what each destination would cost. A
  player reads the gauge and sees which squares are highlighted.
- **S6.** The hull artwork does not change. Only the gauge does.
- **S7.** No review fixtures and no manual test scripts. The owner drives the
  manual testing himself, so the one manual step says what to look at in
  `npm run dev` and nothing is built to support it.
- **S8.** Holding a charged node now costs a ship nothing, and a depleted node
  is now all cost. Both are intended. Nothing in this story rebalances to
  compensate.

## Design decisions made while planning

Everything below is a decision this plan makes, with the alternatives that
were rejected. A step that needs to know "why is it done this way" should find
the answer here.

### D1 — One table, one row per §6 row, carrying a cost instead of an unlock

`src/rules/movement.ts`'s `REACH_OPTIONS` is today a five-row table
transcribed from §6, each row pairing a shape (`kind` + `distance`) with the
power that unlocks it. It becomes a **four-row** table transcribed from the
new §6, each row pairing a shape with the power it **costs**, and the filter
in `reachFrom` changes from `unlockedAtPower <= power` to `cost <= power`.

The table keeps one row per row of the document, so a reader can lay the two
side by side. The three straight-line rows keep the existing direction-kind
and distance representation; the **L row carries its eight offsets as
literal data**, each with its two corner squares (D2).

Rejected — **a flat table of twenty offsets** (4 + 4 + 4 + 8), each with its
cost and its passed-over squares. It is uniform and would delete the
direction/distance machinery, but it stops being visibly the document's
four-row table, which is the property `CONTRIBUTING.md` asks rule modules to
keep.

Rejected — **generating the L by composing a one-square orthogonal step with a
one-square diagonal step at runtime**. Composition does not produce the eight
L destinations: an orthogonal step east followed by a diagonal step north-west
lands one square north of the origin, which is already the free one-square
orthogonal destination. Composition therefore produces duplicate destinations
at two different prices, and would need a de-duplication rule and a
cheapest-wins tie-break — exactly the complication the "every destination has
exactly one price" property exists to avoid.

Rejected — **a separate module for the L**. The whole point (`story.md`,
"Four facts") is that a move's cost and its geometry are one table, read by
§6 and §7 alike. A second module would be a second table.

### D2 — The L's eight offsets and their two corners, written down as data

The eight L destinations are the offsets (±2, ±1) and (±1, ±2) in
(column, row) terms. Each carries **both** of its corner squares in
`passedOver`, so the existing "blocked if any passed-over square is occupied"
test yields the story's either-corner rule with no new mechanism.

The two corners of an offset (dc, dr) are:

- the **orthogonal corner** — one step along the **long** axis: (sign(dc), 0)
  when |dc| = 2, or (0, sign(dr)) when |dr| = 2;
- the **diagonal corner** — one diagonal step towards the destination:
  (sign(dc), sign(dr)).

Worked against `story.md`'s example: the L from H8 to J9 is (dc = +2,
dr = +1), so its orthogonal corner is I8 and its diagonal corner is I9 —
which is exactly the pair the story names. The other family checks the same
way: H8 to I10 is (+1, +2), corners H9 and I9.

Write the eight offsets and their corner pairs as **literal data** in the
table (D1), and pin the sign rule above with a test that walks every L entry
and asserts its two corners follow it. Literal data is auditable against §6 at
a glance; the test stops a typo in the literal from passing as geometry.

A corner is never off the board when its destination is on it: each corner
lies strictly between the origin and the destination on at least one axis, so
the existing check — discard the whole entry when its destination leaves the
board — is all the clipping the L needs. No special case is required, and none
should be added.

### D3 — `passedOver` blocking becomes side-aware; the destination check does not

Only an **enemy** ship blocks a path. The `passedOver` test in
`moveRefusalReason` and in `attackRefusalReason` therefore looks up the ship
on each passed-over square and ignores it when its side matches the moving or
attacking ship's own side. The **destination** test is unchanged: any ship,
friendly or enemy, makes a square un-landable.

The path test and the destination test have always been separate checks; this
story only changes what the first of them counts. Do not merge them, and do
not give the destination check a side.

### D4 — One shape lookup, used by movement, combat and `ply`

Three callers now need the **cost** of the shape that reaches a square:
`moveRefusalReason` (to tell "cannot afford" from "not a shape at all"),
`attackRefusalReason` (the same, for a target), and `ply.ts` (to deduct it).
Recomputing the geometry in each is how two copies of the table start.

`movement.ts` therefore exposes, alongside `reachFrom`:

- a function giving **every shape from an origin regardless of power** — the
  board-clipped twenty entries, each with its destination, its passed-over
  squares and its cost; and
- a lookup that answers **which shape, if any, reaches a given destination
  from a given origin**.

`reachFrom(origin, power)` keeps its exact signature and becomes the
affordable subset of the first — so `legalDestinations`, `legalTargets` and
every existing caller keep working unchanged. `ReachEntry` gains a `cost`
field; every entry carries it whether or not the caller reads it.

Rejected — **having `moveRefusalReason` return the entry as well as the
reason**, so `ply` need not look up again. It changes a widely-called
signature for one caller's convenience, and the lookup is a walk over at most
twenty entries.

Rejected — **caching the shape table per origin**. Premature: the table is
twenty entries and the board is 15 × 15.

### D5 — The two new refusal reasons are named apart, and "out of range" narrows

`MoveRefusalReason` gains a member meaning **"the shape exists but the ship
cannot pay for it"**, and `AttackRefusalReason` gains its own. They are
separate string literals — suggested `"cannot-afford"` for a move and
`"cannot-afford-target"` for an attack — because `RejectionReason` in
`src/game/session.ts` is the **union** of the two, and `rejectionSentence` in
`src/board/announcements.ts` switches over that union exhaustively. One shared
literal would force one sentence to cover both a refused move and a refused
attack, which read differently to a player. The existing pair
`"out-of-range"` / `"target-out-of-range"` is the precedent.

`"out-of-range"` keeps its name and **narrows its meaning**: the square is not
one of the twenty shapes from here at all (or it is off the board). Its
comment must say so, because "out of range" no longer has anything to do with
how much power the ship carries.

Because the switch is exhaustive with no `default`, adding a reason is a
typecheck failure until its wording exists. Each of Steps 4 and 5 therefore
adds its own reason **and** that reason's sentence, in the same step.

### D6 — What an action cost travels on the result, not recomputed in the wording layer

- **A fight**: `FightResolvedEffect` in `src/rules/ply.ts` gains the **cost**
  of the shape the attack struck down. `FightShip.power` stays the
  **before-the-fight** snapshot for both ships, so the attacker's power
  afterwards is `attacker.power - cost` — two fields already on the effect,
  subtracted where the sentence is written. The defender's is unchanged, which
  is now a fact worth stating in the sentence rather than a property of both
  ships.
- **A move**: `AppliedMove` gains the move's **cost** and the mover's **power
  after** it. `MovedEvent` in `src/game/session.ts` carries both through to
  the announcement, exactly as it already carries `actionsRemaining` from the
  resulting state.

Rejected — **a new `move-resolved` effect** mirroring `FightResolvedEffect`.
An effect in this codebase describes something that happened _beyond_ the
action itself (a ply ending, a pass, an end-of-turn event); the move's own
facts already travel on the applied result and the session event, and a
`move-resolved` effect would duplicate `MovedEvent`'s fields.

Rejected — **recomputing the cost in `announcements.ts`** from the from/to
squares. That is a second implementation of §6 in the wording layer, which is
precisely what `movement.ts`'s module comment forbids.

### D7 — Spending and gaining power live in `power.ts`, as checked arithmetic

Both `applyMove` and `applyAttack` must subtract a cost from a `PowerLevel`,
and the end-of-turn step must add a capped gain. Today the codebase does this
with bare `as PowerLevel` casts. Put each of the two operations in
`src/rules/power.ts` as a small named function that validates its result with
the existing `isPowerLevel` and throws a `RangeError` otherwise — the same
bug-detector-on-a-cheap-operation style `assertFightInvariants` already uses.

This matters because the whole story rests on "a ship can only take a shape
it can afford": if that check is ever wrong, a silent cast produces a negative
power level that typechecks. The gain helper is where the cap at
`MAX_POWER` lives, and where the **amount actually gained** comes from (D9).

Introduce each helper in the step that first needs it (Step 6 for spending,
Step 7 for gaining), not before — a helper nothing calls is dead code.

### D8 — The charging count is taken once, at the start of the end-of-turn pass

§8.6 step 1 keeps its **single pass** over the moving side's fleet in fleet
order. Before the pass, it counts the moving side's ships that are
**charging** — standing on a planet **and** below `MAX_POWER`. If that count
is exactly 1, that ship gains 2; otherwise each charging ship gains 1.

The count is taken from the state **as step 1 begins** and never recomputed
inside the pass. Otherwise a ship reaching maximum partway through the pass
would change the rate for the ships after it, which is a fleet-order
dependency the rules do not have.

A ship already at `MAX_POWER` is **not charging**: it is excluded from the
count, so it neither gains anything nor denies a lone shipmate elsewhere the
double rate. That is the case `story.md` calls out explicitly (a ship at 5 on
one planet and a full ship on another gives the first ship 2).

### D9 — `PowerGainedEffect` reports the amount **actually** gained

The effect gains an `amount` field, and that field is what landed after the
cap, not the rate that was drawn. A ship at 5 taking the double rate reaches 6
and reports `amount: 1`, so the announcement can never claim two points were
gained when only one was.

A useful consequence to note, so nobody over-engineers the wording: within one
end-of-turn sequence the amounts are **uniform**. Either exactly one ship is
charging, and there is one effect (amount 2, or 1 if the cap bit), or two or
more are, and every effect has amount 1. A sequence can never mix a 2 with a

1. The multi-ship clause therefore never has to say "one gained two and the
   others one".

`PowerLostEffect` is **deleted outright**, along with the charged-node branch
that produced it. No end-of-turn step loses power any more, so the type, its
member of the `EndOfTurnEffect` union, its clause in `announcements.ts` and
the grouping that put losses ahead of gains all go.

### D10 — Wording interpolates `MAX_POWER` rather than writing 6 into sentences

`src/board/squareLabel.ts` currently writes `power ${occupant.power} of 4`
with the 4 spelled into the template, and `announcements.ts` says "the maximum
of 4" in two places. Both take the number from `MAX_POWER` instead. The
literal is how the text drifts from the rule the next time the range moves,
and this story is the proof that the range moves.

The tests that pin these sentences keep their literal expected strings —
a test asserting `"power 3 of 6"` is the check that the interpolation
resolves to what the rules say.

### D11 — The gauge: a per-slot position table, lines only, unlit slots still visible

`src/ships/shipArt.ts` today has `GAUGE_SLOT_COUNT = 4`, a list of four x
offsets and a single shared y. It becomes a **six-entry table of (x, y)
positions** in reading order — top row left to right, then bottom row — so
`gaugeSlots`' index continues to mean "the nth slot in the order they light"
and `ShipModel` reads a position per slot rather than an x per slot.

The per-slot overhead **ship icon is deleted**: `ShipSideArt.gaugeIconId`, its
stroke-width constant, the two `<use>` elements in `ShipModel.tsx`, and the
two `<g id=…gauge-icon>` groups in `ShipDefs.tsx` that nothing else
references. A slot becomes a black underlay line with the side's line drawn on
top of it.

An **unlit** slot still draws both lines — the same black underlay, with a
thin line in the side's colour (`unlitOutline`) on top — so a player can count
six positions and see that three of them are lit. Today an unlit slot draws no
line at all; that only worked because the hollow icon still marked the
position, and the icon is going. `GAUGE_PALETTE.unlitFill` most likely loses
its last user and should then be deleted rather than left as a dead field.

Starting geometry, from `story.md` (numbers the owner expects to adjust by eye
at Step 10, not a specification): line length **18** units in the 0–100
viewBox, up from 11; underlay stroke **11**, up from 8, against an unchanged
bar stroke of 6 — that is a black halo of 2.5 units a side, against today's 1;
three columns at x = 8, 41 and 74, each line running 18 units to the right; two
rows at y = 10 and y = 26. That puts the gauge's lower edge around y = 31.5
against today's 29, and leaves the middle of the square clear for the node
marker drawn beneath the ship.

`GAUGE_SEPARATOR_COLOR` is the black underlay's colour and survives, but its
name describes a separator under an icon that no longer exists — rename it
(suggested `GAUGE_UNDERLAY_COLOR`) in the same step, and delete
`GAUGE_SEPARATOR_STROKE_WIDTH`, which only ever styled the icon.

The `data-gauge-slot` and `data-gauge-lit` attributes stay: they are what
`ShipModel.test.tsx` counts.

### D12 — Order: the document, then the range, then the table, then legality, then spending, then what the player sees

`CLAUDE.md` requires the rules edit to be its own commit ahead of the code, so
Step 1 is the document. After that the order is bottom-up by dependency:

1. the **range** widens (Step 2) — it touches nothing but a type, a constant
   and the text that names the maximum;
2. the **table** is re-transcribed with costs and the L (Step 3) — pure
   geometry, verifiable on its own;
3. **movement legality** takes the new blocking rule and the new refusal
   (Step 4), then **attacks** take the same (Step 5) — combat reads movement,
   so it follows it;
4. **spending** (Step 6) needs both the costs and the legality checks to be
   right before it deducts anything;
5. the **end-of-turn** source of power (Step 7) is independent of all of the
   above and could sit anywhere after Step 2; it goes here so the whole rules
   layer is finished before the presentation layer starts;
6. **announcements** (Step 8) and the **gauge** (Step 9) are what the player
   hears and sees, then the owner's **eye** (Step 10), then `README.md` and
   the final sweep (Step 11).

Steps 3 through 7 each change behaviour that existing integration tests
(`camping.test.ts`, `recovery.test.ts`, `fullGame.test.ts`,
`seededReplay.test.ts`, `session.test.ts`, `Board.test.tsx`) assert. **Every
step leaves the whole suite green**: a step that breaks a test fixes that test
in the same step. Each step below names the files most likely to be affected,
but the list is a warning, not a boundary — run the suite and fix what fails.

### D13 — Recorded games move, and that is expected

`src/rules/seededReplay.test.ts` writes down no golden board or golden final
state: it plays one seed twice and compares the runs, and plays two seeds and
asserts they differ. What it does carry is a set of "the run is not vacuous"
floors — fight count, planet returns, charged nodes, node replacements — each
with a comment quoting the figure measured when the floor was chosen. Those
measurements will move as soon as the reach table changes, because the policy
picks the first legal action and the legal set is different.

Where a floor still passes, refresh its comment with the newly measured
figure. Where one no longer clears with margin, re-measure and lower it, and
say in the comment what was measured. Do not delete a floor, and do not
tighten one to hug the new measurement. The same-seed, same-actions,
same-game premise must still hold — that is what the file exists to prove.

### D14 — Accessibility

Per `CLAUDE.md`, accessibility repair is not this story's work and **no step
is added for testing accessibility**. Existing automated tests are updated
where the path is straightforward.

Nothing here is expected to cost an accessible behaviour: a square's
accessible name still states the occupant's power and still says which
squares can be moved to and attacked, and the gauge is decorative and
`aria-hidden` either way. Two things are worth watching as the work lands, and
if either turns out to be a real loss it is **recorded** as a note in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, not repaired:

- the move and attack announcements grow a clause each, so the live region
  says more per action than it did;
- neither the gauge nor a square's name says what a given destination would
  cost, so affordability is inferred from which squares are highlighted —
  which is equally true for a sighted player (S5), and so probably not a loss
  at all.

## Steps

### Step 1 — Rules 0.23 → 0.24: power is a reserve, moves are priced

Status: committed

Notes: Edited §1, §2, §3.1, §4, §4.1, §6, §7, §8.1, §8.5 and §8.6 step 1 (plus
the "turn passes" paragraph beneath §8.6's step list, and §7.2's recovery
sentence) as the step directs, bumped the version line to 0.24, bumped
`RULES_VERSION`, and added one changelog entry covering the whole story. The
`grep -ni "drain"` sweep's one hit that mentions "ship's power" (§4.1's "a
charged node does not drain it") is expected: it is the step's own prescribed
sentence stating the negation of the old rule, not a leftover of it. No other
deviation from the plan.

Edit `doc/ruleset/rules.md` so that no sentence in it says a node changes a
ship's power, that power unlocks a move rather than buying it, that a friendly
ship blocks, or that a ship's maximum is 4. Bump the document's version to
**0.24**, bump `RULES_VERSION` in `src/rules/rulesVersion.ts` to the same
string, and add one `doc/ruleset/changelog.md` entry at the top (newest first)
covering the whole story, in the style of the existing entries and marked as a
gameplay change with tagging on hold. This is its own commit, ahead of every
code change (S1). Do **not** tag.

The sections to edit, with what each must say afterwards:

- **§1, the overview.** Power is a reserve a ship carries, spends to move and
  refills on planets. Delete the sentences saying that holding a node drains a
  ship, that the longer it holds one the harder it is to leave, and that a
  depleted node is where a ship pays energy for recovery. A depleted node is
  now a straight cost. The five random elements are unchanged.
- **§2, the "Power" entry.** Stop describing what a node takes. Power is what
  a ship carries and spends to move, refilled on planets.
- **§3.1, the planet rule.** A ship standing on a planet at the end of its
  owner's turn gains **one** power, or **two** when it is the only one of that
  player's ships charging, to the maximum of **6**. A ship already at 6 is not
  charging: it gains nothing and does not stop another ship taking the double
  rate. Flying over a planet still does nothing, and arriving on one still
  does nothing by itself.
- **§4's closing line.** "Every ship starts at full power (6)."
- **§4.1, rewritten.** A ship carries between 0 and 6 power. Power is what it
  spends to move: every move has a price in §6's table, and a ship may take
  any move it can afford. A ship gains power at the end of its owner's turn
  standing on a planet — one, or two if it is the only one of that player's
  ships charging (§3.1) — up to the maximum of 6. **Nothing else changes a
  ship's power**: a charged node does not drain it, a depleted node does not
  refill it, an inactive node does neither, and a fight leaves the defender's
  alone (§7). A ship at 0 power is not destroyed and is not stuck: the
  one-square orthogonal move is free, and a planet will refill it.
- **§6, rewritten around cost.** The opening straight-line sentence goes: a
  ship moves one or two squares, orthogonally, diagonally or in an **L**, and
  what it may do depends on what it can pay. The table becomes the four-row
  cost table: one square orthogonally 0, one square diagonally 1, two squares
  orthogonally 2, the L (one orthogonal step and one diagonal step, in either
  order) 2. Then the reach sentence: twenty squares at 2 power or more, eight
  at 1, four at 0 — the existing "twenty at full power, four at empty"
  sentence survives word for word and gains the eight. The clear-path
  paragraph becomes: every square a move passes over must be free of **enemy**
  ships — a ship flies over its own side freely — and the square it lands on
  must be empty of any ship, of either side. Describe the **L's two corners**
  plainly enough that a player can see which two squares they are, and say
  that an enemy on **either** one blocks it. "Moving and attacking are
  entirely separate" is unchanged.
- **§7, following §6.** Attack range is still movement range, so it is what
  the attacker can **afford**, the L included. The attack **costs** that
  price: the attacker pays it as the attack resolves and arrives on its planet
  already having paid; the defender pays nothing. Restate the two extremes: a
  ship at 0 power strikes one square orthogonally and nothing else, a ship
  with 2 or more strikes anywhere in the twenty. §7's clear-path sentence
  takes §6's new blocking rule. The **trade paragraph changes**: an attack
  spends the attacker's position **and** the power the shot cost, to take away
  the opponent's position — the sentence saying it does not cost power is no
  longer true. §7.1 (returning to a planet) and §7.2 are unchanged except
  where §7.2 refers to recovery on a planet, which now happens at the §3.1
  rate.
- **§8.1, §8.5 and §8.6 step 1 lose their power clauses.** A charged node pays
  energy and protects the holder, and takes nothing. A depleted node costs
  energy and gives nothing back. §8.6 step 1 becomes the planet gain alone —
  one or two power for each of the moving player's ships on a planet, by
  §3.1's rate — and the paragraph below the step list, about a passed turn
  still running the sequence, follows it.

Nothing else in the document changes. In particular §3.2 (where a node may
appear), §8.2, §8.3, §8.4 and Appendix B, if the numbers in it are about
nodes and energy, are untouched (S3).

Depends on: nothing — this is the first step, and it is what every later step
implements.

Verification (automated): Run `npm test` and confirm `rulesVersion.test.ts`
passes — it asserts `RULES_VERSION` matches the version line in `rules.md` and
that the changelog has a `## 0.24 ` entry. Then confirm by search that the
document no longer contains the retired claims — run
`grep -n "maximum of 4" doc/ruleset/rules.md`, then the same for
`"full power (4)"` and `"0 and 4"`, and confirm each finds nothing. Then run
`grep -ni "unlock" doc/ruleset/rules.md` and confirm it finds nothing, and
`grep -ni "drain" doc/ruleset/rules.md` and confirm every surviving hit is
about a node's drain (§2's Drain entry, §8.3, §8.6 step 3) and none about a
ship's power.
Run `npm run format:check`.

### Step 2 — The tank widens to 0–6

Status: committed

Notes: Widened `PowerLevel` and `MAX_POWER` in `power.ts` as directed, and
interpolated `MAX_POWER` into `squareLabel.ts`'s occupant segment and
`announcements.ts`'s `powerGainedClause` (`powerLostClause` never carried a
"maximum of 4"/"of 4" literal — it only ever said "reached 0" — so there was
nothing to interpolate there; not a deviation, just the plan's search target
not existing on that function). Updated every failing test's fixtures and
expectations: `power.test.ts` (0–6 range), `fleet.test.ts` and
`gameState.test.ts` (start at `MAX_POWER`), `squareLabel.test.ts`,
`Board.test.tsx`, `App.test.tsx` and `ShipModel.test.tsx` (`of 4` → `of 6`),
`announcements.test.ts` (the "maximum of 4/6" fixtures and wording). Several
integration tests needed more than a literal swap because the still-active
pre-Step-7 rules (a depleted node still refills power, a charged node still
drains it) now cap at 6 instead of 4: `camping.test.ts` (three fixtures that
relied on a ship already being "full" at 4 needed explicit `MAX_POWER` so a
depleted-node or planet gain still has nothing to add), `session.test.ts`
(the stuck-position fixture's planet-sitting ship needed the same fix), and
`recovery.test.ts` (the turn-by-turn recovery test now runs six rounds to
reach the real maximum instead of stopping at the old one, and its
full-power fixtures became explicit `MAX_POWER`). The movement table and
`REACH_OPTIONS` were left untouched as directed; ships above power 4 gain
nothing more until Step 3.

In `src/rules/power.ts`, widen `PowerLevel` to `0 | 1 | 2 | 3 | 4 | 5 | 6` and
set `MAX_POWER` to 6. `MIN_POWER` and `isPowerLevel` keep their shape, and the
module comment follows §4.1's new wording (a reserve spent on moves, refilled
on planets — what a move costs lives in `movement.ts`).

Because `src/rules/fleet.ts` builds the starting fleet at `MAX_POWER`, this
alone makes every ship start at 6, which is what §4 now says.

In the same step, take the maximum out of the two places that spell it into
text (D10):

- `src/board/squareLabel.ts` — the occupant segment reads
  `power 3 of 6`, with the 6 interpolated from `MAX_POWER`.
- `src/board/announcements.ts` — `powerGainedClause` and `powerLostClause`
  say "the maximum of 6", interpolated the same way. (`powerLostClause` is
  deleted later, in Step 7; interpolating it here costs nothing and keeps the
  step's search-and-replace complete.)

Do not touch the movement table in this step. A ship at 5 or 6 power simply
gets nothing more than one at 4 until Step 3, which is a transient state and
is fine.

Update every test that asserts the old range or the old maximum. Expect at
least: `power.test.ts` (the range), `fleet.test.ts` and `gameState.test.ts`
(ships start at 6), `squareLabel.test.ts` and `Board.test.tsx` (`of 4` becomes
`of 6` throughout), `announcements.test.ts` (the "maximum of 4" sentences),
`endOfTurn.test.ts`, `camping.test.ts` and `recovery.test.ts` (anywhere a gain
is asserted to stop at 4). Hand-built fixtures that give a ship `power: 4` are
still valid and need not all become 6 — change one only where the test's point
is that the ship is **full**.

Depends on: Step 1 (§4.1 and §4 are what this implements).

Verification (automated): Run `npm run typecheck`, `npm run lint`,
`npm test` and `npm run format:check`; all pass. Confirm the range directly:
`power.test.ts` asserts `isPowerLevel` accepts 0 through 6 and rejects 7 and
−1, and `fleet.test.ts` asserts every starting ship carries `MAX_POWER`.
Confirm the maximum is no longer spelled into any
string: `grep -rn "of 4" src` and `grep -rn "maximum of 4" src` both return
nothing (the three hits today are `squareLabel.ts` and two in
`announcements.ts`).

### Step 3 — The cost table, and the L

Status: committed

Notes: Re-transcribed `REACH_OPTIONS` as a `StraightReachOption | LReachOption`
union carrying `cost` instead of `unlockedAtPower`, with the L's eight
offsets and their two corners written as literal data in `L_OFFSETS` (D2),
and added `allShapesFrom` and `shapeReaching` alongside `reachFrom` per D4;
`reachFrom` is now `allShapesFrom(origin).filter(cost <= power)`. Blocking and
refusal reasons are untouched, as directed — `moveRefusalReason` still treats
any occupant as blocking and still returns `"out-of-range"` for an
unaffordable shape, both due in Step 4. Rewrote `movement.test.ts`'s reach
coverage for the new table and added a dedicated "the L" suite, including a
test that derives each L's corners from the sign rule independently of the
literal table, per D2's instruction to pin the rule with a test. Fixed
fallout from the retired two-square-diagonal and three-square-orthogonal
shapes (and the fact that a 2-power ship now reaches the same twenty squares
as a full one) across `session.test.ts`, `camping.test.ts`, `combat.test.ts`,
`fullGame.test.ts`, `ply.test.ts`, `recovery.test.ts` and
`seededReplay.test.ts`'s floors (re-measured for this seed: 3 fights, 6
planet returns, 9 charged nodes, 9 node replacements over forty rounds,
floors lowered accordingly per D13) — all as the plan anticipated. No other
deviation from the plan.

Re-transcribe `REACH_OPTIONS` in `src/rules/movement.ts` from the new §6 table
(D1):

- `unlockedAtPower` becomes **`cost`**, and the filter in `reachFrom` becomes
  "cost at or below the ship's power";
- the two-squares-diagonally and three-squares-orthogonally rows are
  **deleted**;
- one row per §6 row: one square orthogonally (0), one square diagonally (1),
  two squares orthogonally (2), and the **L** (2);
- the L row carries its **eight offsets as literal data**, each with its two
  corner offsets, per D2.

`ReachEntry` gains a **`cost`** field — the price of the move that reaches
that destination. `reachFrom(origin, power)` keeps its exact signature and
returns the affordable entries, each carrying its cost. Add the two lookups
D4 describes: every shape from an origin regardless of power, and the shape
(if any) that reaches a given destination from a given origin. `reachFrom`
becomes the affordable subset of the first, so there is one place the
geometry is generated.

The L's eight entries each put **both** corners in `passedOver`, in a stable
order (state the order in the code comment — orthogonal corner first reads
naturally against §6's "one orthogonal and one diagonal"). Off-board entries
are discarded exactly as they are today.

Update the module comment: §6 is no longer "a straight line as far as power
allows" but "one or two squares, orthogonally, diagonally or in an L, priced
by §6's table, and a ship may take any shape it can afford".

Do **not** change the blocking rule or add a refusal reason in this step —
`moveRefusalReason` keeps returning `"out-of-range"` for an unaffordable
square until Step 4, and keeps treating any ship as blocking until Step 4.

Rewrite `movement.test.ts`'s reach coverage against the new table: 20
destinations from an open square at 2 power or more, 8 at 1, 4 at 0; the two
retired shapes are gone at every power level; the L's eight destinations from
a named origin, each with exactly its two corners in `passedOver` and each
matching D2's sign rule; every entry's `cost` is the price §6 gives its shape;
and no destination appears twice across the whole table (the one-price
property). Board edges and corners clip as before.

Expect fallout in `combat.test.ts` (its two-square-diagonal attack lane is
gone), `recovery.test.ts` (it calls `reachFrom` directly),
`session.test.ts`, `Board.test.tsx`, `ply.test.ts` and `camping.test.ts`
wherever a fixture moves a ship three squares orthogonally or two
diagonally, and in `seededReplay.test.ts`'s floors (D13). Fix each in this
step.

Depends on: Steps 1 (§6's table) and 2 (a `PowerLevel` that reaches 6).

Verification (automated): Run `npm run typecheck`, `npm run lint`, `npm test`
and `npm run format:check`; all pass. The new `movement.test.ts` cases are the
proof: 20 / 8 / 4 destinations by power, the L's eight destinations with two
corners each, and one price per destination.

### Step 4 — Only enemies block, and "you cannot afford that" is its own answer

Status: committed

Notes: `moveRefusalReason` now looks the shape up with `shapeReaching` (out-of-range
when none exists), refuses `"cannot-afford"` when the ship's power is below the
shape's cost, and the `passedOver` block check ignores an occupant on the
mover's own side (D3). Added `"cannot-afford"` to `MoveRefusalReason` and its
sentence in `rejectionSentence`, and reworded `"path-blocked"`'s sentence to
"An enemy ship is in the way of …" now that only an enemy ever produces it.
Rewrote `movement.test.ts`'s blocking coverage (friendly-vs-enemy on the
two-square move's midpoint and on each L corner independently, the
cannot-afford/out-of-range split) and `announcements.test.ts`'s rejection
table for both changed/added sentences. No deviation from the plan.

In `src/rules/movement.ts`:

- **Blocking becomes side-aware** (D3). `moveRefusalReason`'s `passedOver`
  test looks up the ship standing on each passed-over square and ignores it
  when it belongs to the moving ship's own side. Only an enemy ship yields
  `"path-blocked"`. The destination test is unchanged: any ship there yields
  `"destination-occupied"`.
- **A new refusal reason** distinguishes "the ship cannot pay for that shape"
  from "that square is not a shape at all" (D5). `"out-of-range"` now means
  only the latter; the new reason (suggested `"cannot-afford"`) covers a real
  shape the ship has too little power for. Check order inside the §6 block:
  is it a shape at all → can the ship afford it → is the path clear → is the
  destination empty.
- `legalDestinations` and `sideToMoveHasLegalMove` need no logic change — they
  filter on `moveRefusalReason` and on `reachFrom` — but re-read their doc
  comments and correct anything that now misdescribes reach or blocking.

In `src/board/announcements.ts`, give the new reason its sentence, distinct
from being out of range. Suggested wording, which the implementer may polish
and the test then pins: `"H8 costs more power than the selected ship has. A
step up, down, left or right is free; a diagonal step costs 1; two squares or
an L cost 2."` Also re-read the existing `"path-blocked"` wording — "Another
ship is in the way" is now only ever an enemy ship, and may say so.

`src/game/session.ts` needs no change: `RejectionReason` is the union of the
two refusal types and picks the new member up automatically.

Update `movement.test.ts` for the new behaviour: a friendly ship on the
middle square of a two-square orthogonal move does not block it and an enemy
ship there does; a friendly ship on either L corner does not block and an
enemy on either one does, independently; the destination is barred to both;
and a ship at 1 power asking for an L or a two-square orthogonal move is
refused with the new reason, not with `"out-of-range"`, while a square no
shape reaches is still `"out-of-range"`. Update `announcements.test.ts` for
the new sentence, and expect fallout in `session.test.ts`, `Board.test.tsx`
and `camping.test.ts` wherever a fixture relied on a friendly ship blocking.

Depends on: Step 3 (the cost on `ReachEntry` and the shape lookup are what
tell the two refusals apart).

Verification (automated): Run `npm run typecheck`, `npm run lint`, `npm test`
and `npm run format:check`; all pass. The proof is in `movement.test.ts`: the
friendly/enemy pairs for the two-square move and for both L corners, and the
1-power ship being told it cannot afford the L rather than that the L is out
of range.

### Step 5 — Attacks reach as far as they can afford, and are blocked only by enemies

Status: committed

Notes: `attackReach` now returns `shapeReaching(attacker.square, target)` — purely
geometric, as its comment already claimed. `attackRefusalReason` gains
`"cannot-afford-target"` (checked right after `"target-out-of-range"` and
before the path check) and its `passedOver` block check now ignores an
occupant on the attacker's own side, mirroring Step 4's move refusal (D3).
`legalTargets` needed no change, as planned — it already reads
`reachFrom(attacker.square, attacker.power)`. Added the new sentence to
`rejectionSentence` and reworded `"attack-path-blocked"`'s sentence to "An
enemy ship stands in the way …" now that only an enemy ever produces it.
`"target-out-of-range"`'s sentence was also rewritten, on the orchestrator's
correction after review: it originally explained the refusal in terms of a
drained ship's power ("a ship at 0 power can only strike one square …"), which
was this implementer's first-pass judgement that no change was needed since
the sentence names no obsolete figure — but that missed that the reason no
longer has anything to do with power at all once `"cannot-afford-target"`
exists to cover that case (D5), so the sentence pointed a full-power player at
the wrong fix. It now says only that the square is not one of the shapes a
ship can attack from here, whatever power it carries. Updated `combat.test.ts`
(friendly-vs-enemy blocking on the two-square lane, either L corner blocking
independently, the new cannot-afford-target refusal, and a reach-parity check
across every power level 0–6) and `announcements.test.ts` for both sentences.
`Board.test.tsx`'s "does not highlight a target beyond a blocking ship, of
either side" test relied on a friendly blocker; split it into an enemy-blocks
case and a new friendly-does-not-block case (`rangeState` gained an optional
`blockerSide`, defaulting to the enemy side to keep every other call site
unchanged) — this fallout wasn't named in the plan's file list but follows
directly from D3. No other deviation from the plan.

In `src/rules/combat.ts`:

- `attackReach` becomes **purely geometric**: it answers with the shape that
  reaches the target from the attacker's square regardless of the attacker's
  power, using the shape lookup from Step 3. Its doc comment already claims to
  be purely geometric; this makes that true, and lets the refusal below tell
  out-of-range from unaffordable.
- `attackRefusalReason` gains an **affordability check** with its own reason
  (suggested `"cannot-afford-target"`, D5), placed immediately after
  `"target-out-of-range"` and before the path check: a square no shape reaches
  is out of range; a shape the attacker cannot pay for is unaffordable; only
  then does the path matter. Being told the shot is unaffordable is more
  useful than being told it is blocked, and a shot that is both is refused as
  unaffordable.
- The **path test becomes side-aware** exactly as movement's did (D3): only an
  enemy ship on a passed-over square yields `"attack-path-blocked"`. The
  target square is not in `passedOver`, so its occupant never blocks the shot
  at it.
- `legalTargets` keeps reading `reachFrom(attacker.square, attacker.power)`,
  so it lists affordable targets only, and needs no logic change.

In `src/board/announcements.ts`:

- rewrite the `"target-out-of-range"` sentence for the new range — a ship
  attacks as far as it moves, which is now at most two squares or an L, and
  the old sentence's "a drained ship barely strikes at all" claim about 0
  power is still true and worth keeping;
- add the new unaffordable-target sentence, distinct from out of range.
  Suggested: `"The selected ship does not have the power to strike H8. An
orthogonal step is free, a diagonal costs 1, and two squares or an L cost
2."`

Update `combat.test.ts`: attack range matches movement range at each power
level, the L included; the L as an attack lane blocked from either corner
independently; a friendly ship in the lane not blocking a shot while an enemy
does; a ship at 0 power able to strike an orthogonally adjacent enemy and
nothing else; a ship at 1 power refused an L target with the new reason.
Update `announcements.test.ts` for both sentences, and expect fallout in
`session.test.ts` and `Board.test.tsx`.

Depends on: Steps 3 and 4 (the shape lookup, the cost, and the pattern the
movement refusal set now follows).

Verification (automated): Run `npm run typecheck`, `npm run lint`, `npm test`
and `npm run format:check`; all pass. The proof is in `combat.test.ts`: reach
parity with movement at every power level, either-corner L blocking, friendly
ships not blocking a shot, and the unaffordable-target refusal.

### Step 6 — Moves and attacks spend the reserve

Status: committed

Notes: Added `spendPower` to `power.ts` per D7, and wired `applyMove` /
`applyAttack` in `ply.ts` to look up the shape (`shapeReaching` /
`attackReach`) and deduct its cost, with `AppliedMove` gaining `cost` and
`powerAfter` and `FightResolvedEffect` gaining `cost` (D6). `placeOnPlanet`
now takes an explicit `power` argument so the attacker's call can pass its
post-cost power while the defender's passes its own untouched.
`assertFightInvariants` took the wider signature the owner approved
(`attackerShipId`, `cost` added ahead of `returnedShipIds`) and now asserts
the defender's power is exactly what it was and the attacker's is exactly
its before-fight power less `cost`, rather than "unchanged" for both.
`MovedEvent` in `session.ts` carries `cost` and `powerAfter` through from
`AppliedMove`, per D6, even though nothing reads them until Step 8. Updated
`power.test.ts` (new `spendPower` coverage), `ply.test.ts` (a new "applyMove
deducts the shape's cost" describe block covering all four costs and the
three-L-then-refused-fourth budget, a new diagonal-attack cost test, the
`assertFightInvariants` tests threaded through the new parameters plus a new
case for an attacker whose power didn't fall by the cost, and the existing
"ends on a planet vs. flies over one" test reworked since a two-square
orthogonal move now costs 2 where it used to be free), and fixed fallout in
`announcements.test.ts`, `Board.test.tsx`, `EnergyOverlay.test.tsx` and
`session.test.ts` (new required fields on hand-built `MovedEvent` /
`FightResolvedEffect` fixtures) and in `camping.test.ts` and
`recovery.test.ts` (fixtures that used a now-priced two-square move to
shuttle or arrive, updated to either account for the new cost or swapped for
a free one-square step where the test's point was unrelated to cost) — all
anticipated by the plan. No deviation from the plan.

Add the checked "spend" helper to `src/rules/power.ts` (D7): power in, cost
out, validated with `isPowerLevel` and throwing a `RangeError` if the result
is not a legal level.

In `src/rules/ply.ts`:

- **`applyMove`** looks the move's shape up (D4), deducts its cost from the
  moving ship as it places it on the destination, and returns the cost and the
  ship's power afterwards on `AppliedMove` (D6). A ship that ends a move on a
  planet still gains nothing on arrival. A free move deducts nothing and must
  not round-trip the ship through a needless state change.
- **`applyAttack`** deducts the cost of the shape it struck down from the
  attacker, at the moment the fight resolves — the attacker arrives on its
  planet already having paid. The defender's power is untouched.
  `FightResolvedEffect` gains the **cost**; `FightShip.power` stays the
  before-the-fight snapshot for both ships (D6).
- **`assertFightInvariants`** changes from "a returned ship's power is
  unchanged" to the two facts that are now true: the **defender's** power is
  exactly what it was, and the **attacker's** is exactly its before-the-fight
  power less the cost of the shape it struck down. The function therefore
  needs to know which returned ship is the attacker and what the shot cost —
  extend its parameters rather than weakening the check. It stays exported so
  a test can hand-construct an otherwise-impossible before/after pair.
- Update the module comment: an action no longer leaves a ship "with the power
  it had".

In `src/game/session.ts`, `MovedEvent` carries the move's cost and the mover's
power afterwards through from `AppliedMove` (D6). Nothing reads them until
Step 8; adding them here is what lets Step 8 be wording only.

Update `ply.test.ts`: an orthogonal step deducts nothing, a diagonal deducts
1, a two-square orthogonal and an L each deduct 2; a full ship can make three
L moves and then is refused a fourth while still able to step orthogonally for
ever; an attack deducts the attacker's cost and leaves the defender's power
alone; both ships still land on random empty planets, attacker drawn first;
and the fight invariants throw on an attacker whose power did not fall by the
cost and on a defender whose power moved at all. Expect fallout in
`recovery.test.ts` (a fight no longer leaves the attacker's power alone),
`camping.test.ts`, `fullGame.test.ts` and `seededReplay.test.ts` (D13).

Depends on: Steps 3, 4 and 5 (a cost to spend, and legality checks that
guarantee a ship is never asked to spend more than it has).

Verification (automated): Run `npm run typecheck`, `npm run lint`, `npm test`
and `npm run format:check`; all pass. The proof is in `ply.test.ts`: the four
per-shape deductions, the three-L budget, and the attacker-pays/defender-does-
not pair, plus the invariant assertions throwing on a hand-built bad pair.

### Step 7 — Planets become the only source of power

Status: in progress — partially implemented, **uncommitted in the working tree**

Notes: The implementing agent was terminated mid-step by a session rate
limit, not by anything wrong with the work. Its changes are in the working
tree, uncommitted, and the suite is **not** green: 17 failures across 4 test
files, all of them fallout in tests rather than in the rule logic.

Done and present in the tree:

- `src/rules/endOfTurn.ts` — step 1 rewritten: the charged-node loss and the
  depleted-node gain are gone, and the planet gain carries the rate.
- `src/rules/power.ts`, `src/board/announcements.ts` — follow it.
- `src/rules/endOfTurn.test.ts` — rewritten, including a case for a ship at
  the maximum neither gaining nor denying a lone shipmate the double rate.
- `src/rules/camping.test.ts` — rewrite begun, not finished.

Remaining, to finish the step:

- `src/rules/recovery.test.ts` — untouched. Still compares against the
  deleted `"power-lost"` effect (typecheck errors at lines 151, 175, 302,
  371) and still asserts a lone beaten ship on a planet recovers at one a
  turn, where it now recovers at two.
- `src/rules/ply.test.ts` — planet-gain expectations need the double rate;
  several `applyAttack` and `applyPassGuard` cases assert the old one-a-turn
  gain or a charged-node power loss that no longer happens.
- `src/rules/camping.test.ts` — finish the rewrite; one stale `"power-lost"`
  comparison remains at line 566.

Resume by re-dispatching `implement-step` for Step 7 against the tree as it
stands, told to finish the test fallout rather than restart the
implementation. Do not commit until typecheck, lint and the full suite are
green.

Add the checked capped-"gain" helper to `src/rules/power.ts` (D7): it caps at
`MAX_POWER` and reports the amount **actually** gained.

In `src/rules/endOfTurn.ts`, rewrite step 1 (D8, D9):

- delete `PowerLostEffect`, its member of the `EndOfTurnEffect` union and the
  charged-node branch that produced it — no end-of-turn step loses power any
  more;
- delete the depleted-node gain branch;
- keep the **single pass** over the moving side's fleet, in fleet order, so
  effects still come out in fleet order;
- before the pass, count the moving side's **charging** ships — on a planet
  and below `MAX_POWER`. Exactly one → that ship gains 2; otherwise each
  charging ship gains 1. The count is taken once, from the state as step 1
  begins, and never recomputed inside the pass;
- `PowerGainedEffect` gains an **`amount`** field carrying what actually
  landed after the cap;
- update the step-1 comment to describe the new rule and to say why the count
  is taken up front.

In `src/board/announcements.ts`:

- delete `powerLostClause` and the power-loss grouping in `endOfTurnClauses`,
  and the `"power-lost"` cases in its switch;
- `powerGainedClause` says **how much** was gained ("gained 2 power", "gained
  1 power") and names the maximum as `MAX_POWER` (D10). Per D9 the amounts
  within one sequence are uniform, so the multi-ship clause never has to mix
  them; the single-ship clause is the only one that can say 2.

Steps 2 through 6 of the sequence are untouched (S3).

Update `endOfTurn.test.ts`: a lone charging ship gains 2; two charging ships
gain 1 each; a ship already at `MAX_POWER` neither gains nor denies a lone
shipmate the double rate; a ship at 5 taking the double rate lands on 6 and
its effect reports an amount of 1; neither a charged nor a depleted node
touches power any more; and the count is not recomputed mid-pass (two
charging ships where the first reaches maximum still both gain 1). Update
`announcements.test.ts` for the gained clause and the deleted lost clause, and
expect substantial fallout in `camping.test.ts` (its charged-node drain and
depleted-node recovery coverage) and `recovery.test.ts` (whose whole premise —
that a ship recovers on a planet **or** a depleted node — is now half wrong;
rewrite its module comment as well as its cases).

Depends on: Steps 1 (§3.1, §4.1 and §8.6 step 1) and 2 (the cap at 6).

Verification (automated): Run `npm run typecheck`, `npm run lint`, `npm test`
and `npm run format:check`; all pass. The proof is in `endOfTurn.test.ts`: the
lone-ship 2, the two-ship 1 each, the full ship counting for nothing, the cap
at 6 reporting an amount of 1, and no power movement from either node state.

### Step 8 — The move and the attack say what they cost

Status: pending

In `src/board/announcements.ts`:

- **`moveSentence`** gains a clause saying what the move cost and what the
  ship has left, reading the cost and the resulting power from `MovedEvent`
  (Step 6, D6). A free move must not claim a cost. Suggested wording, which
  the implementer may polish and the tests then pin: `"Green ship moved from
H8 to J9. The move cost 2 power, leaving 4."` and, for a free move,
  `"… The move was free; it still has 6 power."` The planet variant of the
  sentence keeps its "onto the … planet" phrasing and gains the same clause.
- **`fightSentence`** stops saying both ships kept the power they were
  carrying — that is no longer true of the attacker. It says what the attack
  cost the attacker and what the attacker has left (`attacker.power` minus the
  effect's cost, D6), and that the defender kept what it was carrying. A free
  attack — an orthogonal jab — must not claim a cost.

`src/game/session.ts` already carries what is needed after Step 6; if it does
not, that is a Step 6 omission to fix here and to record in this step's Notes.

Update `announcements.test.ts` for both sentences at each cost, free included,
and expect fallout in `Board.test.tsx` and `session.test.ts` wherever a live
region's text is asserted whole.

Depends on: Steps 6 (the cost on the result and the event) and 7 (the
end-of-turn clauses, so the whole announcement is settled in one place).

Verification (automated): Run `npm run typecheck`, `npm run lint`, `npm test`
and `npm run format:check`; all pass. The proof is in `announcements.test.ts`:
a 0-cost, a 1-cost and a 2-cost move each worded correctly, and a fight
sentence naming the attacker's cost and remainder while saying the defender
kept what it had.

### Step 9 — The gauge becomes six lines in two rows of three

Status: pending

Implement D11.

In `src/ships/shipArt.ts`:

- `GAUGE_SLOT_COUNT` becomes **6**;
- `GAUGE_SLOT_X` and `GAUGE_SLOT_Y` are replaced by a six-entry table of
  (x, y) positions in **reading order** — top row left to right, then bottom
  row — so slot index still means "the nth slot to light";
- `ShipSideArt.gaugeIconId` and `GAUGE_ICON_STROKE_WIDTH` are deleted;
- `GAUGE_SEPARATOR_STROKE_WIDTH` is deleted and `GAUGE_SEPARATOR_COLOR` is
  renamed to something that describes what it now is (suggested
  `GAUGE_UNDERLAY_COLOR`);
- the bar geometry takes the starting numbers from D11: line length 18,
  underlay stroke 11, bar stroke 6, columns at x = 8, 41, 74, rows at
  y = 10, 26. Add a stroke width for an **unlit** slot's thin line (suggested
  1.5), drawn in `unlitOutline`;
- `GAUGE_PALETTE.unlitFill` is deleted if, as expected, nothing uses it once
  the icon is gone.

In `src/ships/ShipModel.tsx`: drop the two `<use>` elements per slot, draw
every slot as its black underlay line plus a line on top — the side's
`barColor` at the full bar stroke when lit, `unlitOutline` at the thin stroke
when not. Keep `data-gauge-slot` and `data-gauge-lit`. Update the module
comment, which currently describes a row of four overhead ship icons.

In `src/ships/ShipDefs.tsx`: delete both gauge-icon `<g>` groups and any
`<defs>` geometry they alone referenced, leaving the hulls untouched (S6).

In `src/ships/powerGauge.ts`: `gaugeSlots` needs no logic change — it already
lights the first `power` of `GAUGE_SLOT_COUNT` slots — but its comment says
"four slots, left to right" and must say six, in two rows, lit in reading
order.

Update `powerGauge.test.ts` (six slots at every power level 0–6),
`ShipModel.test.tsx` (six slots in order; **every** slot now draws two lines,
so the old "bars only on lit slots" assertion becomes "a lit slot's top line
is the bar colour at the bar stroke, an unlit slot's is the outline colour at
the thin stroke"; the power levels array runs 0–6; the alongside-`squareLabel`
case reads `power N of 6`), and `ShipDefs.test.tsx` (the gauge-icon ids are
gone).

Per D14, if this step costs an accessible behaviour, record it in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather than
repairing it. None is expected: the gauge is decorative and `aria-hidden`, and
the square's accessible name is where a screen reader gets the power level.

Depends on: Step 2 (a `PowerLevel` that reaches 6 — a six-slot gauge with a
four-point maximum would be untestable at its top end).

Verification (automated): Run `npm run typecheck`, `npm run lint`, `npm test`
and `npm run format:check`; all pass. The proof is in `powerGauge.test.ts` and
`ShipModel.test.tsx`: six slots at every level, lit in reading order, the
right number lit for each power, and no `<use>` of a gauge icon anywhere in
the rendered ship. Confirm nothing dead is left:
`grep -rn "gaugeIconId\|GAUGE_ICON_STROKE_WIDTH\|GAUGE_SEPARATOR_STROKE_WIDTH\|GAUGE_SLOT_X\|unlitFill" src`
returns nothing.

### Step 10 — The owner looks at the gauge

Status: pending

No code is written before this step's check. The numbers in Step 9 are a
starting point, not a specification the owner has approved by eye
(`story.md`), so this step is where they are adjusted. Any adjustment lands in
`src/ships/shipArt.ts` alone — line length, stroke widths, column x values and
row y values — and is recorded in this step's Notes.

Depends on: Step 9 (the gauge as drawn from the starting numbers).

Verification (manual): Run `npm run dev` and open the app in a browser. Start
a game and confirm, by eye:

- the gauge shows **six** slots in two rows of three, with no ship icon, and
  the lit ones light in reading order — top row left to right, then bottom
  row;
- three lit slots read unambiguously as three **of six** — the unlit
  positions are still countable;
- the line length, the black halo thickness and the two row positions look
  right on the board, at a **full** reserve (six lit) and at a nearly empty one
  (one lit), for both green and red ships;
- the node marker drawn beneath a ship is still readable through the middle of
  the square, with a ship standing on a charged node and on a depleted one;
- the gauge is legible at the smallest board size the layout produces (resize
  the window down) as well as at full size.

Adjust `shipArt.ts` until the owner is satisfied, re-running `npm test` and
`npm run format:check` after any change.

### Step 11 — `README.md`, and the sweep for anything left saying the old rules

Status: pending

`README.md` is player-facing (`CLAUDE.md`, Intended audience). Its overview
paragraph on power and both quoted passages currently say a node drains a ship
and a depleted node hands power back. Rewrite them for the new rules: power is
a reserve a ship spends on moves and refills only on planets, at one a turn or
two for a ship charging alone, up to six; every move has a price, the longest
move is two squares and there is a new L; only enemy ships block a path; an
attack costs the attacker the price of the shape it struck down. Keep the
register — it is written for a non-technical reader. `/update-readme` reviews
the branch diff and does this; check its output rather than trusting it.

Then sweep the repository for anything still describing the old rules:

- no comment, doc string or test name in `src/` says a node changes a ship's
  power, that power unlocks a move, that a friendly ship blocks, that a ship's
  maximum is 4, or that a fight leaves both ships' power alone;
- no file or export left behind by the gauge's lost icon (Step 9's grep), and
  nothing else unused — in particular check that every export of
  `movement.ts`, `power.ts` and `shipArt.ts` still has a caller;
- `doc/plan/00000021-accessibility-tech-debt/known-issues.md` carries a note
  if, and only if, a step knowingly accepted an accessibility cost (D14).
  Historical planning documents from earlier stories are **not** edited
  (`CONTRIBUTING.md`).

Depends on: every previous step — this is the check that the change is
complete and consistent.

Verification (automated): Run `npm run typecheck`, `npm run lint`, `npm test`,
`npm run format:check` and `npm run build`; all pass. Confirm the sweep by search, one pattern at a
time: `grep -rn "unlock" src README.md` finds nothing about power;
`grep -rni "drain" src README.md` leaves only node-drain hits;
`grep -rn "of 4" src README.md doc/ruleset/rules.md` and the same for
`"maximum of 4"` and `"full power (4)"` all return nothing. Confirm the two whole-build properties the story names:
`fullGame.test.ts` plays a complete game and `seededReplay.test.ts` replays
the same seed to the same game, both green with their floors re-measured
(D13).
