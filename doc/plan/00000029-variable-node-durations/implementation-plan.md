# Implementation plan — 00000029 Variable node durations

## What this story is

A node stops living for a fixed nine turns. It is given a **capacity** of 60
units and a **drain** that starts at 0 and rises at the end of every turn by an
amount **drawn at random** — slowly while the node stands empty, more than
twice as fast while a ship is standing on it. When drain reaches capacity the
node is spent: it goes dormant, stranding any ship left on it. A dormant site
carries that drain into dormancy and works it back down to zero at a random
rate of its own, going active when it gets there.

Three further mechanics ride along with that:

- **Leaving a node ends it.** A charged node that is occupied goes dormant the
  moment it becomes unoccupied — immediately, as part of resolving the action,
  not at the end of the turn.
- **Taking a node in a fight does not end it.** A beaten defender is replaced
  by the advancing attacker in the same resolution, so the node is never
  unoccupied and keeps its drain. A node changes hands intact.
- **Active sites build pressure.** An active site goes active at 1 and gains 1
  for every turn it stays active, capped at 50. The end-of-turn charge draw is
  weighted by pressure instead of uniform, so a site that has waited a long
  time is likelier to be picked than one that has just cycled.

The visuals follow the mechanic. Charged and dormant keep today's artwork and
today's start-to-end travel, driven by drain against capacity instead of turns
against nine. Active gains travel it has never had, interpolating between the
small pale disc story 27 shelved and today's larger gold disc, so how much
pressure a site has built is readable on the board.

This is a **gameplay change**, so `doc/ruleset/rules.md` goes from version
**0.11** to **0.12**, with a `doc/ruleset/changelog.md` entry and a matching
`RULES_VERSION` bump, in its own commit ahead of the code (step 1). Tagging
stays on hold, per `CLAUDE.md`.

Every number in this story — 60, 50, and all three distributions — is a first
guess to be play-tested and retuned. The job here is to make each of them one
obvious table, in the rules and in the code, not to claim any of them is right.

### Vocabulary reminder for a cold reader (`CLAUDE.md`)

Planning documents and code say **ply**; `rules.md`, the UI and `README.md` say
**turn**. They are the same thing: everything one player does before play
passes, which in this game is one action (`ACTIONS_PER_PLY` is 1). **Site**,
**bay** and **action** are the same word everywhere. **Hub** is the code word
for what player-facing text calls a **node**, and a node is precisely a site
that is charged.

Everything the rules measure "per turn" is measured per **ply** in code: once
for each player's turn, twice a round. A node's 60 units of capacity are
therefore spent over plies, not over rounds.

### The three numbers that carry the story

| Name         | Value | Where it lives              | What it means                                          |
| ------------ | ----- | --------------------------- | ------------------------------------------------------ |
| Capacity     | 60    | `src/rules/sites.ts` (§8.3) | The drain at which a charged node is spent             |
| Pressure cap | 50    | `src/rules/sites.ts` (§8.2) | The most pressure an active site can build             |
| Zero         | 0     | implicit                    | The recovery level at which a dormant site goes active |

And the three distributions, all drawn with the same weighted primitive:

| Distribution     | Outcomes and weights                        | Average |
| ---------------- | ------------------------------------------- | ------- |
| Empty node drain | 1 (20%), 2 (50%), 3 (30%)                   | 2.1     |
| Held node drain  | 3 (10%), 4 (40%), 5 (30%), 6 (20%)          | 4.6     |
| Dormant recovery | 4 (10%), 5 (25%), 6 (30%), 7 (25%), 8 (10%) | 6.0     |

Consequences worth holding on to while reading the rest of this plan: a node
nobody visits lasts about 60 / 2.1 ≈ **28.6** turns; a node held from the turn
it is charged lasts about 60 / 4.6 ≈ **13.0** turns; a dormant site recovering
from a full 60 takes about 60 / 6 = **10** turns. A node ended early — by a
ship stepping off it — is dormant for proportionally less time, because it
carries less drain into dormancy.

## Where the work lands

| File                                                        | What happens to it                                                                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `doc/ruleset/rules.md`                                      | §1, §2, §7, §8.1, §8.2, §8.3, §8.5, §8.6 and Appendix B rewritten; a new §8.7 appended; 0.11 → 0.12 (step 1)                               |
| `doc/ruleset/changelog.md`                                  | New 0.12 entry at the top (step 1)                                                                                                         |
| `src/rules/rulesVersion.ts`                                 | `RULES_VERSION` → `"0.12"` (step 1)                                                                                                        |
| `src/rules/random.ts`                                       | Gains the weighted index draw next to `drawIndex` (step 2)                                                                                 |
| `src/rules/sites.ts`                                        | Capacity, the three distribution tables, the drawing helpers; the two clocks and the stagger deleted (step 3); pressure constants (step 4) |
| `src/rules/gameState.ts`                                    | `SiteStatus` becomes `{ state, level }`; `startingGameState`'s opening (step 3)                                                            |
| `src/rules/endOfTurn.ts`                                    | Steps 3 and 6 become the drain and recovery draws (step 3); step 5 adds pressure (step 4)                                                  |
| `src/rules/chargeDraw.ts`                                   | Charges at level 0 (step 3); the draw becomes pressure-weighted (step 4)                                                                   |
| `src/rules/vacating.ts` (new)                               | §8.7's rule, as one function over a before/after pair (step 5)                                                                             |
| `src/rules/ply.ts`                                          | Both vacating call sites; `assertFightInvariants`' field name and doc (steps 3 and 5)                                                      |
| `src/rules/stranded.ts`                                     | Nothing — its two stranding states are unchanged. Its **test** changes with the field rename (step 3)                                      |
| `src/board/Board.tsx`                                       | The `siteCyclePosition` call loses its ply argument (step 3)                                                                               |
| `src/board/SiteMarker.tsx`                                  | Active gains its start-to-end travel and a hex-lerp helper (step 6)                                                                        |
| `src/board/announcements.ts`                                | The node-vacated clause (step 5)                                                                                                           |
| `src/rules/sitePool.test.ts`                                | Rewritten around 0.12's Appendix B, including the pressure-weighting check (step 7)                                                        |
| `src/rules/seededReplay.test.ts`                            | Re-confirmed against a much longer draw stream (step 7)                                                                                    |
| `src/rules/fullGame.test.ts`                                | Re-confirmed; its assertions are seed-sensitive and the stream has moved (step 7)                                                          |
| `README.md`                                                 | The nine-turn life and the description of holding a node (step 8)                                                                          |
| `doc/plan/00000021-accessibility-tech-debt/known-issues.md` | One new note: pressure is visible only in the artwork (step 6)                                                                             |

Almost every test file under `src/` that builds a `SiteStatus` by hand changes
in step 3, because the field rename is a compile error at each one. They are
listed in that step.

Deliberately **not** touched:

- **The seventeen site positions**, the target of five charged, §8.4's energy
  table, movement ranges, combat mechanics, bays and game length.
- **`src/rules/moveLegality.ts`, `src/rules/combat.ts`, `src/rules/energy.ts`,
  `src/rules/stranded.ts`, `src/board/squareLabel.ts`** — the three site states
  and the rules about which of them a ship may end a move on are unchanged, so
  these modules need no edit (their tests change only where they build a
  `SiteStatus`).
- **`doc/plan/00000023-update-node-visual/node-artwork.md`.** It is story 23's
  record and is read, not edited — see **D14**.
- **Stranding.** A node can still reach capacity underneath a ship and strand
  it, on exactly today's terms. Penalising a ship that fails to vacate is a
  later story.
- **`CLAUDE.md`'s vocabulary.** Hub, site, node, ply and turn all keep their
  meanings.

---

## Design decisions and reasoning

This section is the design record for the story. The code in this repository
does not carry design history (`CONTRIBUTING.md`, "Comments"), so anything a
future reader needs to know about **why** is written here and nowhere else.

### D1 — The rules change lands first, and the code is knowingly behind it for several commits

`CLAUDE.md` and `doc/guidelines/implementation-plan-guide.md` both require it:
`rules.md` is the single source of truth and the code implements it, so the
document is edited, the version bumped and the changelog written before any
behaviour changes.

Between step 1 and step 5 the code is knowingly behind the document, in a
different way at each stage. The windows are deliberate; no step should try to
paper over the one it sits in:

| After step | The board behaves like this                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1          | 0.11 in full: fixed nine-turn nodes, staggered opening, uniform charge draw                                                                                             |
| 2          | Identical to step 1 — the weighted primitive exists but nothing calls it                                                                                                |
| 3          | Capacity, random drain and random recovery, no stagger; the charge draw is still **uniform**; active levels sit at 1 and never move; leaving a node does **not** end it |
| 4          | As above plus pressure and the weighted draw; leaving a node still does not end it                                                                                      |
| 5          | 0.12 in full, with the shelved active artwork not yet restored                                                                                                          |
| 6          | 0.12 in full, including the artwork                                                                                                                                     |

### D2 — No section is renumbered; the vacating rule is appended as §8.7

Story 27 had to renumber §8 and paid for it in citation churn across roughly
twenty source and test files. This story does not repeat that. Every existing
section keeps its number, and the one genuinely new body of rules — the
vacating rule — is appended after §8.6 as a new **§8.7, "Leaving a node ends
it"**.

**Rejected:** folding the vacating rule into §8.3 ("How long a node lives").
It is arguably about how a node's life ends, but §8.3 is already carrying
capacity, drain, two distributions and their consequences, and burying a rule
that decides the outcome of every fight over a node inside it makes the rule
hard to find and hard to cite.

**Rejected:** inserting it as a new §8.4 and pushing the rest down. That is the
right _reading_ order — it belongs next to how a node ends — but it invalidates
every `§8.4`, `§8.5` and `§8.6` citation in the document and in the code, for
a gain in ordering alone.

§8.3, §8.5 and §7 each gain a pointer to §8.7 so a reader arrives at it from
wherever they start.

### D3 — One `level` field, and why it is one field rather than three

`SiteStatus` becomes `{ state, level }` and `enteredOnPly` is deleted. `level`
is a single number whose meaning is the state's:

| State   | `level` is           | Starts at            | Moves at end of turn | Changes state at |
| ------- | -------------------- | -------------------- | -------------------- | ---------------- |
| Active  | pressure             | 1                    | +1, capped at 50     | drawn (§8.2)     |
| Charged | drain                | 0                    | + the drain draw     | ≥ capacity       |
| Dormant | the drain to recover | the drain it carried | − the recovery draw  | ≤ 0              |

The **carry from charged to dormant is a real property of the design, not an
implementation convenience**: a node ended early — by a ship stepping off it at
drain 20, say — is dormant for about a third as long as one that burned all the
way to 60. That carry is precisely what one field expresses and three separate
fields would not.

Deleting `enteredOnPly` removes the subtraction-against-`plyNumber` that
`hasChargedNodeFinished`, `hasDormantSiteFinishedCooling` and
`siteCyclePosition` all perform today, and with it the negative-`enteredOnPly`
special case the staggered opening needed.

The rename is a **required field**, so the compiler flags every construction of
a `SiteStatus` in the codebase. That is the intended way to find them all; do
not add a compatibility alias or an optional field to soften it.

### D4 — The two predicates are deleted, not reworked

`hasChargedNodeFinished(enteredOnPly, plyNumber)` and
`hasDormantSiteFinishedCooling(enteredOnPly, plyNumber)` exist today because
each wraps a subtraction whose sign convention is easy to get wrong. Under 0.12
each collapses to a comparison of one number against one constant — a node is
spent when its drain has reached capacity, and a dormant site has recovered
when its level has reached zero or below. A named predicate around a single
comparison against an exported constant adds a hop without adding meaning, and
the constant it compares against (`NODE_CAPACITY`) is the thing a reader wants
to see at the call site anyway.

Both functions are therefore **deleted**, and `endOfTurn.ts` compares against
the constants directly. `CHARGED_LIFE_PLIES` and `DORMANT_COOLDOWN_PLIES` are
deleted with them; nothing in 0.12 has a fixed-length clock.

The story left this decision to the plan. This is the decision.

### D5 — One weighted-draw primitive in `random.ts`, serving all three uses

`random.ts` gains a second primitive beside `drawIndex`: a **weighted index
draw**, taking a seed and a list of weights and returning the drawn index and
the next seed. Its contract mirrors `drawIndex`'s: it refuses an empty list and
refuses a non-positive total with a `RangeError`, so a caller can never
silently draw from nothing. Individual weights must be finite and non-negative;
a zero weight is legal and is simply never drawn.

That one primitive serves all four weighted draws in the game: the empty-node
drain, the held-node drain, the dormant recovery, and the pressure-weighted
charge draw. Writing one is what lets the three distribution tables be plain
data.

**Rejected:** three bespoke draw functions, one per distribution, each with its
own cumulative-probability ladder written out. They would be three places to
get the same arithmetic wrong, and they would not serve the charge draw, whose
weights are not a fixed table at all.

**Rejected:** rejection sampling or repeated `drawIndex` calls to shape a
distribution. Both consume a variable number of seed steps, which would make a
recorded game's replay depend on values rather than only on the sequence of
draws (**D6**).

`Math.random` is banned by lint in game code (`CLAUDE.md`, `eslint.config.js`),
and none of this is the exception.

### D6 — Draw order is fixed, and a ply now consumes many more seed steps

A recorded game replays because the same draws happen in the same order against
the same seed. The order within the end-of-turn sequence is therefore **fixed
and must stay fixed**:

1. **Drains**, over the charged nodes in `SITES`' declared order, one draw per
   charged node, each advancing the seed before the next.
2. **The charge draw**, as it runs today: one site at a time, without
   replacement, the seed advancing once per site charged, and not at all when
   nothing is charged.
3. **Recoveries**, over the eligible dormant sites in `SITES`' declared order,
   one draw per site, each advancing the seed.

A ply now consumes roughly five drain draws plus two or three recovery draws
plus the occasional charge draw, where 0.11 consumed a charge draw about a
quarter of the time. **That is expected.** Any test that pins a particular
seed's outcomes is regenerated, not worked around.

Only sites that actually draw consume a seed step. A site skipped by step 6's
"dormant before this turn began" filter (**D8**) does not draw and does not
advance the seed.

### D7 — The distribution tables are data, in `sites.ts`, written as the rules' percentages

The three distributions live in `src/rules/sites.ts` as tables of outcome and
weight, with the weights written as the **whole-number percentages the rules
table shows** (20, 50, 30 and so on) so that the code table and the document
table can be read side by side and checked against each other by eye. Integer
weights also keep the primitive's arithmetic exact.

`sites.ts` gains an import of `random.ts` to draw from them — a new dependency
for that module, and the right one: the tables and the numbers they encode are
site rules, and they belong with `SITES` and the capacity rather than in the
sequencing module that happens to consume them.

The tables are exported so tests can assert their averages and their outcome
sets directly against §8.2 and §8.3, which is how the story's "over a long run
each distribution's frequencies match the table" verification is met without a
statistical test of the whole game.

### D8 — Step 6's "dormant before this turn began" needs a snapshot, and `runEndOfTurn` takes one

§8.6's step 6 recovers "every site that was dormant **before this turn
began**". Two kinds of site must be excluded from a turn's recovery:

- A node that went dormant in **step 3 of this same sequence** by reaching
  capacity. Excluding it is what makes the two clocks symmetric: a node charged
  in step 4 of turn N first drains in step 3 of turn N+1, and a node that goes
  dormant in step 3 of turn N first recovers in step 6 of turn N+1.
- A node that went dormant **mid-turn** because its occupant left it (§8.7). It
  was charged when the turn began, so it does not recover at the end of that
  turn either.

The second case is the awkward one: `runEndOfTurn` is handed the state the
action produced, in which a vacated node is _already_ dormant. Nothing in the
state distinguishes it from a site that has been dormant for six turns.

So **`runEndOfTurn` takes a second argument**: the set of square names that
were dormant before the ply began. Step 6 recovers exactly the sites in that
set that are still dormant. Both callers in `ply.ts` can supply it cheaply:
`applyMove` and `applyAttack` each hold the pre-action state, and
`applyPassGuard` holds a state in which nothing has happened at all. Because
`ACTIONS_PER_PLY` is 1 (rules.md §5), the state before the action **is** the
state at the start of the ply; the argument's doc comment must say so, and say
that a future ruleset with more than one action per ply would need a start-of-
ply snapshot carried in `GameState` instead.

The argument is **required**, not optional with a default. An optional argument
defaulting to "whatever is dormant in the state I was handed" would be right
for a pass and silently wrong after a vacating move — exactly the bug this
decision exists to prevent. Making it required forces every call site,
including every test that drives `runEndOfTurn` directly, to state its
intention.

**Rejected:** letting every dormant site recover, including ones that went
dormant this very turn, and dropping "before this turn began" from the rules.
It would shorten dormancy by one tick and break the symmetry the story
explicitly asks §8.6 to state — and, worse, it would let a node **leave**
dormancy on the very turn it entered it. A node vacated at drain 5 would go
dormant carrying 5 and then recover 4 to 8 in the same end-of-turn sequence,
reach zero, and go straight back to active without ever having been visibly
dormant at all. The owner rejected this at the plan gate on exactly that
ground: the required argument is the accepted cost of preventing it.

**Rejected:** keeping a per-site record of the ply it went dormant on. That is
`enteredOnPly` returning under another name, against **D3**.

**Rejected:** applying the vacating rule at the start of the end-of-turn
sequence instead of mid-action. The story requires it to happen immediately, as
part of resolving the action, and the manual verification asks to see the node
go dark before the opponent's turn.

### D9 — Drain carries into dormancy unclamped

A node whose drain lands on 62 goes dormant carrying 62, not 60. Nothing
clamps it: the recovery draw works it down from wherever it is, and the extra
two units cost a third of one turn. Clamping would be an extra rule for no
gain, and the artwork clamps its own input to [0, 1] anyway (**D13**).

### D10 — The staggered opening goes, and the lockstep property goes with it

0.11's opening five carried staggered clocks because five nodes charged on the
same turn would otherwise run out on the same turn, be replaced together, and
leave the board pulsing in lockstep forever — nothing in a fixed-length cycle
would ever break that up.

Under 0.12 nothing can form that lockstep. The five opening nodes drain at
independently drawn rates, are reached by ships at different turns (which more
than doubles their drain rate), and can be ended early by a ship stepping off.
Five nodes starting together at drain 0 spread out within a handful of turns on
their own. The stagger's whole purpose is served by the mechanic, so the table
and the two paragraphs justifying it are deleted, and all five sites start at
**drain 0**.

The consequence for tests, and it is easy to get wrong: **0.11's "at most one
node runs out in any single turn" property is withdrawn.** It was a consequence
of the stagger, and under randomised drains two nodes coinciding is ordinary —
the crossing turns of five empty nodes are spread with a standard deviation of
roughly four turns, so collisions happen. `sitePool.test.ts` currently asserts
that property and must stop; **D16** says what replaces it. Asserting it under
0.12 would produce a test that passes on the seeds it was written against and
fails later for no reason.

What the story does ask to be checked is weaker and true: the opening five do
not **all** run out on the same turn.

### D11 — Vacating is one function over a before/after pair, applied after the action resolves

§8.7 is implemented as a single function in a new module `src/rules/vacating.ts`,
taking the state an action started from and the state it produced, and
returning the state with every vacated node sent dormant plus one effect per
node. Its rule is exactly the rules' words: **any site that is charged, was
occupied before the action, and is unoccupied after it, goes dormant carrying
its drain.** It knows nothing about which kind of action ran.

Written that way it covers every case in the story without a branch for any of
them:

| Case                                             | Before   | After               | Result                      |
| ------------------------------------------------ | -------- | ------------------- | --------------------------- |
| A ship moves off a node                          | occupied | empty               | dormant                     |
| A ship moves onto a node                         | empty    | occupied            | unchanged (not a departure) |
| A beaten defender is replaced by the attacker    | occupied | occupied (attacker) | **unchanged, drain intact** |
| A drawn fight on a node (both ships go to bays)  | occupied | empty               | dormant                     |
| A won fight whose advance is blocked by a bay    | occupied | empty               | dormant                     |
| An attacker wins from a node and advances off it | occupied | empty               | dormant (the origin square) |
| A losing attacker is pushed off its own node     | occupied | empty               | dormant (the origin square) |

Both call sites are in `ply.ts`: in `applyMove` after the ship has been placed,
and in `applyAttack` after the fight has fully resolved — in both cases
**before** `applyEndOfActionTail` runs, so the end-of-turn sequence sees the
node already dormant and it neither pays energy nor drains that turn.

`assertFightInvariants` keeps its **strict** check that a fight changes no site
at all, because vacating is applied _after_ the invariants are asserted, as a
separate consequence of the action rather than part of the fight's resolution.
That ordering is chosen deliberately: it keeps a strong, cheap bug detector on
`applyAttack`'s hardest code path instead of weakening it to "one or two sites
may have changed, in one particular way". Its doc comment and its error message
must say that vacating happens afterwards, so a reader does not conclude the
invariant contradicts §8.7. The only edit inside it is the field name
`enteredOnPly` → `level`.

One consequence to be aware of and not to be surprised by: a player who moves a
ship off a node during their own turn loses that node's energy for that turn,
because §8.6 step 2 collects for the charged nodes their ships are standing on
and the node is already dormant. That is not a new rule — it falls out of the
ordering the document already states — and it is part of what "holding a node
and then leaving is a choice to spend it" means. The owner confirmed it at the
plan gate: energy is settled at the end of the turn, so a player collects for a
node they stepped **onto** that turn and not for one they stepped **off**.

### D12 — The vacated-node effect speaks, and where its sentence goes

`node-ran-out` (a node reaching capacity) and the new vacated-node effect are
**different facts and a player is owed different words for them.** The new
effect is declared in `vacating.ts`, carries the square and the ship that left
it (id and side, read from the _before_ state's occupant), and is a member of
both `MoveEffect` and `AttackEffect`.

Judged on story 27's terms — is this a board event a player did not cause, or a
consequence of their own action? — it **speaks**. Unlike the silent
`site-went-active`, this is a direct, immediate result of the moving player's
own choice, and it is the mechanic the story is built around: a player who does
not hear it will not learn that stepping off a node ends it.

Recommended wording: `The node at ${square} went dormant when the ${side} ship
left it.` — one sentence, in the players' vocabulary ("node", "turn"), naming
the square first because that is the thing on the board that changed.

Placement: the clause belongs **after the action's own sentence and before the
end-of-turn clauses**, in all four assembly paths in `announcements.ts`
(`announcementFor` and `announcementForSession`, each for `moved` and
`attacked`). The cheapest correct way to get that is to prepend the vacated
clauses inside `actionEndingClauses`, which every one of those four paths
already calls with the action's effects; its doc comment then has to say it
carries the action's own site consequences as well as how the ply ended. A
separate helper called at all four sites is equally acceptable — the
requirement is the position, not the mechanism.

A fight can produce **two** of these effects (a drawn fight in which both ships
stood on nodes), so the wording must read acceptably twice in a row.

### D13 — `siteCyclePosition` reports a position for all three states

Today `siteCyclePosition(state, enteredOnPly, plyNumber)` returns `undefined`
for active, because active had no clock. Under 0.12 it takes the state and the
level and returns a number for every state:

- charged — `level / capacity`
- dormant — `1 − level / capacity`
- active — `(level − 1) / (pressureCap − 1)`

all clamped to [0, 1].

Reading the dormant end against **capacity** rather than against the drain the
site happened to carry is deliberate: a node ended early begins its dormancy
already part-recovered, and its artwork should say so, because that is exactly
what is true of it. A node ended at drain 20 opens its dormancy two-thirds of
the way along the grey artwork's travel and reaches the far end in about three
turns.

Giving active a position too is what keeps the plumbing unchanged:
`Board.tsx` → `BoardSquare.tsx` → `SiteMarker.tsx` already passes one optional
`cyclePosition` number, and step 6's active travel needs nothing more than
that. **Rejected:** passing the raw `level` down to `SiteMarker` and letting it
decide — that would put rule constants (the pressure cap, the capacity) into a
presentation component, which is exactly what `siteCyclePosition` exists to
prevent.

The function keeps its name. Every state now has a cycle position; the name is
still accurate.

### D14 — The active artwork's two ends, and the hex lerp

Active interpolates between two artworks that already exist in
`doc/plan/00000023-update-node-visual/node-artwork.md` and differ in exactly
three respects:

|                    | that document's **"Dormant"** section | that document's **"Active"** section |
| ------------------ | ------------------------------------- | ------------------------------------ |
| circle radius      | 12                                    | 24                                   |
| inner stop colour  | `#F1DBA5`                             | `#DAA520`                            |
| outer stop opacity | 0.75                                  | 0.5                                  |

Both are radius-`60%` radial gradients centred on the square with a `#DAA520`
outer stop and an inner stop at full opacity, so the travel is three
interpolations over one shape, at the cycle position **D13** supplies. Pressure
1 is the small pale dot; the cap is the gold disc the board shows today.

That reference document's headings are **pre-0.11** and do not mean what the
same words mean in the code: its "Dormant" section is the shelved small pale
disc, and what 0.12 calls dormant is its "Depleted" section. `SiteMarker.tsx`
already notes this for the other two states, and the new active arm must note
it the same way. **The document itself is not edited** — it is story 23's
record.

This is the same treatment charged and dormant already get: a calculation from
state, one appearance per turn. It is **not an animation**. Nothing transitions,
eases, or moves on its own, and no CSS transition is added.

Interpolating a colour is new — today's travel moves a single number — so
`SiteMarker.tsx` needs a small hex-lerp helper: two six-digit hex colours and a
position in, one six-digit hex colour out, unit-tested like the rest of the
module's arithmetic. Keep it private to the module; it is presentation, not a
rule, and nothing else needs it.

### D15 — The charge draw's weights are the active sites' levels, recomputed after each removal

§8.2's draw stops being uniform: each active site's chance is its pressure as a
share of the total pressure of all active sites. In `chargeDraw.ts` that is the
existing pool — every `active` site, walked in `SITES` order — with each site's
`level` as its weight, drawn with **D5**'s primitive.

When several sites are charged in one turn the draw still runs **one at a time
without replacement**: the drawn site leaves the pool, the remaining weights
are therefore the remaining sites' pressures, and the seed advances before the
next draw. This is unchanged in shape from 0.11; only the weight vector is new.

Pressure is never less than 1, so no active site can be excluded outright, and
the total is always positive whenever the pool is non-empty — the primitive's
`RangeError` on a non-positive total is a bug detector here, not a case to
handle. The existing empty-pool check stays exactly as it is: running short is
a legal outcome.

A newly charged site's `level` becomes **0** (drain), discarding its pressure.
Pressure is an active site's number and means nothing once the site is charged;
when the site eventually goes active again it starts from 1, exactly as §8.2
says.

### D16 — What `sitePool.test.ts` asserts under 0.12

Appendix B's premise changes, and the file that guards it changes with it. The
four properties it should assert, driving the end-of-turn sequence from the
opening position with no ship ever moving:

1. **The board holds at five charged** once it is running. Nothing a player
   does can make it fall short in ordinary play.
2. **The active pool stays comfortably populated** — Appendix B's arithmetic
   predicts nine or ten of the seventeen — asserted as a floor well above one,
   which is what keeps the draw genuinely random rather than nearly forced.
3. **Expiries stay spread rather than arriving together.** This replaces
   0.11's "at most one node runs out per turn", which **D10** withdraws. The
   honest form is a bound on how often several coincide: over a long run, the
   proportion of turns in which two or more nodes run out stays small, and no
   turn ever runs out anything close to all five. The implementer should
   measure the actual figures over several seeds and then set bounds with
   generous margin — a test that pins the measured value exactly is a test that
   will fail on an unrelated change.
4. **The pressure weighting does its job**, which is new. The property worth
   asserting is that a site's wait between cycles is **bounded** far better
   than an unweighted draw would bound it: over a long run every one of the
   seventeen sites is charged several times, and the longest gap any site waits
   between charges stays under a generous ceiling. Under a uniform draw that
   tail is unbounded; under pressure it is not, because a site's weight grows
   every turn it waits.

Appendix B's own conclusion changes to match: with a mixed life of roughly
twenty turns the board charges a site about every four turns, dormancy runs
about ten turns so two or three sites are dormant at any moment, and nine or
ten of the seventeen are active. The number now worth checking when these
values are retuned is the **pressure cap against the average wait**: a site
waits something like forty turns between cycles against a cap of fifty, so most
of the pool sits below the cap and pressure discriminates across the whole of
it. A cap far below the average wait would flatten the weighting back towards
uniform, and that is what the appendix should tell whoever retunes it.

### D17 — Accessibility

Per the "Accessibility during pre-release" section of `CLAUDE.md`: **no step and
no test in this plan is about accessibility.** Existing automated tests that
happen to assert an accessible name are updated where the path is
straightforward; here that is trivial, since no state name changes.

One consequence is recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` (step 6): an active
site's **pressure** is visible only in its artwork — its size and warmth — and
the square's accessible name still says "active site" and nothing more. That is
a new piece of board state that does not reach assistive technology, alongside
the cycle position that already does not. It goes in as one entry under a new
"From story 29" heading, in the ledger's established style, and nothing else in
that document is edited.

### D18 — Balance is explicitly out of scope

60, 50 and all three distributions are first guesses. This story's job is to
make each of them one obvious table — one in `rules.md`, one in `sites.ts` —
so a future story can retune them by editing two places. No step in this plan
may quietly "improve" a number, and no test may encode a number twice.

---

## Step 1 — Rules 0.12: capacity, drain, pressure, and leaving a node

Status: committed

Notes: Rewrote §1, §2, §7, §8.1–§8.6, added §8.7, and redid Appendix B in
`doc/ruleset/rules.md`; added the 0.12 changelog entry above 0.11; bumped
`RULES_VERSION` to `"0.12"`. Section numbers run 8.1–8.7 with no gap, no
sentence claims a fixed nine-turn life or cooldown, the word "stagger" does
not appear anywhere (one draft sentence used "staggering" to explain why it
is no longer needed, per the plan's own step-1 wording, but was reworded to
avoid the substring entirely since the verification instruction reads as a
literal check), and the three distribution tables in §8.2/§8.3 each sum to
100%. No `src/` file other than `rulesVersion.ts` was touched, matching
D1/D2's no-renumbering, rules-first constraint. `npm test` (670/670, same
count as before), `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass.

Edit `doc/ruleset/rules.md`, add a `doc/ruleset/changelog.md` entry and bump
`RULES_VERSION` in `src/rules/rulesVersion.ts`. **No behaviour changes in this
step** — no other file under `src/` is touched. See **D1** for why this is its
own commit and how far behind the document the code then runs.

Read the whole of `rules.md` before editing: this story touches seven of its
sections, adds one, and rewrites an appendix, and several of them
cross-reference each other.

**No section is renumbered** (**D2**). The one new body of rules is appended as
§8.7.

### The version line

`**Rules version: 0.11**` becomes `**Rules version: 0.12**`.

### §1 Overview

The two random elements become **three**: which site is charged next, which bay
a beaten ship is pushed back to, and **how fast a node burns**.

### §2 Words used in these rules

Gains the three words the rest of the document now uses, in players' terms:

- **Capacity** — how much a node has to give before it is spent. Every node
  starts with the same 60.
- **Drain** — how much of a node's capacity has been spent. It rises every
  turn, faster while a ship is standing on the node.
- **Pressure** — how long a site has been waiting to be charged. The longer it
  waits, the likelier the board is to pick it.

Keep the existing **Turn**, **Round**, **Action**, **Site** and **Node**
entries as they are.

### §7 Combat

Two additions; §7's mechanics are otherwise untouched.

- The **node changes hands intact**: a beaten defender standing on a node is
  replaced by the advancing attacker as part of resolving the fight, so the
  node is never unoccupied and keeps its drain. Say this where the advance is
  described, because it is the case the vacating rule is shaped around.
- A pointer to §8.7 for the two cases that do leave a node empty: a **drawn
  fight** over a node (both ships go to bays) and an **advance blocked** by the
  beaten ship's own return bay landing on the lane.

### §8.1 The three states of a site

The three states, the cycle and the board's aim of five charged are all
unchanged. Two changes:

- The opening position becomes **five sites charged — H8, E5, K5, E11 and K11 —
  all at drain 0**, the other twelve active, nothing dormant.
- **Delete the staggered-opening table and both paragraphs justifying it.**
  Replace them with a short paragraph explaining why no stagger is needed any
  more (**D10**): the five drain at independently drawn rates, are reached by
  ships at different turns, and can be ended early, so the spread the stagger
  created artificially now arrives on its own within a few turns.

### §8.2 Charging a site

Keeps its shape — as many active sites as it takes to bring the charged count
back to five, drawn one at a time, the board simply running short when there
are not enough, and the "genuinely random, and neither player can see it
coming" assurance — and gains two things:

- **Pressure.** An active site goes active at **1** and gains **1** at the end
  of every turn it is still active, to a maximum of **50**. The draw is no
  longer uniform: each active site's chance of being drawn is its pressure as a
  share of the total pressure of all active sites. A site that has waited a
  long time is likelier than one that has just cycled, and because pressure is
  never less than 1, no site can ever be excluded outright.
- **Recovery replaces the fixed cooldown.** A dormant site goes dormant
  carrying whatever drain it had, and at the end of every turn subtracts an
  amount drawn at random:

  | Recovery | 4   | 5   | 6   | 7   | 8   | Average |
  | -------- | --- | --- | --- | --- | --- | ------- |
  | Dormant  | 10% | 25% | 30% | 25% | 10% | 6       |

  At zero or below it goes active, at 1 pressure. From a full 60 that is about
  ten turns, close to 0.11's fixed nine; a node ended early comes back sooner,
  in proportion to how much of it was left.

### §8.3 How long a node lives

Rewritten around capacity and drain. A charged node has a **capacity of 60**
and a **drain** that starts at 0 and rises at the end of every turn by an
amount drawn at random. Which distribution it draws from depends on whether a
ship is standing on it at that moment — **either player's ship; it makes no
difference whose**:

| Node  | 1   | 2   | 3   | 4   | 5   | 6   | Average |
| ----- | --- | --- | --- | --- | --- | --- | ------- |
| Empty | 20% | 50% | 30% | —   | —   | —   | 2.1     |
| Held  | —   | —   | 10% | 40% | 30% | 20% | 4.6     |

When drain reaches or passes capacity the node is spent: it goes dormant at the
end of that turn, stranding any ship left on it exactly as the nine-turn clock
did (§8.5). State the plain consequences: an empty node lasts about 28 turns, a
held one about 13, and **holding a node is what uses it up**. Keep the fact
that a node runs down whether or not any ship is standing on it — it just runs
down more than twice as fast when one is. Point to §8.7 for the other way a
node ends.

### §8.5 Active and dormant sites

Keeps its shape: a ship may not end a move on either state, may fly over both,
and a ship left standing on a node that ran out under it is stranded on the
same terms, including the waiver when it has no legal move. Three sentences
need the new clock:

- "A ship still standing there **nine turns later, when the site finishes
  cooling down**" becomes the variable recovery — about ten turns from a full
  node, sooner from one that was ended early (§8.2).
- The note that the only way onto a dormant site is to hold a node until it
  runs out underneath you **stays true and stays**: leaving a node ends it, but
  the ship that left is by definition no longer on it.
- The closing paragraph says "**Nodes charged on the same turn run out on the
  same turn**, so a player holding several of them owes an action for each ship
  left standing on the site it ran out under." That is **no longer true** under
  0.12 — two nodes charged together drain at independently drawn rates. Rewrite
  it: the tail cost of holding a node is still an owed action per stranded
  ship, but the ships come due at different turns, and a player who holds
  several nodes pays for them one at a time.

Add a pointer to §8.7.

### §8.6 End-of-turn order — six steps

1. Each of the moving player's ships standing on a charged node gains a shield.
2. The moving player collects energy (§8.4).
3. Every charged node adds its drain; any that reaches capacity goes dormant,
   stranding any ship on it (§8.3).
4. As many active sites as it takes to bring the board back to five charged are
   charged, drawn by pressure (§8.2).
5. Every site still active gains a point of pressure, to the cap of 50 (§8.2).
6. Every site that was dormant **before this turn began** subtracts its
   recovery; any that reaches zero or below goes active, at 1 pressure (§8.2).

Keep the paragraph about a passed turn still running the sequence in full.

Both ordering arguments the section already makes survive and both must be
restated for the new steps:

- **Step 6 is last**, for the reason 0.11 gives: a site that finishes recovering
  at the end of turn N goes active only after that turn's draw, so it is active
  for the whole of turn N+1 and is first eligible in turn N+1's draw, at 1
  pressure.
- **Step 5 sits after the draw**, for the matching reason: a site is drawn at
  the pressure it has held all turn, so its first appearance in a draw is at
  weight 1.

And state the symmetry the two clocks now have about the turn a state is
entered: a node charged in step 4 of turn N first drains in step 3 of turn N+1,
and a node that goes dormant in step 3 of turn N first recovers in step 6 of
turn N+1 — which is what step 6's "dormant before this turn began" is for.

### §8.7 Leaving a node ends it (new)

Appended after §8.6 (**D2**). State the rule once, in the terms that settle
every case: **a charged node that is occupied goes dormant the moment it
becomes unoccupied.** It happens immediately, as part of resolving the action,
not at the end of the turn, and the node carries its drain into dormancy.

Then spell out the consequences, because they are the interesting part:

- A ship that **moves off** a node ends it. Holding a node and then leaving is
  a choice to spend it.
- A ship **pushed off** a node after losing a fight it started ends it too.
- A **drawn fight** over a node ends it: both ships go to bays, so the node is
  left empty.
- A **defender beaten on a node does not end it.** The attacker advances onto
  the square as part of resolving the fight, so the node is never unoccupied
  and it stays charged with its drain untouched. This is the case the rule is
  shaped around: a node changes hands intact.
- If the attacker's **advance is blocked** — §7's case where the beaten ship's
  own return bay lands on the lane — the node **is** left empty, and it goes
  dormant like any other.

### Appendix B — Sizing the site pool

Redone from the new figures (**D16**): with a mixed life of roughly twenty
turns, the board charges a site about every four turns; dormancy runs about ten
turns, so roughly two or three sites are dormant at any moment, and about nine
or ten of the seventeen are active. The pool is comfortable.

The conclusion that matters is different from 0.11's. What is now worth
checking when these numbers are retuned is the **pressure cap against the
average wait**: a site waits something like forty turns between cycles against
a cap of fifty, so most of the pool sits below the cap and pressure
discriminates across the whole of it. A cap far below the average wait would
flatten the weighting back to uniform. Say that plainly, to whoever retunes
these numbers.

Close by asking for the guard the app actually carries: a test that the active
pool stays comfortably populated over a long run, that expiries stay spread,
and that no site waits unboundedly long between cycles.

### Appendix A — Open items

Leave as it is unless the rewrite leaves something genuinely open.

### `changelog.md`

Add a `## 0.12 — variable node durations` entry **above** the 0.11 entry, in
the house style already there (bolded lead sentences, one bullet per change, a
closing paragraph on tagging). It should record: capacity and drain replacing
the fixed nine-turn life, with both distributions; the faster burn while a node
is held; recovery replacing the fixed nine-turn cooldown, and a node ended
early coming back sooner; pressure and the weighted charge draw; the staggered
opening deleted and all five opening nodes starting at drain 0; the new §8.7
and the node-changes-hands case in §7; §8.6 going from five steps to six, with
both ordering arguments restated; §8.5's "nodes charged together run out
together" sentence withdrawn; §1's third random element; §2's three new words;
and Appendix B redone around the pressure cap. Close by noting that this
changes how the game is played and would ordinarily be a tagging candidate, but
tagging is on hold until the game plays — matching the wording the 0.11 entry
uses.

### `rulesVersion.ts`

Set `RULES_VERSION` to `"0.12"`. It is a string precisely so this cannot
collapse to `0.12` → `0.1`.

Depends on: nothing.

Verification (automated): `npm test` passes with the test count unchanged (670
before this story), in particular `src/rules/rulesVersion.test.ts`, which reads
the version out of `rules.md`, compares it to `RULES_VERSION`, and requires a
`## 0.12 ` heading in `changelog.md`. Also run `npm run typecheck`,
`npm run lint` and `npm run format:check`. Nothing else changes, so nothing
else may fail.

Additionally, re-read the finished §8 end to end and confirm four things by
eye, since no test can: the section numbers run 8.1 to 8.7 with no gap; no
sentence anywhere in the document still says a node lasts nine turns or cools
for nine turns; the word "stagger" appears nowhere; and the three distribution
tables in §8.2 and §8.3 each sum to 100%.

---

## Step 2 — A weighted index draw in `random.ts`

Status: committed

Notes: Added `drawWeightedIndex` to `src/rules/random.ts` beside `drawIndex`,
built on `mulberry32`, advancing the seed exactly once and throwing
`RangeError` for an empty list, a negative or non-finite weight, or a
non-positive total; a zero weight is legal and simply never drawn, and
floating-point overshoot at the top of the range falls back to the last
in-range index. Added the ten tests `src/rules/random.test.ts` (determinism,
seed-advance parity with `mulberry32`, proportional draws, a single weight,
a zero weight, four refusal cases, and an in-range sweep). Nothing else
calls the new function, matching the step's scaffolding intent. `npm test`
(680/680, up from 670), `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass.

Add the weighted index draw described in **D5** to `src/rules/random.ts`, beside
`drawIndex`. **Nothing calls it yet** — this step is scaffolding, deliberately
separated from the behaviour that uses it, and the board plays exactly as it
did after step 1.

What it does: takes a seed and a list of weights, advances the seed one step
with `mulberry32`, and returns the index the drawn value lands in when the
weights are laid end to end, together with the next seed. It must:

- Advance the seed **exactly once**, like `drawIndex`, so a caller's seed
  consumption is predictable and a recorded game replays (**D6**).
- Throw a `RangeError` for an empty list, for a negative or non-finite weight,
  and for a total that is not positive — the same stance `drawIndex` takes on a
  non-positive count, so a caller can never silently draw from nothing.
- Never return an out-of-range index. Floating-point accumulation near the top
  of the range must not be able to fall off the end of the list; the last
  in-range index is the answer when it does.
- Allow a zero weight, which is simply never drawn.

Write the module comment to say what the primitive is for in one line — the
game's three site distributions and the pressure-weighted charge draw — without
depending on any of them.

Tests in `src/rules/random.test.ts`:

1. **Determinism.** The same seed and weights give the same index and the same
   next seed, every time.
2. **The seed advances once**, and to the same value `mulberry32` alone would
   give for that seed — the two primitives consume the stream identically.
3. **Proportions.** Over many thousands of consecutive draws from a fixed
   weight list, each index's frequency is close to its share of the total.
   Chain the seed through the draws rather than re-seeding.
4. **A single weight** always returns index 0.
5. **A zero weight is never drawn**, and its neighbours split the rest in
   proportion.
6. **Refusals.** An empty list, a negative weight, a non-finite weight and an
   all-zero list each throw a `RangeError`.
7. **Boundaries.** Whatever the drawn value, the returned index is always in
   range for the list — exercise this across a large sweep of seeds with a
   lopsided weight list.

Depends on: Step 1 (the document already describes draws that need it).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass, with checks 1–7 green. The test count rises;
nothing else in the suite changes, because nothing else calls the new function.

---

## Step 3 — Capacity, drain and recovery: one `level` per site

Status: committed

Notes: `sites.ts` gained `NODE_CAPACITY` (60), `PRESSURE_CAP` (50, unused
until step 4 per the plan), the three `WeightedAmount` tables, and
`drawTableAmount`; `CHARGED_LIFE_PLIES`, `DORMANT_COOLDOWN_PLIES`,
`hasChargedNodeFinished`, `hasDormantSiteFinishedCooling` and the staggered
opening were deleted per D4/D10. `SiteStatus` is now `{ state, level }`
(`gameState.ts`), and `gameState.ts` gained `dormantSiteNames` as the shared
helper D8 calls for. `endOfTurn.ts`'s `runEndOfTurn` takes the required
`dormantBeforePly` second argument exactly as D8 specifies, with step 3
drawing drain (held vs. empty table by momentary occupancy) and step 6
drawing recovery only for that set; step 5 is a one-line placeholder comment
naming pressure, not yet implemented. `chargeDraw.ts` charges at `level: 0`.
`ply.ts` threads `dormantSiteNames(state)` (the pre-action state) through
`applyEndOfActionTail` from both `applyMove` and `applyAttack`;
`applyPassGuard` builds its own set from its own state; `assertFightInvariants`
compares `level` in place of `enteredOnPly`. `Board.tsx`'s `siteCyclePosition`
call now passes the status's `level` and no ply number. Deviations from the
plan: (1) the step 3 test-list's item 10 says cycle position should report
"1 for a dormant site at a level of capacity and 0 at level 0" — this is the
reverse of D13's own formula (`1 − level / capacity`) and of D13's own worked
example (a node ended at drain 20 is two-thirds _through_ its dormant
travel, not one-third), and would also contradict the untouched
`SiteMarker`/`Board.test.tsx` wiring inherited from 0.11 (dormant starts its
travel at full drain, ends at zero). Implemented and tested to D13's formula
instead, treating the checklist line as a slip. (2) `sitePool.test.ts` needed
more than removing the lockstep assertion to go green — 0.12's steady-state
mix (~2-3 dormant, ~9-10 active) is far enough from 0.11's (~5, ~7) that the
old numeric bounds fail outright — so its one remaining bounds test was
retargeted to the new mix with a comment pointing at step 7's full rewrite,
which is still where the pressure-weighting property belongs. (3) Several
`ply.test.ts` fight/move integration tests built fixtures with a
canonical-site square left at the shorthand default `level: 0` for a
`dormant` or `charged` state, or asserted a real site's status by strict
equality after a full `applyMove`/`applyAttack` call; under 0.12 a real
site's drain or recovery always moves every end-of-turn sequence (unlike
0.11's fixed clock, which was inert unless it happened to finish), so these
were re-fixtured — mostly onto column-G squares, which this codebase's own
existing tests already use as a "not one of the seventeen sites" idiom, with
the rest changed to assert the site's `state` rather than its exact `level`.
One test's expected stranded-ship shield count was also corrected from 3 to
4, since step 1's shield grant now visibly lifts it before step 3 stands the
node down. `npm test` (685/685, up from 680), `npm run typecheck`,
`npm run lint` and `npm run format:check` all pass; grepping `src/` for
`enteredOnPly`, `CHARGED_LIFE_PLIES`, `DORMANT_COOLDOWN_PLIES`,
`hasChargedNodeFinished`, `hasDormantSiteFinishedCooling` and
`STAGGERED_OPENING` finds nothing.

Replace the two fixed nine-ply clocks with capacity, a randomly drawn drain and
a randomly drawn recovery, and collapse `SiteStatus` onto one number. **The
charge draw stays uniform in this step and pressure does not exist yet**
(step 4), and **leaving a node still does not end it** (step 5). Those windows
are expected (**D1**) and no part of this step should compensate for them.

This is the largest step in the plan, for the reason story 27's equivalent was:
renaming a required field of `SiteStatus` is a single compile event, and every
consumer must be dealt with before the build is green again. What defends it is
explicitness — read **D3**, **D4** and **D8** before starting.

### `src/rules/sites.ts`

- Add `NODE_CAPACITY` (60), with a comment citing §8.3 and saying it is a first
  guess to be play-tested (**D18**).
- Add the three distribution tables of **D7** — empty-node drain, held-node
  drain and dormant recovery — as exported tables of outcome and whole-number
  percentage weight, transcribed from §8.2's and §8.3's tables so the two can be
  compared by eye.
- Add a way to draw an amount from one of those tables given a seed, returning
  the amount and the next seed, built on step 2's weighted primitive. One
  helper taking a table is enough; three named wrappers are also fine. This is
  where `sites.ts` gains its dependency on `random.ts`.
- **Delete** `CHARGED_LIFE_PLIES`, `DORMANT_COOLDOWN_PLIES`,
  `hasChargedNodeFinished` and `hasDormantSiteFinishedCooling` (**D4**).
- **Delete** `STAGGERED_OPENING_CHARGED_SITES` and the derived by-name map
  (**D10**).
- `startingSiteStatus` returns `{ state, level }`: the five opening sites
  charged at level **0**, every other site active at level **1**. Keep the five
  squares — H8, E5, K5, E11, K11 — and keep the function's structural return
  type rather than naming `SiteStatus`, which lives in `gameState.ts` and would
  create an import cycle.
- `siteCyclePosition` takes the state and the level and returns a number for
  all three states, per **D13**. The active branch's denominator needs the
  pressure cap, which does not exist until step 4 — until then the active
  branch may divide by the same constant it will use later only if that
  constant exists, so **add the pressure cap constant here in step 3** (value
  50, cited to §8.2) even though nothing else reads it until step 4, and note
  in step 4's work that it is already present. Active levels are all 1 in this
  step, so the active branch returns 0 throughout, which is correct and
  invisible.
- Rewrite the module header comment: the two nine-ply clocks are gone, replaced
  by a capacity, three distributions and one number per site.

### `src/rules/gameState.ts`

- `SiteStatus` becomes `{ state, level }`. Its doc comment must carry **D3**'s
  table — what `level` means in each state, what it starts at, how it moves and
  what changes the state — because that table is the only thing standing
  between a reader and a misreading of a bare number.
- `startingGameState` writes what `startingSiteStatus` gives it, as it does
  today; its doc comment's description of the opening changes to five charged at
  drain 0 and twelve active at pressure 1.

### `src/rules/endOfTurn.ts`

The sequence becomes six steps, of which this step implements 1, 2, 3, 4 and 6;
step 5 (pressure) arrives in the next plan step and gets a one-line placeholder
comment naming it.

- **Step 3 — drain.** Walk `SITES` in declared order. For each site that is
  charged, decide whether a ship of either side is standing on it _at that
  moment_, draw from the held table or the empty table accordingly, add the
  amount to the site's level, and advance the seed. If the new level is at or
  above `NODE_CAPACITY`, the site goes dormant carrying that level unclamped
  (**D9**), raising the existing `node-ran-out` effect and stranding any ship on
  it with the existing `ship-stranded` effect. Both effect names and payloads
  are unchanged.
- **Step 4 — the charge draw.** Unchanged in this step except that a newly
  charged site's level is **0** rather than a ply number.
- **Step 6 — recovery.** Walk `SITES` in declared order. For each site that is
  dormant **and was dormant before the ply began** (**D8**), draw from the
  recovery table, subtract it from the level, and advance the seed. If the new
  level is at or below zero the site goes active at level 1, raising the
  existing `site-went-active` effect. Sites excluded by the "before this turn
  began" filter draw nothing and advance no seed.
- **The signature gains its second argument** (**D8**): the set of square names
  that were dormant before the ply began. Document it exactly as **D8** words
  it, including why `ACTIONS_PER_PLY` being 1 makes the pre-action state the
  start-of-ply state, and what a future multi-action ply would need instead.
- Update the module header comment: the ordering argument for step 6 being last
  survives verbatim, and the new symmetry argument from §8.6 is added.

### `src/rules/chargeDraw.ts`

Only one change in this step: a charged site's new level is 0. The pool, the
shortfall arithmetic, the without-replacement draw and the empty-pool tolerance
are all untouched; the weighting arrives in step 4.

### `src/rules/ply.ts`

- Both `runEndOfTurn` call sites (`applyEndOfActionTail`, reached from
  `applyMove` and `applyAttack`, and `applyPassGuard`) pass the new argument.
  `applyEndOfActionTail` will need it threaded in from its callers, which hold
  the pre-action state; `applyPassGuard` builds it from its own state.
- `assertFightInvariants` compares `level` instead of `enteredOnPly`. Nothing
  else about it changes in this step.

### `src/board/Board.tsx`

The `siteCyclePosition` call drops its ply-number argument and passes the
status's level. Nothing else in the board changes: `BoardSquare` and
`SiteMarker` still receive one optional cycle position, and charged and dormant
artwork is untouched.

### Tests

Every test that builds a `SiteStatus` by hand fails to compile until its
`enteredOnPly` becomes a `level` with a meaning appropriate to the state.
**Re-decide each one from D3's table; do not rename the field in place and
leave the number alone** — a charged site written as `enteredOnPly: 10` almost
certainly wants `level: 0` or some deliberate mid-life drain, not `level: 10`.

The files that build one, from a repository-wide search for `enteredOnPly`:
`src/rules/sites.test.ts`, `src/rules/gameState.test.ts`,
`src/rules/endOfTurn.test.ts`, `src/rules/chargeDraw.test.ts`,
`src/rules/ply.test.ts`, `src/rules/stranded.test.ts`,
`src/rules/movement.test.ts`, `src/rules/combat.test.ts`,
`src/rules/energy.test.ts`, `src/rules/actions.test.ts`,
`src/rules/sitePool.test.ts`, `src/board/Board.test.tsx`,
`src/board/announcements.test.ts`, `src/game/session.test.ts`,
`src/hud/ScoreDisplay.test.tsx`, `src/hud/GameOverPanel.test.tsx`. Every test
that calls `runEndOfTurn` directly also needs the new second argument.

`src/rules/sitePool.test.ts` will need at least its lockstep assertion removed
to pass at all (**D10**); it is rewritten properly in step 7, and doing the
minimum here to keep the suite green is expected — say so in a comment naming
step 7.

New tests this step must add:

1. **The distributions.** Each table's outcomes are exactly the values §8.2 and
   §8.3 list, its weights sum to 100, and its weighted average is 2.1, 4.6 and
   6.0 respectively. Drawing many times from each table produces only the
   listed outcomes and frequencies close to the listed weights.
2. **An empty node's drain.** Driving the end-of-turn sequence with no ship
   anywhere near a charged node, the node's level rises by 1, 2 or 3 each ply
   and never by anything else.
3. **A held node's drain.** With a ship of either side standing on it, the
   level rises by 3, 4, 5 or 6 each ply and never by anything else — and the
   same is true whichever side the ship belongs to.
4. **Lifetimes.** A node held from the ply it is charged runs out after about
   13 plies, and one never visited after about 28. Assert as ranges wide enough
   to be stable across seeds, over an average of several runs rather than a
   single one.
5. **Stranding still works.** A node that reaches capacity underneath a ship
   goes dormant and strands it, exactly as the nine-turn clock did.
6. **Recovery.** A site that goes dormant carrying a full 60 takes about ten
   plies to go active; one ended at drain 30 takes about half as many. Assert
   the halving as a relationship, not as two exact numbers.
7. **Recovery is not run on the turn a node went dormant.** A node that reaches
   capacity in step 3 of ply N does not lose any level to step 6 in that same
   sequence; it first recovers at the end of ply N+1.
8. **The opening board.** `startingGameState` gives H8, E5, K5, E11 and K11 as
   charged at level 0, the other twelve as active at level 1, and nothing
   dormant.
9. **No lockstep at the opening.** Driving the end-of-turn sequence from the
   opening position with no ships moving, the five opening nodes do not all run
   out on the same ply — over a handful of seeds, their run-out plies take
   several distinct values. Do **not** assert that no two coincide (**D10**).
10. **The cycle position.** `siteCyclePosition` reports 0 for a charged node at
    drain 0 and 1 at capacity; 1 for a dormant site at a level of capacity and
    0 at level 0; and clamps outside [0, 1] at both ends, including for a
    dormant site carrying more than capacity.

Depends on: Step 2 (the weighted primitive the three distributions draw from).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass, with checks 1–10 green. The compiler does real
work here: a clean typecheck means every construction of a `SiteStatus` has
been re-decided. Afterwards, grep `src/` for `enteredOnPly`, `CHARGED_LIFE_PLIES`
and `DORMANT_COOLDOWN_PLIES` and confirm none of them appears anywhere.

---

## Step 4 — Pressure, and the weighted charge draw

Status: committed

Notes: `endOfTurn.ts` gained step 5 (every active site gains 1 pressure,
capped at `PRESSURE_CAP`, skipping sites the charge draw just charged),
inserted between step 4 and step 6, with the module header comment restating
both ordering arguments. `sites.ts` gained `STARTING_PRESSURE` (1), used by
`startingSiteStatus` and step 6's active transition in place of the bare
literal, as the plan's "if that reads better" offered. `chargeDraw.ts` now
draws with `drawWeightedIndex`, weighting each pooled site by its own
`level` (pressure), recomputing the pool's weights after each removal so a
site drawn earlier cannot be drawn again and the remaining weights are the
remaining sites' pressures; the module and function doc comments were
rewritten to describe the weighting and the never-below-1 invariant. Added
the plan's six test groups: pressure growth and the cap, the discard on
charge, the pressure-ratio weighting (~2:1 over 4000 trials, generous
tolerance), weighted draw without replacement, and running-short — check 2
(a site is first eligible at pressure 1, never charged in the sequence it
went active) was already covered by a test step 3 had added under the same
"§8.6 step ordering" heading, so no new test duplicates it; the notes there
were left as is. One deviation, forced rather than chosen: switching the
charge draw to weighted broke the invariant assumed by several pre-existing
step-3-era fixtures across `chargeDraw.test.ts` and `ply.test.ts` that used
`level: 0` (or the bare-state shorthand's default) for an `active` site —
legal under the old uniform draw but a zero weight that collapses a
single-candidate pool's total to 0 and trips `drawWeightedIndex`'s
`RangeError`, per D15's "pressure is never below 1". `chargeDraw.test.ts`'s
`["active", 0]` fixtures were bumped to `["active", 1]` throughout (weight
irrelevant to those tests' assertions), its manual by-hand replay in the
"without replacement" test was switched from `drawIndex` to
`drawWeightedIndex` to match the production code path, and three
`ply.test.ts` fixtures/assertions were updated: one bare-shorthand `H8:
"active"` bumped to `["active", 1]` to keep its single-candidate charge-draw
pool non-empty-weighted, and two others (where H8 stays active throughout
because five other real sites are already charged, so H8 is never in the
draw pool at all) had their "site unchanged" assertions corrected to expect
H8's pressure risen by exactly 1 from step 5, with a comment explaining why.
`npm test` (690/690, up from 685), `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass.

Give active sites pressure and make §8.2's draw weighted by it. After this
commit the only mechanic still missing is §8.7's vacating rule.

### `src/rules/sites.ts`

The pressure cap constant was added in step 3 for `siteCyclePosition`'s benefit;
confirm it is there, valued 50, and that its comment cites §8.2 and says it is
a first guess (**D18**). Add the starting pressure of 1 as a named constant if
that reads better than a bare literal at the two places it is used
(`startingSiteStatus` and step 6's transition to active).

### `src/rules/endOfTurn.ts`

Insert **step 5** between the charge draw and the recovery step: every site
that is still active after the draw gains 1 point of level, to the cap. Sites
already at the cap stay there. Sites charged by step 4 are no longer active and
gain nothing. Sites that go active in step 6 do so at 1 and are not touched by
step 5, which has already run.

Replace the placeholder comment step 3 left, and state **both** ordering
arguments from §8.6 in the module comment: step 5 sits after the draw so a site
is drawn at the pressure it held all turn, and step 6 stays last so a site
recovering at the end of turn N is first eligible in turn N+1's draw at
pressure 1.

No new effect type is added for pressure. A site gaining a point of pressure
every turn is not an event; it is a number moving, visible in the artwork
(step 6) and nowhere else. Announcing it would put roughly ten clauses a turn
into the live region.

### `src/rules/chargeDraw.ts`

Swap the uniform `drawIndex` for step 2's weighted draw, with each pooled
site's `level` as its weight (**D15**). Everything else stays: the pool is
every active site walked in `SITES` order, occupied sites included; the draw is
one at a time without replacement, the seed advancing once per site charged;
the shortfall is computed here against `TARGET_CHARGED_SITES`; an empty pool
returns untouched without throwing. Update the module comment to describe the
weighting and to say that pressure is never below 1, so no active site can be
excluded and the total is always positive when the pool is not empty.

### Tests

1. **Pressure grows and caps.** A site that goes active at the end of ply N is
   at pressure 1 for the whole of ply N+1 and gains 1 at the end of every ply
   it stays active, stopping at 50 and never exceeding it.
2. **A site is first eligible at pressure 1.** A site that finishes recovering
   at the end of ply N is active for the whole of ply N+1 and is first eligible
   in ply N+1's draw, at weight 1 — never charged in the same end-of-turn
   sequence in which it went active. Construct this deliberately, as story 27's
   plan did: a board one node short, with no other active site, so a wrongly
   ordered sequence would charge the very site that just went active and the
   test fails loudly.
3. **Charging discards pressure.** A site charged from pressure 37 has level 0
   as a charged node, and when it eventually goes active again it starts from 1.
4. **The weighting.** Over many draws from a rigged pool, a site at pressure 20
   is drawn about twice as often as one at pressure 10, and a site at pressure
   1 alongside them is still drawn sometimes. Run enough draws that the ratio
   is stable and assert it as a range.
5. **Without replacement, weighted.** When several sites are charged in one
   ply they are distinct, and the remaining draws are weighted by the remaining
   sites' pressures.
6. **Running short still works.** With every site charged or dormant the draw
   charges nothing, throws nothing, leaves the board below five and leaves the
   seed untouched; and when active sites become available the board climbs back
   to five, charging more than one site in a ply if it must.

Depends on: Step 3 (one `level` per site, the six-step sequence with the
recovery step already last, and the pressure cap constant already declared).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass, with checks 1–6 green. Check 2 is the one that
must not be quietly weakened: it pins §8.6's step ordering, which is the
easiest thing in this story to break by accident.

---

## Step 5 — Leaving a node ends it

Status: committed

Notes: Added `src/rules/vacating.ts` with `NodeVacatedEffect` and
`applyVacating(before, after)`, exactly D11's rule over a `SITES`-ordered
walk, raising no randomness. Wired both call sites in `ply.ts` —
`applyMove` after the ship is placed, `applyAttack` after
`assertFightInvariants` — both before `applyEndOfActionTail`, with
`MoveEffect`/`AttackEffect` gaining `NodeVacatedEffect` and the fight's
vacate effects appended after `fight-resolved`; updated the module header,
`applyMove`'s and `applyAttack`'s doc comments, and
`assertFightInvariants`' doc comment and thrown message to say vacating runs
afterwards, separately, per D11. Added the D12 announcement clause: a
private `nodeVacatedClause` plus a filter prepended inside
`actionEndingClauses`, so all four assembly paths in `announcements.ts` get
it in one place, positioned after the action's own sentence and before the
end-of-turn clauses. Added `src/rules/vacating.test.ts` (10 tests exercising
`applyVacating` directly against hand-built before/after pairs — the
D11-table cases, two-at-once ordering, an inert non-charged site, and an
unclamped carry above capacity), 9 new tests in `src/rules/ply.test.ts`
under a `§8.7` describe block (move-off, arrival-is-not-a-departure,
defender-beaten, drawn-fight, winner-advances-off-origin, losing-attacker-
pushed-off-its-own-node, two-at-once via `applyAttack`, and no energy/shield
for a node left this turn) plus one new `assertFightInvariants` throw test
for a site changed during the fight itself, and 3 new tests in
`announcements.test.ts` covering the clause's placement (mid-ply, ahead of
end-of-turn clauses) and reading twice in a row. `npm test` (712/712, up
from 690), `npm run typecheck`, `npm run lint` and `npm run format:check`
all pass.

Deviation from the plan, forced rather than chosen: the plan's own test list
item 5 ("A blocked advance… so the node is left empty and goes dormant")
cannot be reproduced end-to-end through `applyAttack` against a real site on
this board. An exhaustive sweep (every board square as attack origin, every
shield count, every reach entry) found that no reach entry whose destination
is one of the seventeen `SITES` ever has a bay square anywhere on its lane —
every site sits far enough from the board's edges, and every bay sits
exactly on an edge, that a site can never be "beyond" a bay within the
0–3-square reach table. §7's blocked-advance case is real and still
implemented and covered (`vacating.test.ts`'s "blocked" case, and the
pre-existing `winnerAdvance`/`ply.test.ts` "D15 reproduction" test that this
story didn't touch), but a version of it where the blocked square is
additionally a charged node is not constructible via real gameplay, so
`vacating.test.ts` covers it directly against a hand-built before/after
pair — the same seam `assertFightInvariants`' own tests already use for
otherwise-impossible states — and `ply.test.ts`'s new describe block carries
a comment recording why no sibling test sits there. The plan's item 11 (the
fight-invariants "still throws when a site changes" test) also did not
already exist in the repository — grepped for and confirmed absent before
writing it — so it was added fresh here rather than merely re-verified.

Implement §8.7 (**D11**, **D12**). After this commit the game plays 0.12 in
full, with only the active artwork still to come.

### `src/rules/vacating.ts` (new)

A new module holding §8.7's rule as one function over a before/after pair, with
a header comment citing §8.7 and §8.6 and explaining that it runs immediately,
as part of resolving an action, not at the end of the turn.

It exports:

- A **node-vacated effect** carrying the square, and the id and side of the
  ship that left it — read from the _before_ state's occupant of that square,
  since by definition nobody is there afterwards.
- One function taking the state the action started from and the state it
  produced, and returning the new state plus one effect per vacated node. Its
  rule, and its only rule: **a site that is charged in the after state, was
  occupied in the before state, and is unoccupied in the after state, goes
  dormant carrying its level unchanged.**

Walk `SITES` in declared order so the effects come out in a stable order; this
draws no randomness and consumes no seed. A ship _arriving_ on a node is not a
departure and changes nothing.

Do not add a case for the beaten defender, the drawn fight or the blocked
advance. **D11**'s table shows all three falling out of the one rule, which is
exactly why the rules state it the same way, and a special case for any of them
would be a second implementation of the same thing.

### `src/rules/ply.ts`

- `applyMove`: after the moved ship has been placed and before
  `applyEndOfActionTail` runs, apply the vacating rule to the pre-move state
  and the just-produced state, take the resulting state forward, and append its
  effects to the move's effect list. `MoveEffect` gains the new effect type.
- `applyAttack`: after `assertFightInvariants` has run and before
  `applyEndOfActionTail`, apply the vacating rule to the pre-attack state and
  the fully resolved state, the same way. `AttackEffect` gains the new effect
  type. The vacate effects go into the effect list **after** the
  `fight-resolved` effect, so a listener reads the fight and then its
  consequence.
- `assertFightInvariants` keeps its strict "a fight changes no site" check
  (**D11**). Update its doc comment and the error message to say that the
  vacating rule is applied **after** the invariants are asserted, so the check
  is about the fight's own resolution and does not contradict §8.7. This is the
  single most likely place for a reader to think the code and the rules
  disagree; the comment has to close that off.
- Update the module header comment, which currently states flatly that nothing
  a ship does changes any site's state. Under 0.12 exactly one thing does:
  leaving a charged node ends it.
- The pass guard is untouched: a passed turn takes no action, so no ship leaves
  a node.

### `src/board/announcements.ts`

Add the clause of **D12**, positioned after the action's own sentence and
before the end-of-turn clauses in all four assembly paths. Recommended wording:
`The node at ${square} went dormant when the ${side} ship left it.` Check that
two of them in a row — a drawn fight in which both ships stood on nodes — reads
acceptably.

### Tests

In a new `src/rules/vacating.test.ts` for the rule in isolation, and in
`src/rules/ply.test.ts` for the cases as they arise in play:

1. **A ship moves off a node.** The node is dormant immediately — in the state
   `applyMove` returns, before the opponent's turn — and carries exactly the
   drain it had.
2. **A ship moves onto a node.** Nothing changes; arriving is not a departure.
3. **A defender beaten on a node.** The attacker advances onto the square and
   the node is still charged, at the same level, once the fight resolves. This
   is the case the rule exists for; give it its own named test.
4. **A drawn fight on a node** leaves it dormant, at the drain it had.
5. **A blocked advance.** The beaten ship's return bay lands on the lane and
   blocks the advance, so the node is left empty and goes dormant.
6. **An attacker that wins from a node and advances off it** leaves that node
   dormant — the origin square, not the target.
7. **A losing attacker pushed off its own node** leaves that node dormant.
8. **Two at once.** A drawn fight in which both ships stood on charged nodes
   sends both dormant and produces two effects.
9. **No energy for a node left this turn.** A player who steps off a node
   during their turn collects nothing for it at the end of that turn, and gains
   no shield on it.
10. **The announcement.** The vacated clause appears after the move or fight
    sentence and before the end-of-turn clauses, and reads correctly when there
    are two of them.
11. **The fight invariants still bite.** The existing hand-constructed
    before/after test for `assertFightInvariants` still throws when a site
    changes during the fight itself.

Depends on: Step 4 (0.12's economy is otherwise complete, so a vacated node's
early dormancy and early return can be observed against a working cycle).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass, with checks 1–11 green. Checks 3 and 6
together are the story's headline behaviour — a node changes hands intact, but
a node you walk away from is spent — and neither may be dropped.

---

## Step 6 — The active site's artwork travels with its pressure

Status: committed

Notes: `SiteMarker.tsx` gained a private `lerpNumber` and `hexLerp`
(clamped to [0, 1], falling back to the start value when no cycle position
is given, matching `middleStopOffsetPercent`'s existing fallback
convention) plus the `ACTIVE_START_*`/`ACTIVE_END_*` constant family, and
the `active` arm of `siteArtwork` now interpolates radius 12 → 24, inner
stop colour `#F1DBA5` → `#DAA520`, and outer stop opacity 0.75 → 0.5 at the
given `cyclePosition`, exactly D14's three interpolations; charged and
dormant are untouched. The module header, the `siteArtwork` comment and the
`cyclePosition` prop doc were reworded per D14's note about
`node-artwork.md`'s pre-0.11 headings and active's loss of its "no clock"
status. Added the accessibility note to `known-issues.md` under a new "From
story 29" heading, per D17. Tests: `SiteMarker.test.tsx` gained the hex-lerp
and radius/opacity checks at cycle position 0, 1, 0.5 (verified the
midpoint hex value by hand-computing per-channel rounding) and two
out-of-range clamp cases, plus an explicit active no-cyclePosition fallback
test; the existing `EXPECTED_ARTWORK.active` fixture now reads from a new
`ACTIVE_START`/`ACTIVE_END` pair since active's own start is no longer the
same as its rendered appearance. `Board.test.tsx` gained one wiring test:
two active sites at pressure 1 and at the cap on the same hand-built board
render markers of radius 12 and 24 respectively. Deviation: the plan
offered exporting the hex-lerp helper for direct unit testing "if that
reads better"; kept it private and tested it through rendered output only,
consistent with how the pre-existing `middleStopOffsetPercent` travel is
already tested in this file. `npm test` (719/719, up from 712), `npm run
typecheck`, `npm run lint` and `npm run format:check` all pass.

Give the active state the start-to-end travel it has never had (**D14**), and
record the accessibility consequence (**D17**).

### `src/board/SiteMarker.tsx`

- Add a private hex-lerp helper: two six-digit hex colours and a position, one
  six-digit hex colour out, clamped at both ends. Nothing else in the app needs
  it, so it stays private to the module.
- The **active** arm becomes three interpolations at the cycle position it is
  already handed: circle radius 12 → 24, inner stop colour `#F1DBA5` →
  `#DAA520`, outer stop opacity 0.75 → 0.5. The outer stop colour stays
  `#DAA520` and the inner stop opacity stays 1 at both ends. Use named
  start/end constants in the same style as the existing
  `CHARGED_START_OFFSET_PERCENT` family, so all of the travel's endpoints are
  visible in one place.
- With no cycle position given, active falls back to its **start** appearance —
  the small pale disc — matching how charged and dormant already behave.
- **Charged and dormant are untouched.** Their artwork, their constants and
  their travel are exactly as they are; only the number feeding them changed,
  and that changed in step 3.
- Update the module header comment: active is no longer "a small disc" but a
  disc that grows and warms with pressure, and the comment must name **which
  sections of `doc/plan/00000023-update-node-visual/node-artwork.md`** each end
  of the active travel is transcribed from, in that document's own pre-0.11
  headings — its "Dormant" section is the small pale disc at pressure 1, and
  its "Active" section is the gold disc at the cap. The file already does this
  for the other two states; the trap it guards against is that the document's
  headings do not mean what the same words mean in the code.
- **No transition, no easing, no animation.** This is a calculation from state,
  one appearance per render, exactly like the other two states. No CSS is
  added; `SiteMarker.css` is not touched.

### `doc/plan/00000021-accessibility-tech-debt/known-issues.md`

Add a new "From story 29 — variable node durations" section with the single
entry **D17** describes: an active site's pressure is visible only in its
artwork — its size and warmth — while the square's accessible name still says
"active site" and nothing more, so a new piece of board state does not reach
assistive technology, alongside the cycle position that already does not. Cite
this plan and the story as the source, in the ledger's established style.
Change nothing else in that document.

### Tests

In `src/board/SiteMarker.test.tsx`:

1. **The hex lerp.** Position 0 and position 1 return the two endpoint colours
   exactly; the midpoint is the per-channel midpoint; positions outside [0, 1]
   clamp. Test it through the rendered output if the helper stays private, or
   export it for the test if that reads better — the arithmetic is what must be
   pinned, not the seam.
2. **Pressure 1.** The active marker renders the small pale disc: radius 12,
   inner stop `#F1DBA5`, outer stop opacity 0.75.
3. **The cap.** At cycle position 1 the active marker renders today's disc:
   radius 24, inner stop `#DAA520`, outer stop opacity 0.5.
4. **In between.** At the midpoint all three values sit between their
   endpoints, and the radius specifically is 18.
5. **No cycle position.** Active falls back to the pressure-1 appearance.
6. **Charged and dormant are unaffected**, at both ends of their travel — the
   existing tests for them still pass unchanged.

And in `src/board/Board.test.tsx`, one wiring test: a site active at a low
level and a site active at the cap render visibly different active markers on
the same board, which is what proves `Board.tsx` is feeding the level through.

Depends on: Step 4 (pressure exists and moves, so there is something for the
artwork to report).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass, with checks 1–6 and the wiring test green. The
visual result is confirmed by the owner in step 9, not here.

---

## Step 7 — The long-run economy and replay, re-established

Status: committed

Notes: Rewrote `src/rules/sitePool.test.ts` fully around 0.12's Appendix B
and D16, replacing the interim step-3 file: five `it.each(SEEDS)` groups
(five-charged, active-pool floor, expiry spread, and the new
pressure-weighting wait-bound check) plus the retained single-seed
steady-state means check. Bounds were set from measured values over several
seeds at 500 plies each (via a throwaway local script, not committed):
multi-expiry share topped out under 3% (bound 10%), the worst single-ply
expiry count was 3 (bound `TARGET_CHARGED_SITES - 1` = 4), every site was
charged at least 3 times (floor 2), and the longest observed gap between a
site's successive charges was 277 turns (ceiling 400) — all with generous
margin per the plan's "measure first, then set bounds generously"
instruction. `src/rules/seededReplay.test.ts`'s existing "not vacuous" and
"different seed diverges" assertions were re-run and still hold (measured
directly: 26 bay returns and exactly 10 charged sites over the 40-round
run against the >=10 threshold — deterministic, so not flaky despite the
tight margin); its header comment was extended per the plan to say the
per-node drain/recovery draws now dominate the stream, and one explicit
`siteLevels` equality assertion was added to the same-seed replay test,
naming directly (D6's point) that the drain/recovery draws' effect on every
site's `level` replays, not only the charged-site sequence — this was
already implied by the pre-existing whole-`finalState` equality check but
the plan asked it be considered as its own named assertion.
`src/rules/fullGame.test.ts` needed no changes: run as-is, all three tests
still pass (hundred-round and three-round games both end correctly, both
sides score above zero, the game-over refusals all hold), so per the plan
("nothing in it should need rewriting... run it") it was left untouched.
Full suite: `npm test` 725/725 (up from 719 — the sitePool.test.ts rewrite
nets 13 tests, replacing 7 interim ones, plus one assertion added to an
existing seededReplay test rather than a new one), `npm run typecheck`,
`npm run lint` and `npm run format:check` all pass. No deviations from the
plan.

With the whole cycle in place, rewrite the integration test that guards
Appendix B and re-confirm the two whole-game tests against a draw stream that
has moved a long way.

### `src/rules/sitePool.test.ts` (rewritten, **D16**)

Drive the end-of-turn sequence from the opening position over several hundred
plies and a handful of seeds, with no ship ever moving, and assert the four
properties of **D16**:

1. The board holds at exactly five charged from the first ply onwards.
2. The active pool never falls below a floor well above one — Appendix B
   predicts nine or ten, so a floor of, say, four leaves ample margin while
   still failing if the economy collapses.
3. Expiries stay spread: the proportion of plies in which two or more nodes run
   out stays small, and no ply ever runs out anything close to all five.
   **Measure first, then set bounds with generous margin**, and say in a
   comment that 0.11's "at most one per ply" property was withdrawn with the
   staggered opening (**D10**).
4. The pressure weighting bounds the wait: over the run every one of the
   seventeen sites is charged several times, and the longest gap any site waits
   between successive charges stays under a generous ceiling. Add a comment
   explaining what this is worth — under a uniform draw that tail is unbounded,
   and this test is the only thing that would notice the weighting being lost.

Also assert the steady-state means Appendix B claims — roughly two or three
dormant and nine or ten active — as loose bounds, skipping the first few dozen
plies while the opening settles.

Rewrite the file's header comment around 0.12's premise, replacing 0.11's.

### `src/rules/seededReplay.test.ts`

The file compares two runs against each other rather than against recorded
constants, so no expectation is hard-coded — but the draw stream is now
dominated by drains and recoveries rather than bay returns, and both the
"not vacuous" thresholds and the "a different seed diverges" pair must be
re-confirmed rather than assumed. Run it, and if either assumption no longer
holds, adjust the thresholds or the seed pair and say so in the step's notes.
Extend its header comment to say that the board's per-node drain and recovery
draws are now the bulk of the stream.

Consider adding one assertion the story's verification asks for and this file
is the natural home of: the same opening seed and the same sequence of actions
produce the same **site levels** at the end of the game, not only the same
charged-site sequence — the levels are the part of the state the new draws
write to.

### `src/rules/fullGame.test.ts`

Nothing in it should need rewriting, but every assertion in it is
seed-sensitive and the stream has moved: the hundred-round game must still run
to completion with consistent totals and both sides scoring above zero, and the
three-round game must still end where it says. Run it, and if a fixed seed no
longer satisfies an assertion, **fix the assertion's fragility rather than
hunting for a friendlier seed** — that is the lesson recorded in story 27's
step 4 peer-review follow-up, where a seed change papered over an assertion
that rested on a played-out position happening to leave two ships in range.

Depends on: Step 5 (the economy and the vacating rule are both in place, so a
long run exercises the real game).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass. The rewritten `sitePool.test.ts` is green on
every seed it runs, `seededReplay.test.ts` still proves replay and divergence,
and `fullGame.test.ts` still scores and still ends.

---

## Step 8 — `README.md` and a sweep for stale numbers

Status: pending

`README.md` states the old mechanic directly and is wrong in at least two
places after this story:

- The intro paragraph: "Nodes do not last. Each one runs down after a few turns
  and goes dark…" — still broadly true, but it should now say that holding a
  node is what uses it up, and that walking away from one ends it.
- The status blockquote: "**A node runs out after nine turns** — its glow
  shifts a little as it runs down, so you can see roughly how much life it has
  left — and it stays dark for a while before the board can light it again."
  The nine turns are gone. Rewrite for a budget that burns faster under a ship,
  ends when the ship leaves, and comes back sooner when it was ended early. The
  glow sentence survives and gets a companion: a site waiting to be lit now
  grows and warms as it waits.

Rewrite both for a non-technical player (`CLAUDE.md`, "Intended audience") —
no capacity, no drain, no pressure as jargon; say it in turns and in what the
player sees. Then run `/update-readme` for the rest of the branch diff.

Then sweep the repository for stale numbers and citations left by this story:
grep `src/`, `README.md` and `CONTRIBUTING.md` for "nine turns", "nine plies",
"stagger", `CHARGED_LIFE_PLIES`, `DORMANT_COOLDOWN_PLIES` and `enteredOnPly`,
and confirm nothing outside `doc/ruleset/changelog.md`'s historical record
survives. Confirm too that every `§8.7` citation in `src/` means the vacating
rule and not 0.10's end-of-turn order.

`CLAUDE.md` needs nothing: hub, site, node, ply, turn and round all keep their
meanings.

Depends on: Step 7 (the branch diff `/update-readme` reviews should be the
whole story).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass, and the grep sweep returns nothing stale.
Then read the changed `README.md` paragraphs end to end and confirm they
describe the game as it now plays, in a player's words, with no mention of nine
turns.

---

## Step 9 — Owner play-through

Status: pending

The story's eyeball checks, gathered into one pass. The owner runs
`npm run dev` in the dev container, opens the app and confirms:

1. **The opening board.** Five nodes are lit — H8, E5, K5, E11 and K11 — and
   all five look **identically fresh**, because they all start at drain 0.
   There is no stagger any more. The other twelve sites are small pale dots,
   not the larger gold discs they used to be, because every active site starts
   at pressure 1.
2. **Active sites grow as they wait.** Over the first dozen or so turns the
   twelve pale dots visibly swell and warm towards the gold disc the board used
   to show, and a site that has just cycled back to active is a small pale dot
   again beside them.
3. **The five drift apart on their own.** The opening five stop looking alike
   within a few turns, and they run out on different turns rather than
   together.
4. **Holding a node burns it faster.** A node with a ship parked on it visibly
   runs down quicker than one nobody has reached.
5. **Leaving a node ends it.** Moving a ship off a lit node turns that node
   grey **immediately**, in the same turn, before the opponent moves — and the
   live region says so, naming the square and the ship that left.
6. **Taking a node in a fight keeps it.** Winning an attack against a ship
   standing on a lit node leaves the node lit, with the attacker on it and its
   glow unchanged — the node changes hands intact.
7. **A drawn fight over a node ends it.** Two equal ships fighting over a lit
   node both go to bays and the node goes grey.
8. **A node ended early comes back sooner.** A node stepped off early opens its
   grey phase already part-way along the grey artwork's travel and returns to
   the pool noticeably faster than one that burned all the way out.
9. **Stranding is unchanged.** A node that runs out under a ship still goes
   grey, still strands the ship, and the ship's owner still spends their next
   turn moving it clear.
10. **Everything else still works.** Standing on a lit node still pays energy
    and shields at the end of your turn, the score and node pips still update,
    the board still tops itself back up to five lit nodes, and a game still
    runs to its end.

Depends on: Step 8 (the whole story is in place, including the README the owner
reads alongside the app).

Verification (manual): the owner performs the ten checks above and confirms
them. This is a pipeline gate — the story is not finished until the owner has
said so.
