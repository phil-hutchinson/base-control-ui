# Implementation plan — 00000041 Power replaces shields, and bays recharge over time

## What this story is

Three changes to the number a ship carries. The first turns it inside out
without changing how the game plays; the second and third change how the game
plays.

1. **Shields become power, and the polarity reverses.** A ship no longer
   carries 0–4 **shields** that slow it down; it carries 0–4 **power**, and
   power is what lets it move. Ships start at **4**. A charged node **drains**
   the ship holding it (one power per turn, floored at 0); a dormant site
   **restores** it (one per turn, capped at 4). Every number, threshold and
   reachable square is exactly what it is today: `power` is `4 − shields`
   throughout. **This is a reskin, not a rules change.**
2. **A fight no longer changes a ship's power.** Both ships are still returned
   to bays drawn at random (§7.1); what goes is the stripping. Each ship
   arrives carrying the power it had when the fight started.
3. **A bay restores power one per turn instead of all at once.** Ending a move
   in a bay no longer refills a ship. A ship standing in a bay at the end of
   its owner's turn gains **one** power, to the maximum of 4 — the same rate
   and the same end-of-turn step as a dormant site, without a dormant site's
   energy penalty.

The three go together. Change 2 alone would leave a hole: a beaten ship would
arrive in a bay drained and, once change 3 removes the instant refill, would
have nowhere to recover. Change 3 fills it — a bay becomes the place a ship
goes to recover, at a turn per point. Afterwards the **only** ways to recover
power are time in a bay and time on a dormant site: one costs turns, the other
costs energy, and a fight is a shortcut around neither.

This is a **gameplay change** (changes 2 and 3 are), so `doc/ruleset/rules.md`
goes from **0.16** to **0.17**, with one `doc/ruleset/changelog.md` entry
covering all three changes and a matching `RULES_VERSION` bump, in its own
commit ahead of any code (step 1). **Tagging stays on hold**, per `CLAUDE.md` —
no step tags anything.

### Vocabulary reminder for a cold reader (`CLAUDE.md`)

Planning documents and code say **ply**; `rules.md`, the UI and `README.md` say
**turn**. They are the same thing: everything one player does before play
passes, which in this game is one action (`ACTIONS_PER_PLY` is 1). **Site**,
**bay**, **action**, **round** and **move** are the same word everywhere;
**move** means the movement action specifically and is never a synonym for a
turn. A **site** is one of the seventeen fixed positions, in state `active`,
`charged` or `dormant`; a **node** is precisely a site that is charged.

**Power** is the same word everywhere — player-facing text, `rules.md`,
`README.md`, code, tests. Unlike hub/node there is no split, and there is no
reason to invent one. **Energy** keeps its own meaning untouched: the score a
player banks, never a property of a ship.

### Settled decisions that are not to be re-opened

Fixed by the story before planning began. A step that finds one of these
inconvenient should still implement it, and say so in its Notes.

1. The rules edit goes first, in its own commit, ahead of any code — 0.16 →
   0.17, **one** changelog entry covering all three changes, `RULES_VERSION`
   bumped in the same commit. No tagging.
2. The word is **power**, everywhere. "Charge" was considered and rejected:
   `rules.md` already has **charged** sites and the **charge draw**, so §4.1
   would have read "a ship on a charged node loses a charge" one sentence after
   describing the charge draw.
3. The code is **renamed and inverted**, not flipped at the display edge. The
   stored value becomes the player-facing one. Keeping `shields` internally and
   showing `4 − shields` was considered and rejected by the owner: a permanent
   sign flip between the document and the code is a trap on every future rules
   change, and two of this story's three changes are edits to exactly that
   machinery.
4. No numeric retune of anything else — drain, recovery, pressure, capacity,
   the energy tables, movement geometry, combat legality, fleet size, game
   length. The 0–4 range and the four-slot gauge stay as they are.
5. No new cost or limit on parking in a bay. A bay both protects and restores;
   a drained ship may sit there four turns and come out full. The price is the
   turns. If that proves too safe it is a balance story of its own.
6. No rule against a ship at 0 power, and no special handling for one. It moves
   one square orthogonally like any other ship at 0 power.
7. No redesign of the gauge beyond feeding it the reversed number. Ship artwork
   is story 40's work, just landed.

---

## Where the work lands

| File                         | What happens to it                                                                                  | Step    |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | ------- |
| `doc/ruleset/rules.md`       | §1, §2, §3.1, §4's closing line, §4.1, §5, §6, §7, §7.2, §8.1, §8.2, §8.5, §8.6 edited; 0.16 → 0.17 | 1       |
| `doc/ruleset/changelog.md`   | One new `## 0.17` entry at the top, covering all three changes                                      | 1       |
| `src/rules/rulesVersion.ts`  | `RULES_VERSION` → `"0.17"`                                                                          | 1       |
| `src/rules/shields.ts`       | **Renamed** to `power.ts`; `PowerLevel`, `MIN_POWER`, `MAX_POWER`, `isPowerLevel`                   | 2       |
| `src/rules/fleet.ts`         | `FleetEntry.power`; the starting fleet built at `MAX_POWER`                                         | 2       |
| `src/rules/gameState.ts`     | `Ship.power`; `shipsFrom`'s record entry                                                            | 2       |
| `src/rules/movement.ts`      | `ReachOption.unlockedAtPower`, `REACH_OPTIONS` re-keyed, the skip inverted, `reachFrom`'s parameter | 2       |
| `src/rules/combat.ts`        | Two `reachFrom(..., attacker.power)` call sites and their comments                                  | 2       |
| `src/rules/endOfTurn.ts`     | `PowerLostEffect` / `PowerGainedEffect`; step 1's two branches swap sense                           | 2       |
| `src/rules/ply.ts`           | `FightShip.power`, `toFightShip`, the `endsInBay` reset, comments                                   | 2, 3, 5 |
| `src/board/announcements.ts` | The two end-of-turn clauses, the fight sentence, the move sentence, the out-of-range rejection      | 2, 3, 5 |
| `src/board/squareLabel.ts`   | `SquareOccupant.power`; the occupant segment reads as a level                                       | 2       |
| `src/board/Board.tsx`        | The occupant descriptor it builds                                                                   | 2       |
| `src/board/BoardSquare.tsx`  | The `ShipModel` prop it feeds                                                                       | 2       |
| `src/ships/shieldGauge.ts`   | **Renamed** to `powerGauge.ts`; `gaugeSlots(power)`                                                 | 2       |
| `src/ships/ShipModel.tsx`    | The optional prop renames; module comment                                                           | 2       |
| `src/ships/shipArt.ts`       | `GAUGE_SLOT_COUNT`'s comment only — the constant keeps its name and value                           | 2       |
| `README.md`                  | The overview paragraphs and both quoted passages                                                    | 7       |

Tests touched, and by which step:

| Test file                         | Step(s) | Why                                                                            |
| --------------------------------- | ------- | ------------------------------------------------------------------------------ |
| `src/rules/shields.test.ts`       | 2       | **Renamed** to `power.test.ts`, unchanged in substance                         |
| `src/rules/movement.test.ts`      | 2       | Inputs converted; **every expected square list stays byte-identical**          |
| `src/rules/fleet.test.ts`         | 2       | Starting value becomes 4; `isPowerLevel`                                       |
| `src/rules/gameState.test.ts`     | 2       | Starting value becomes 4                                                       |
| `src/rules/endOfTurn.test.ts`     | 2, 4    | Charged/dormant cases invert; the bay case is new                              |
| `src/rules/camping.test.ts`       | 2       | Fixture helper and every gain/loss expectation invert                          |
| `src/rules/combat.test.ts`        | 2       | Fixture helper; the three reach-extreme cases re-key                           |
| `src/rules/ply.test.ts`           | 2, 3, 5 | Fixture helper; the fight cases; the bay-reset cases go                        |
| `src/rules/actions.test.ts`       | 2       | Fixture helper and its mobility comments                                       |
| `src/rules/chargeDraw.test.ts`    | 2       | Fixture helper                                                                 |
| `src/rules/energy.test.ts`        | 2       | Fixture helper                                                                 |
| `src/rules/fullGame.test.ts`      | 2       | Fixture helper and three ship literals                                         |
| `src/rules/seededReplay.test.ts`  | 2, 3, 5 | No literal to re-record — see **D13**; re-run and confirm it stays non-vacuous |
| `src/rules/rulesVersion.test.ts`  | 1       | Passes unchanged once the version and changelog move together                  |
| `src/game/session.test.ts`        | 2       | Fixture helper and one comment                                                 |
| `src/board/announcements.test.ts` | 2, 3, 5 | Every clause wording                                                           |
| `src/board/squareLabel.test.ts`   | 2       | Every expected label string                                                    |
| `src/board/Board.test.tsx`        | 2       | Label strings, the gauge-slot count case, the mobility fixtures                |
| `src/board/BoardSquare.test.tsx`  | 2       | Occupant props                                                                 |
| `src/ships/ShipModel.test.tsx`    | 2       | Prop name and label strings                                                    |
| `src/ships/shieldGauge.test.ts`   | 2       | **Renamed** to `powerGauge.test.ts`                                            |
| `src/hud/ScoreDisplay.test.tsx`   | 2       | Fixture helper                                                                 |
| `src/hud/GameOverPanel.test.tsx`  | 2       | Two ship literals                                                              |
| `src/App.test.tsx`                | 2       | One accessible-name regular expression                                         |
| `src/rules/recovery.test.ts`      | 6       | **New**: integration cover for the three changes together                      |

Deliberately **not** touched:

- **`src/rules/sites.ts`, `chargeDraw.ts`, `energy.ts`, `bays.ts`,
  `gameLength.ts`, `board.ts`, `random.ts`.** No number moves and no site rule
  changes. A bay is not a site and never has been (§3.2: every site is in the
  interior), so nothing in `energy.ts` needs to learn about bays — a ship in a
  bay collects nothing and pays nothing, exactly as today.
- **Artwork, CSS and the gauge's geometry.** `shipArt.ts`'s slot positions,
  `ShipModel.css`, `BoardSquare.css`. `gaugeSlots` already lights the first `n`
  of four; feeding it `power` is the whole of the reversal on screen.
- **`src/game/session.ts`.** It carries effects through without naming any of
  them; the rename flows through it with no edit.
- **`CLAUDE.md`.** No vocabulary entry is added for power: `CLAUDE.md`'s
  vocabulary section exists for words that split between code and player-facing
  text, and power does not split. (If the owner wants it listed anyway, that is
  a one-line follow-up, not this story's work.)
- **The game record format.** There is no record format in the repository yet;
  the ship field it will eventually carry simply gets the new name.

### Accessibility (`CLAUDE.md`)

No plan step tests accessibility, and no step spends work keeping an accessible
behaviour intact. Existing automated tests are updated where the path is
straightforward — for the label and announcement tests it is: the strings
change and the assertions change with them.

**No entry in `doc/plan/00000021-accessibility-tech-debt/known-issues.md` is
expected.** The square's accessible name still reports the ship's number on
every square (**D10**), the end-of-turn clauses still name every ship that
gained or lost a point and every ship that hit a limit (**D9**), and the move
sentence still names the bay a ship arrived in (**D11**). If an implementer
nonetheless finds a real loss, record it there in that document's existing
per-story section style, and say so in the step's Notes.

---

## Design decisions and reasoning

This section is the design record for the story. Code in this repository does
not carry design history (`CONTRIBUTING.md`, "Comments"), so everything a future
reader needs to know about **why** is written here and nowhere else.

### D1 — The rules change lands first, in one version bump

`CLAUDE.md` and `doc/guidelines/implementation-plan-guide.md` both require it:
`rules.md` is the single source of truth and the code implements it, so the
document is edited, the version bumped and the changelog written before any
behaviour changes. Stories 27, 29, 31, 33 and 37 all did this; it is the house
pattern.

All three changes go in **one** version bump and **one** changelog entry. They
cannot sensibly be described apart: §4.1 rewritten around power is what §3.1's
new bay rule and §7's stripped-out stripping both refer to, and a version on
`main` in which a fight no longer strips a ship while a bay still refills it
instantly would describe a game nobody intends to play.

Between step 1 and step 5 the code is knowingly behind the document. The
windows are deliberate; no step should try to paper over the one it sits in:

| After step | The app behaves like this                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| 1          | 0.16 in full: shields, gained on a node, stripped by a bay and by a fight                                            |
| 2          | 0.16 exactly, in 0.17's units: power, right way up, with a fight and a bay both still refilling a ship to full power |
| 3          | As step 2, plus a fight leaves both ships' power alone                                                               |
| 4          | As step 3, plus a bay restores a point a turn — while _also_ still refilling instantly on arrival                    |
| 5          | 0.17 in full                                                                                                         |
| 6, 7, 8    | 0.17 in full, with the consequences pinned end to end, `README.md` telling the truth, and the owner having played it |

The step-4 window is the only one where two rules overlap: a bay refills on
arrival **and** grants a point at the end of the turn. That is harmless — the
second has nothing left to give a ship the first has already filled — and it is
strictly better than the alternative ordering (removing the instant refill
first), which would put a commit on the branch where a bay does nothing for a
ship at all and a beaten ship can never recover. See **D14**.

### D2 — The reskin is one atomic step, and cannot be split

Step 2 is wide: twelve source files and eighteen test files. It is still one
step, because there is no smaller unit of it that compiles.

`Ship.shields: ShieldCount` is the hub. Rename it and `movement.ts`,
`combat.ts`, `ply.ts`, `endOfTurn.ts`, `Board.tsx`, `squareLabel.ts`,
`announcements.ts` and `ShipModel.tsx` all stop type-checking in the same
instant. Any "rules layer first, presentation second" split leaves a commit
that does not build, which the guide forbids ("each step is independently
compilable and runnable").

Two ways to break the cycle were considered and rejected:

- **Add `power` alongside `shields` and remove `shields` later.** Two fields
  meaning the same thing, with a sign relation between them, in a state object
  that is compared whole in `seededReplay.test.ts` — the exact trap the owner
  rejected in the first place (settled decision 3), for one commit's benefit.
- **Keep the field named `shields` in the presentation types (`SquareOccupant`,
  `ShipModelProps`) for one commit and rename them after.** It compiles, but it
  puts a commit on the branch where a value named `shields` holds power. The
  peer review would flag it, and it saves nothing: the wording in those files
  has to change in the same step anyway, because an effect raised on a _dormant_
  site cannot go on saying "gained a shield" without being simply false.

So step 2 renames and inverts everything at once. Its size is manageable
because it is **mechanical**: no branch is added or removed, no geometry
changes, no test's expected output changes except the words in it. What makes
it one step for verification purposes is that it has exactly one thing to
prove — that nothing changed but the words and the sign — and the whole suite
plus the reach comparison in **D3** proves it.

### D3 — The reach table is re-keyed, and the reskin must not move a single game

`REACH_OPTIONS` is transcribed straight from §6's table. Today it is keyed by
shields descending, and `reachFrom` skips an option whose figure is _below_ the
ship's shield count. After the change it is keyed by power **ascending** (0
orthogonal-1, 1 diagonal-1, 2 orthogonal-2, 3 diagonal-2, 4 orthogonal-3) and
an option is kept when the figure it unlocks at is at or **below** the ship's
power.

Two properties matter and both must hold:

- **The reachable set is identical** for every mobility, with `power = 4 −
shields`. Old: shields 4 keeps only the 4-row (one square orthogonally). New:
  power 0 keeps only the 0-row (one square orthogonally). Same set, all the way
  down.
- **The order of the entries `reachFrom` returns is identical too.** Both
  tables list the same five options in the same physical order — orthogonal 1,
  diagonal 1, orthogonal 2, diagonal 2, orthogonal 3 — because reversing the key
  and reversing the sort cancel out. This is not cosmetic:
  `legalDestinations` preserves that order, and the deterministic policies in
  `fullGame.test.ts` and `seededReplay.test.ts` pick `destinations[0]`. Keep
  the order and those two whole-game tests replay exactly the games they replay
  today; change it and they diverge for no reason, destroying the evidence that
  the reskin is a reskin.

Together with the starting fleet moving from `shields: 0` to `power: 4` — the
same mobility — this means **step 2 changes no game at all**. That is the
step's proof, and its verification is built around it.

### D4 — Converting a fixture: `4 − n`, and the trap in the defaults

Roughly a dozen test files carry a helper of the shape
`ship(id, side, square, shields: ShieldCount = 0)`. **The default is not a
zero to be preserved — it is "a fully mobile ship", and it must become
`MAX_POWER` (4).** A rename that leaves the default at 0 compiles, passes
type-checking, and silently rewrites what dozens of tests exercise into the
opposite extreme (a crippled ship), which is the single most likely way to get
this story wrong.

The conversion rule, applied to **every** literal in source and tests:
`power = 4 − shields`. So `shields: 0` → `power: 4`, `shields: 1` → `power: 3`,
`shields: 2` → `power: 2`, `shields: 3` → `power: 1`, `shields: 4` → `power: 0`.
The same applies to prose in test names and comments ("a 4-shield ship's targets
are its four orthogonal neighbours" describes a ship at **0 power**), and to
expected accessible-name strings ("0 shields" in a starting-position test
becomes the four-power wording from **D10**).

The one case that is _not_ a straight `4 − n`: a fixture whose number was
chosen to be a _limit_ rather than a mobility — a ship "already at 0 shields on
a dormant site" that has nothing left to lose. Under the flip, the ship with
nothing left to gain on a dormant site is the one at **4 power**, and the ship
with nothing left to lose on a charged node is the one at **0 power**. The
arithmetic gives the right answer in both cases; it is the surrounding prose
that has to be re-read rather than find-and-replaced.

### D5 — One gained effect for a bay and a dormant site, not two

`endOfTurn.ts`'s step 1 keeps its single pass over the moving side's fleet and
its fleet-order effects. After this story it has three outcomes: a point lost on
a charged node, a point gained on a dormant site **or in a bay**, and nothing.

Those become **two** effect types, not three: `PowerLostEffect`
(`"power-lost"`) and `PowerGainedEffect` (`"power-gained"`), each carrying the
ship, the side, the square and the resulting power — the same shape the two
shield effects carry today.

A third type for the bay case was considered and rejected. The square is on the
effect, so anything that wants to know where the point came from can ask; and
`rules.md` itself treats the two as one thing (§8.6 step 1 is one sentence
covering both, §4.1 states one gain rule with two places it applies). A third
type would force `announcements.ts` to group three clauses where two will do,
and would put a distinction in the code that the rules document does not make.

The wording therefore must be true of both, which it is: the clause names the
square and what happened to the ship, and never names the _cause_. See **D9**.

The two branches cannot both fire for one ship: every site is in the interior of
the board (§3.2) and every bay is on the outer edge (§3.1), so a square is never
both. The step keeps a single if/else-if chain and the existing `isBay` helper
from `src/rules/bays.ts`, which `ply.ts` and `combat.ts` already use.

### D6 — Which effect fires on which square, stated plainly

Today: **charged → gain**, **dormant → loss**. After the flip: **charged →
loss**, **dormant or bay → gain**. The effect names swap which site they are
raised on. An implementer reading `endOfTurn.ts` mid-rename should expect the
`"power-lost"` branch to be the one that reads `siteState === "charged"`, which
is the opposite of where `"shield-gained"` sits today. This is the single place
in the story where a mechanical rename would produce working code that says the
wrong thing, so it is called out here.

The floors and caps travel with the sense: the charged branch fires only while
`power > MIN_POWER`, the gain branch only while `power < MAX_POWER`, and a ship
already at the limit raises **no effect at all** — the existing "no effect for a
ship with nothing to lose" behaviour, preserved.

### D7 — The clause order stays where it is

`endOfTurnClauses` groups all of a sequence's gains into one clause and all of
its losses into another, and puts the pair ahead of everything else. Today the
gain clause (charged nodes) comes first.

**Keep the charged-node clause first.** After the flip that means the _loss_
clause is first and the _gain_ clause second. The rule is not "gains before
losses" — it is "what the nodes did, then what the bays and dormant sites did",
which keeps the node sentence next to the energy-collection sentence that
follows it from step 2 and reads as one thought: "Green ship at H8 lost a point
of power, now on 3. Green collected 5 energy from the node at H8, and now has
21." Reversing the pair to preserve the literal "gains first" would separate
them for no reader's benefit.

### D8 — A fight asserts the opposite of what it used to

`placeInBay` stops zeroing, so both ships keep their power through a fight
(§7). `assertFightInvariants` — `ply.ts`'s existing bug-detector for what §7
guarantees — **gains a check that a returned ship's power is unchanged**. The
function is exactly the right home: it already pins that no ship is removed,
that no bystander moves, that both returned ships land in distinct bays that
were empty, and that no site changed state. "A fight never changes a ship's
power" is a §7 guarantee of the same kind, and it is cheap.

Note that the old reset was never asserted _there_ — it was asserted in
`ply.test.ts` alone. Adding the invariant is a small strengthening, deliberate,
and worth the four lines: it means any future path that resurrects a reset
fails loudly at the seam rather than quietly in a game.

### D9 — What the end-of-turn clauses say

The existing clause shapes are kept, with the words changed. This is a
deliberately small diff: the grouping logic, the "name the ones that hit the
limit" behaviour and the sentence skeletons are all proven and none of them
needs to move.

Gained (a dormant site **or** a bay — the clause never names which):

- one ship, below the cap: `Green ship at A2 gained a point of power, now on 2.`
- one ship, at the cap: `Green ship at A2 gained a point of power, reaching the
maximum of 4.`
- several: `Green ships at A2 and K5 each gained a point of power.` followed,
  when any reached the cap, by `A2 and K5 reached the maximum of 4.`

Lost (a charged node):

- one ship, above the floor: `Green ship at H8 lost a point of power, now on 3.`
- one ship, at the floor: `Green ship at H8 lost a point of power, reaching 0.`
- several: `Green ships at H8 and K5 each lost a point of power.` followed, when
  any reached 0, by `H8 and K5 reached 0.`

"A point of power" rather than "a power": power is a level, not a countable
object (the same reason **D10** exists), and "gained power" alone would not say
how much. "The maximum of 4" mirrors today's "the cap of 4" without calling a
full ship capped, which now reads as a good thing rather than a limit reached.

### D10 — The square label reads "power N of 4"

`squareLabel`'s occupant segment becomes **`power 3 of 4`** — so a full square
reads `H8, green ship, power 4 of 4` and a drained one `H8, green ship, power 0
of 4`.

Why this shape:

- It reads as a **level**, not a count of objects, which is what the story asks
  for. "3 powers" is nonsense and "3 power" reads like a quantity of a
  substance.
- It carries the scale, which the four-slot gauge shows visually and a listener
  otherwise has to know. That is new information, gained for free.
- It kills the singular/plural branch (`1 shield` / `2 shields`) outright — one
  fewer thing for the label to get right.
- It preserves the property the module's comment calls out and must keep: the
  number is stated **even when it is zero**, so a listener hearing one square at
  a time can tell a drained ship from an app that never reports power at all.

Rejected: `3 shields`-shaped `3 power` (reads as a mass noun, and 1 vs 4 gives
no sense of scale); `power level 3` (longer, and "level" is already the site
status's field name in the code — a needless echo); `at 3 power` (a preposition
inside a comma-separated segment list reads oddly when the segments are read
back-to-back).

### D11 — The move sentence keeps the bay, loses the claim

Today a move into a bay reads `Red ship moved from A11 into the A10 bay and
lost its shields.`, and the branch is keyed on the `shields-reset` effect that
step 5 deletes.

The replacement keeps the bay: `Red ship moved from A11 into the A10 bay.`, with
the branch keyed on `isBay(event.to)` from `src/rules/bays.ts` instead of on an
effect. Any other move reads exactly as it does today.

Deleting the branch entirely and letting a bay move read `moved from A11 to
A10.` was considered. Naming the bay is worth keeping now more than it was
before: a bay is where a ship recovers, and the end-of-turn clause that follows
in the same announcement says the ship gained a point of power without saying
why. The bay mention supplies the why. `announcements.ts` already imports from
`src/rules/energy.ts` and `src/rules/gameLength.ts`, so reading a board fact
directly rather than via an effect is in keeping with the module.

### D12 — The out-of-range rejection explains reach the right way up

`target-out-of-range` today reads: "…so shields shorten its reach — a ship with
four shields can only strike one square up, down, left or right."

It becomes: `${square} is out of attack range. A ship attacks as far as it
moves, so a drained ship barely strikes at all — a ship at 0 power can only
strike one square up, down, left or right.`

Same fact, stated from the end a player now cares about. No other rejection
sentence changes.

### D13 — `seededReplay.test.ts` has nothing recorded to re-record

The story anticipates re-recording this test's expectations. **There are none.**
The file plays two games and compares them against _each other_; the only
externally-fixed facts in it are:

- two seeds (`20260819`, `20260820`) and a length (40 rounds);
- three non-vacuity thresholds — at least 10 fights, at least 10 bay returns, at
  least 10 charged sites;
- the claim that those two seeds produce **different** bay and charged-site
  sequences.

So "re-recording" means: **run it, and confirm those still hold.** Steps 3 and 5
change what games these seeds produce, so all four claims are re-established by
running the suite, not by editing a literal. If a threshold stops being met or
the two seeds happen to coincide, do what the file's own comment already
instructs — pick another seed or another pair — and record the change and the
reason in that step's Notes. **Do not lower a threshold** to make it pass; a
threshold that can no longer be met means the policy stopped producing fights,
which is a finding, not a nuisance.

Step 2 is different and stricter: because the reskin moves no game (**D3**),
this file must pass **unedited** apart from nothing at all — it names no ship
field — and any diff in its behaviour is a bug in the reskin.

### D14 — The bay's end-of-turn gain lands before the instant refill is removed

Steps 4 and 5 are two halves of one rule change and could go in either order.
They are split because they have separate verification points — one is an
end-of-turn effect, the other is what `applyMove` does — and ordered
gain-before-removal because the additive half is independently verifiable
(`endOfTurn.test.ts` proves a ship in a bay gains a point, capped at 4, with no
energy effect) and because the intermediate commit is then always a playable
game. The other order would put a commit on the branch where a bay gives a ship
nothing and a beaten ship has no way back to full power — the hole the story
exists to avoid, briefly reintroduced.

### D15 — `MoveEffect` collapses, and keeps its name

With the reset gone, `MoveEffect` has no member of its own; it becomes an alias
for `EndOfActionEffect`. Keep the name and its doc comment: every caller
(`session.ts`, `announcements.ts`, the tests) speaks in terms of a move's
effects, and the alias is the seam where a future move-specific effect would
land. Do not collapse call sites onto `EndOfActionEffect`.

### D16 — Nothing in the energy machinery learns about bays

A ship in a bay collects nothing and pays nothing. `chargedNodesHeldBy` and
`dormantSitesOccupiedBy` iterate the seventeen **sites**, and a bay is not one,
so this is already true with no edit. It is written down here because "a bay
now behaves like a dormant site for power" invites the thought that it should
behave like one for energy too, and it must not: §3.1 gives the bay's recovery
**without a dormant site's energy penalty**, and that asymmetry is the point of
the change.

---

## Step 1 — Rules 0.17: power replaces shields, a fight keeps it, a bay restores it

Status: committed

Notes: Edited `rules.md` (§1, §2, §3.1, §4 closing line, §4.1, §5, §6, §7,
§7.2, §8.1, §8.2, §8.5, §8.6) per the plan, bumped the version line to 0.17,
added one `## 0.17` changelog entry covering all three changes, and bumped
`RULES_VERSION` to `"0.17"`. `grep -in "shield" doc/ruleset/rules.md` returns
nothing; `git status` shows only `doc/ruleset/rules.md`,
`doc/ruleset/changelog.md` and `src/rules/rulesVersion.ts` changed. No
deviation from the plan. `npm run format:check` reports a pre-existing,
unrelated warning on `doc/plan/00000041-spaceship-charge-changes/story.md`
(not modified by this step, not in `git status`), left untouched as out of
scope.

Edit `doc/ruleset/rules.md`, add **one** `doc/ruleset/changelog.md` entry
covering all three changes, and bump `RULES_VERSION` in
`src/rules/rulesVersion.ts` to `"0.17"`. **No behaviour changes in this step** —
no file under `src/` other than `rulesVersion.ts` is touched. See **D1** for why
this is its own commit and how far behind the document the code then runs. **Do
not tag anything** (`CLAUDE.md`: tagging is on hold).

Read the whole of `rules.md` before editing. This change touches thirteen
sections and they cross-reference each other heavily.

**No section is renumbered.** §4.1 keeps its number and gains a new heading;
nothing is added or deleted at section level.

### The version line

`**Rules version: 0.16**` becomes `**Rules version: 0.17**`.

### §2 gains "Power"

A new entry in the word list, in the list's existing plain-language,
alphabet-free style: **Power** — what a ship carries and what lets it move: how
far it can go, and what a node takes from it while it stands there. Place it
where it reads best among the existing entries (the list runs Turn, Round,
Action, Site, Node, Capacity, Drain, Pressure — power belongs with the ship
words, not the site words).

### §3.1 Bays — the stripping bullet becomes a recovery bullet

A bay stays an ordinary square in every way except two, and the first exception
(a ship in a bay cannot attack and cannot be attacked) is unchanged. The second
becomes: a ship standing in a bay **at the end of its owner's turn** gains
**one power**, to the maximum of 4 (§4.1). Say the three things a player will
otherwise get wrong:

- flying over a bay does nothing — only standing in one at the end of the turn
  counts;
- arriving in one does nothing by itself either; the first point comes at the
  end of that turn like any other;
- a bay is where a ship goes to recover, at a point per turn.

"Bays are not owned. Either player's ships may use any bay." is unchanged.

### §4's closing line

"Every ship starts with 0 shields." becomes **"Every ship starts at full power
(4)."**

### §4.1 — rewritten as "Power"

The heading becomes `### 4.1 Power`. The section says, in this order:

- A ship carries between **0 and 4 power**.
- Power is **what lets it move**: each point unlocks a further option in §6's
  table, and with it a further option for its attack range (§7).
- It does **nothing in a fight**.
- A ship **loses one power** at the end of its owner's turn standing on a
  **charged node** — the node is drawing on the ship as it pays out — down to
  the minimum of 0.
- A ship **gains one power** at the end of its owner's turn standing on a
  **dormant** site or **in a bay**, up to the maximum of 4.
- An **active** site does neither.
- A fight never changes a ship's power (§7).
- A ship at 0 power is not destroyed and is not stuck: it still has one square
  orthogonally, and a bay will refill it.

Nothing about stripping survives anywhere in the section.

### §5 — one clause

"an attack reaches only as far as the attacker's shields allow" becomes "as far
as the attacker's **power** allows". The rest of §5 is unchanged.

### §6 Movement — the table is re-keyed and its sentence flips

The lead-in changes from shedding to gaining: how far a ship may go depends on
how much power it carries; each point unlocks a further option, and the options
accumulate as power rises.

| Power | Movement                                   |
| ----- | ------------------------------------------ |
| 0     | one square orthogonally                    |
| 1     | the above, plus one square diagonally      |
| 2     | the above, plus two squares orthogonally   |
| 3     | the above, plus two squares diagonally     |
| 4     | the above, plus three squares orthogonally |

The sentence after it flips with it: a ship at **full power** has **twenty**
squares it can reach, and a ship at **0 power** has **four**. "The path must be
clear" and the moving/attacking separation are unchanged.

### §7 Combat — stops stripping

- The two range extremes flip: a ship at **0 power** reaches only one square
  orthogonally and cannot strike a diagonal at all, while a ship at **full
  power** reaches three squares orthogonally.
- "**There is no winner.**" stays. Both ships are still returned to bays (§7.1)
  and both squares are still left empty, but each ship arrives carrying **the
  power it had**. Delete "stripped of every shield they carried" and delete the
  sentence saying a 4-shield ship and an unshielded one come out of a fight
  identically — they no longer do.
- The **trade** paragraph is reworded: an attack spends the attacker's own
  **position** — not its power — to take away its opponent's. Keep the rest of
  the paragraph's advice (worth making when the enemy ship stands better than
  the attacker's own).
- The bay and charged-node protections, and the two paragraphs about what
  follows for nodes, are unchanged.

§7.1 needs no edit — it is about which bay, not about what arrives.

### §7.2 Returning by choice — stops stripping too

A ship may still go back to a bay deliberately as an ordinary move. "The ship
loses all its shields on arrival" becomes: what it gets there is recovery at a
point per turn (§3.1, §4.1), not an instant refill.

### §8.1, §8.2 and §8.5 — follow

- §8.1's **charged** bullet: a ship standing on a node collects energy (§8.4)
  and the node **takes power from it** (§4.1) as it pays out.
- §8.1's **dormant** bullet: costs energy (§8.4) and **gives power back**
  (§4.1) at the end of each of that player's turns. Keep the fact that it costs
  energy; the power movement is now a gain, so the bullet no longer reads as two
  costs.
- §8.2's "starts gaining shields (§4.1)" becomes the drain: a ship on a site
  that is charged under it collects and **starts losing power** at the end of
  its owner's next turn, exactly as if it had moved onto a node.
- §8.5's three-state comparison says which way each state moves a ship's power:
  active neither, charged takes, dormant gives (and charges energy for it).

### §8.6 — step 1 and the passed-turn paragraph

Step 1 becomes: each of the moving player's ships standing on a charged node
**loses** a point of power, and each standing on a dormant site **or in a bay**
gains one (§4.1). The closing paragraph about a passed turn follows: a ship of
the passing player standing on a charged node still loses its point and one on a
dormant site or in a bay still gains one. Steps 2 to 6 are unchanged, and the
ordering rationale at the end of the section is unchanged.

### §1 Overview — follows all of it

- A ship carries **power**, which is what lets it move.
- Holding a node pays energy and **drains** the ship, so the longer a ship holds
  a node the slower it becomes and the harder it is to leave — the same tension
  as before, said the right way up.
- A fight pushes both ships back to bays **without changing what they carry**.
  Keep "Ships are never destroyed" and the node refuge.
- A bay is where a drained ship **recovers**, a point per turn.
- A site that has burned out still costs energy — but it now **gives power
  back**, so the "bad place to leave a ship" sentence needs re-reading rather
  than re-signing: it costs energy, and it is where a ship pays energy for the
  recovery a bay gives free of charge.
- The three random elements are unchanged.

### The changelog

Add **one** `## 0.17 — …` entry at the top of `doc/ruleset/changelog.md`, in the
shape the existing entries use: a short title covering all three changes, a line
saying it is a gameplay change and that tagging stays on hold, then bullets for
the substantive changes — the reskin (with `power = 4 − shields` stated
explicitly, and that no number, threshold or reachable square moves), a fight
leaving power alone, and a bay restoring a point a turn instead of refilling.
Say why the three land together (the second opens a hole the third fills). Say
explicitly **why the word is power and not charge** — the collision with charged
sites and the charge draw. **Do not rewrite older entries**: they describe the
game as it was under their own versions and must go on saying "shields".

### Formatting

`rules.md` and `changelog.md` are covered by `npm run format:check`. Run
`npx prettier --write` on both after editing. Watch for a wrapped line that
begins with a digit followed by a full stop — Markdown reads that as an ordered
list item and Prettier will rejoin it — and choose break points that avoid it.

Depends on: nothing.

Verification (automated): `npm test` passes — `rulesVersion.test.ts` reads the
version line straight out of `rules.md` and also checks the changelog has an
entry for it, so a mismatch fails there. `npm run typecheck`, `npm run lint` and
`npm run format:check` pass. `git status` shows exactly `doc/ruleset/rules.md`,
`doc/ruleset/changelog.md` and `src/rules/rulesVersion.ts` changed, and nothing
else. `grep -in "shield" doc/ruleset/rules.md` returns **nothing**. A
read-through of §1, §3.1, §4.1, §6, §7 and §8.6 confirms no sentence anywhere in
the document calls the number a shield, says a fight strips it, or says a bay
refills it at once.

---

## Step 2 — The reskin: power replaces shields, everywhere, at once

Status: committed

Notes: The rename and inversion are complete across all twelve source files
and eighteen-plus test files (plus `power.ts`/`power.test.ts` and
`powerGauge.ts`/`powerGauge.test.ts` renamed from their `shields`/
`shieldGauge` originals). `grep -rin "shield" src/` returns nothing.

**Plan defect found and corrected mid-step.** The plan as first written
mandated that `applyMove` and `placeInBay` write a literal `0` for a ship
ending in a bay or returning from a fight, and called this "knowingly the
wrong game for three commits." That contradicted **D3** (the reskin moves no
game), **D4** (the conversion rule `power = 4 - shields` applies to every
literal, including these two: the old code wrote `shields: 0`, a _fully
mobile_ ship, so the faithful conversion is `MAX_POWER`, not `MIN_POWER`) and
**D13** (`seededReplay.test.ts` must pass unedited at this step, with any
diff in its behaviour treated as a bug in the reskin). Implementing the plan
as first written left `seededReplay.test.ts`'s non-vacuity case short (7
fights against a threshold of 10, seed 20260819/40 rounds); a controlled A/B
run (`playSeededGame` against the pre-story code, this step's code as first
written, and this step's code with the bay/fight reset patched to
`MAX_POWER`) gave 13 / 7 / 13 fights, isolating the entire divergence to that
one literal and proving the rest of the reskin — reach included — moved
nothing. Reported to the orchestrator rather than resolved unilaterally
(fixing it required either softening `ply.ts` against the plan's explicit
"do not try to soften it here," or editing a test D13 said must stay
unedited — not a call to make alone); the orchestrator resolved it in favour
of D3/D4/D13, corrected the plan text (`ply.ts`'s bullet, the announcements
bullet, and D1's step-2 behaviour-table row, which now reads "0.16 exactly,
in 0.17's units" with no wrong-game window), and this step was finished on
that corrected basis: `applyMove` writes `power: endsInBay ? MAX_POWER :
ship.power`, `placeInBay` writes `power: MAX_POWER`, the `power-reset` effect
fires on `power < MAX_POWER` (the mirror of the old `shields > 0`), and the
two announcement sentences say what the reset now does ("… into the A10 bay
and refilled to full power." / "… both back to full power.") rather than
carrying the false "lost its power" / "both with no power" wording a
mechanical rename would have left behind.

The D3 reach comparison (`reachFrom` at `H8`, `A1`, `A8` for shields
4,3,2,1,0 against power 0,1,2,3,4) is byte-for-byte identical, entry order
included — confirmed with a throwaway script outside the repo, per the
step's verification — so the reach table's re-keying is provably a pure
reskin. `movement.test.ts`'s expected destination-square literals are
byte-identical to before (only the `shields`→`power` identifiers and the
input values changed).

`npm test` passes in full (770/770), `seededReplay.test.ts` **unedited** —
back to 13 fights, as the A/B run predicted, and both other cases in that
file (exact replay from the same seed, divergence from a different one)
hold. `fullGame.test.ts` passes unedited. `npm run typecheck`, `npm run
lint` and `npm run format:check` all pass.

Rename the ship's number to **power** and invert its polarity throughout the
app and its tests, in **one** commit. `power = 4 − shields` exactly; no branch
is added or removed, no geometry changes, and **no game moves** (**D3**). Read
**D2** for why this cannot be split, **D4** before touching a single test
fixture, and **D6** before touching `endOfTurn.ts`.

### The rules layer

- **`src/rules/shields.ts` → `src/rules/power.ts`**, with `ShieldCount` →
  `PowerLevel`, `MIN_SHIELDS` → `MIN_POWER`, `MAX_SHIELDS` → `MAX_POWER`,
  `isShieldCount` → `isPowerLevel`. Same 0–4 range, same guard, same shape;
  the module comment describes §4.1's range in the new terms.
  `shields.test.ts` → `power.test.ts`, unchanged in substance.
- **`src/rules/fleet.ts`** — `FleetEntry.shields` → `FleetEntry.power`, and
  `startingFleet` builds every ship at `MAX_POWER` rather than `0`. Its doc
  comment says every ship starts at full power.
- **`src/rules/gameState.ts`** — `Ship.shields` → `Ship.power`, and
  `shipsFrom`'s record entry follows.
- **`src/rules/movement.ts`** — `ReachOption.unlockedAtShields` →
  `unlockedAtPower`; `REACH_OPTIONS` re-transcribed from §6's new table,
  ascending; the skip inverts so an option is kept when its figure is at or
  **below** the ship's power. `reachFrom(origin, power)` keeps its signature
  shape. `moveRefusalReason` and `legalDestinations` pass `ship.power`. **The
  order of the five options must stay orthogonal-1, diagonal-1, orthogonal-2,
  diagonal-2, orthogonal-3** (**D3**).
- **`src/rules/combat.ts`** — the two `reachFrom(attacker.square,
attacker.shields)` call sites and the comments around them.
- **`src/rules/endOfTurn.ts`** — `ShieldGainedEffect` / `ShieldLostEffect`
  become `PowerGainedEffect` (`"power-gained"`) / `PowerLostEffect`
  (`"power-lost"`), each carrying `power` in place of `shields`, and **step 1's
  two branches swap which site they fire on**: charged now loses (floored at
  `MIN_POWER`), dormant now gains (capped at `MAX_POWER`). The bay case is
  **not** part of this step — it lands in step 4. Update the step-1 comment and
  the `EndOfTurnEffect` union.
- **`src/rules/ply.ts`** — `FightShip.shields` → `FightShip.power`,
  `toFightShip`, and every doc comment that describes shields. `applyMove`
  still resets a ship that ends in a bay and `placeInBay` still resets a
  returning ship, and the value they write is **`MAX_POWER` (4)**. **D4**'s
  conversion rule applies here exactly as it applies everywhere else: the old
  code wrote `shields: 0`, which was a **fully mobile** ship, and `4 − 0` is 4.
  Writing `MIN_POWER` would invert the behaviour rather than reskin it, moving
  games this step is required to leave exactly where they are (**D3**) — which
  is precisely what `seededReplay.test.ts` catches (**D13**). The old rule is
  still in force after this step, restated in the new units; steps 3 and 5 are
  what remove it. The `power-reset` effect therefore fires when the arriving
  ship had something to **gain** (`power < MAX_POWER`), the mirror of the old
  `shields > 0`. Rename the `"shields-reset"` `MoveEffect` member to
  `"power-reset"` so nothing in the codebase still says shield (step 5 deletes
  it outright).

  _Corrected by the orchestrator after the step's first attempt. The plan as
  written mandated `MIN_POWER` here and called it "knowingly the wrong game for
  three commits"; that contradicted D3, D4 and D13, and the implementing agent
  stopped rather than pick a side, which was the right call. There is no
  wrong-game window: after this step the app plays 0.16 exactly, in 0.17's
  units._

### The presentation layer

- **`src/board/squareLabel.ts`** — `SquareOccupant.shields` →
  `SquareOccupant.power`, and the occupant segment becomes **`power N of 4`**
  per **D10**, dropping the singular/plural branch. Update the module comment,
  including the sentence about stating the number even when it is zero.
- **`src/board/Board.tsx`** — the occupant descriptor it builds from
  `ship.power`.
- **`src/board/BoardSquare.tsx`** — the `ShipModel` prop it feeds.
- **`src/ships/shieldGauge.ts` → `src/ships/powerGauge.ts`** —
  `gaugeSlots(power)`, with the comment describing a power gauge. The geometry
  and the "first `n` of four lit" behaviour do not change: feeding it `power` is
  the whole of the reversal on screen. `shieldGauge.test.ts` →
  `powerGauge.test.ts`.
- **`src/ships/ShipModel.tsx`** — the optional `shields` prop becomes `power`,
  the import moves to `./powerGauge` and `../rules/power`, and the module
  comment describes a power gauge.
- **`src/ships/shipArt.ts`** — `GAUGE_SLOT_COUNT` keeps its name and value; only
  its comment changes.
- **`src/board/announcements.ts`** — `shieldGainedClause` / `shieldLostClause`
  become `powerGainedClause` / `powerLostClause` with the wording from **D9**,
  and the clause **order is preserved** so the charged-node (loss) clause comes
  first (**D7**). The move sentence's bay branch stays for now — the
  reset is still in force this commit — but its tail has to state what the
  reset now does: `… into the A10 bay and refilled to full power.` Step 5
  removes the branch wholesale. The fight sentence's "both with no shields"
  becomes "both back to full power" for the same one commit; step 3 rewrites
  it. Neither tail may be left as a mechanical rename ("lost its power", "both
  with no power"): under the flip those sentences are simply false. The out-of-range rejection
  takes its final wording from **D12** now, since it is a statement about reach
  and reach is settled by this step.

### The tests

Every test file in the table above. Apply **D4**'s conversion rule mechanically
and then re-read the prose: test names, comments and expected label strings that
describe a mobility all have to flip too. Two specific ones to get right:

- `src/rules/movement.test.ts` — the inputs convert, and **every expected
  destination-name list must stay exactly as it is**. If an expected list
  changes, the reskin is wrong.
- `src/board/Board.test.tsx` — the case asserting the number of lit gauge slots
  across the starting fleet now expects **four per ship**, since every ship
  starts at full power.

Depends on: Step 1 (the document this implements).

Verification (automated):

1. Before editing, capture today's reach: write a throwaway script **outside the
   repository** (use a scratch directory, not the working tree) that prints
   `reachFrom`'s destination names, in order, from `H8`, `A1` and `A8` for
   shields 4, 3, 2, 1, 0 in that order. After editing, run the equivalent for
   power 0, 1, 2, 3, 4 in that order and diff the two outputs: they must be
   **identical, entry order included** (**D3**). Delete the script; commit
   neither it nor its output.
2. `npm test` passes in full. In particular `src/rules/seededReplay.test.ts` and
   `src/rules/fullGame.test.ts` pass **with no change to any expectation** — the
   reskin moves no game.
3. `git diff src/rules/movement.test.ts` shows no changed expected-square
   literal — only renamed identifiers and converted inputs.
4. `npm run typecheck`, `npm run lint`, `npm run format:check` pass.
5. `grep -rin "shield" src/` returns **nothing**, and `git status` shows no
   leftover `shields.ts`, `shields.test.ts`, `shieldGauge.ts` or
   `shieldGauge.test.ts`.

---

## Step 3 — A fight leaves both ships' power alone

Status: committed

Notes: `placeInBay` no longer writes `MAX_POWER`; it places a ship without
touching its power. `applyAttack`'s and `placeInBay`'s doc comments, and the
module header comment, now say a returning ship keeps the power it had.
`assertFightInvariants` gained a check that each returned ship's power is
unchanged between `before` and `after`, with a new `ply.test.ts` case
constructing a violation and confirming it throws. `announcements.ts`'s
`fightSentence` now reads "…both keeping the power they were carrying." in
place of "both back to full power.", and its doc comment follows.
`ply.test.ts`'s parameterised fight case now asserts each ship's returned
power equals its pre-fight power (not 4), and two further fight-power
assertions elsewhere in the file (one attacker/defender pair that previously
expected 4/4) were corrected to the ships' actual pre-fight values (2 and 4)
— these were latent bugs in step 2's fixture conversion, not something this
step's plan text called out, but they fell out of the same power arithmetic
this step exists to fix and left them asserting the old reset behaviour if
untouched. `announcements.test.ts`'s five fight-sentence expectations
updated to the new wording. No other deviation from the plan.

`npm run typecheck`, `npm run lint` and `npm run format:check` all pass.
`npm test` passes in full (771/771). `seededReplay.test.ts` passes unedited:
its three non-vacuity thresholds (>=10 fights, >=10 bay returns, >=10
charged sites over 40 rounds) still hold and its two seeds still produce
diverging bay and charged-site sequences, confirming D13 — the games these
seeds produce legitimately changed at this step and nothing in the file
needed editing to accommodate that.

Implement §7's change: both ships in a fight are still returned to bays drawn at
random (§7.1) and both squares are still left empty, but **each ship arrives
carrying the power it had**.

- **`src/rules/ply.ts`** — `placeInBay` places a ship without touching its
  power. `applyAttack`'s doc comment stops saying "placed at 0 shields in a
  bay" and says what now happens. `assertFightInvariants` gains a check that
  each returned ship's power is **unchanged** between `before` and `after`,
  throwing with a message in the style of its neighbours and citing §7
  (**D8**).
- **`src/board/announcements.ts`** — `fightSentence` stops claiming the ships
  arrived empty. It says what is now true without becoming a paragraph:
  `… and both were beaten. The attacker returned to the D15 bay and the
defender to the A2 bay, both keeping the power they were carrying.` The
  opening half of the sentence (who attacked whom, from where) is unchanged.
- **`src/rules/ply.test.ts`** — the parameterised fight case that asserts both
  ships come home at 0 now asserts each ship's power is exactly what it was
  before the fight, across the same mixed pairs (4 against 0, 2 against 2, and
  whatever other pairs the case already covers). The `FightShip` snapshot
  expectations follow. Any case elsewhere in the file asserting a post-fight
  zero asserts the carried-over value instead.
- **`src/board/announcements.test.ts`** — the fight sentence's expected string.

`applyMove` still resets a ship that ends in a bay after this step; that is step
5's work.

Depends on: Step 2 (`Ship.power`, `FightShip.power` and the renamed effects
exist).

Verification (automated): `npm test` passes. `ply.test.ts` proves a fight
between a ship at 4 power and a ship at 0 power returns both with exactly those
values, and that `assertFightInvariants` throws when handed a hand-constructed
after-state in which a returned ship's power changed (the function is exported
for precisely this kind of test). `announcements.test.ts` proves the new fight
sentence. `seededReplay.test.ts` still meets its three non-vacuity thresholds
and its two seeds still diverge — see **D13**; the games these seeds produce
legitimately change here, and nothing in the file is edited to accommodate that.
`npm run typecheck`, `npm run lint` and `npm run format:check` pass.

---

## Step 4 — A bay restores a point of power at the end of its owner's turn

Status: committed

Notes: `endOfTurn.ts` step 1's gain branch now reads `(siteState ===
"dormant" || isBay(ship.square)) && ship.power < MAX_POWER`, raising the
same `power-gained` effect (D5); the step-1 comment now names the bay case
and cites §3.1/§3.2. `announcements.ts` needed no change — its existing gain
clause and comment were already cause-agnostic — confirmed by reading it and
by the new passing test. Added five new cases to `endOfTurn.test.ts` (a
hand-built ship in a bay gains a point; a ship already at 4 in a bay gains
nothing and raises no effect; no `energy-collected`/`energy-penalty` effect
and no energy-total change for a ship in a bay; a ship of the other side in
a bay gains nothing that turn; a bay gain and a node loss in the same ply
both fire, in fleet order) and one case to `announcements.test.ts` proving
the gain clause reads the same way for a bay square as for a dormant site.
Per the step's own note, ships were placed in bays below full power by
hand-built state rather than by moving them there, since `applyMove`'s
instant refill (removed only in step 5) would otherwise leave nothing for
the new rule to give.

**Deviation, not in the plan's step-4 checklist but required to keep the
suite green:** because `ACTIONS_PER_PLY` is 1, `applyAttack` always runs
`runEndOfTurn` within the same call (it is always the ply's last action), so
five pre-existing `ply.test.ts` cases that send a ship into a bay below full
power as the _moving_ side's ship now legitimately observe that ship gaining
a point in the same call, immediately after the fight — the very interaction
step 6's `recovery.test.ts` is planned to pin. Updated those cases' expected
power values and effect lists to the new, correct behaviour (the fight
itself still leaves both ships' power exactly as it found them, asserted via
the unchanged `fight-resolved` snapshot; the subsequent end-of-turn step
then gives the moving side's returned ship its point, never the non-moving
side's). This is a consequence of implementing the rule correctly, not a
change of the rule; recorded here because the plan's step-4 test list named
only `endOfTurn.test.ts` and `announcements.test.ts`.

`npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
(777/777) all pass.

Implement §3.1's and §8.6 step 1's new bay case: a ship of the moving side
standing **in a bay** at the end of its owner's turn gains one power, to the
maximum of 4, with **no energy consequence of any kind** (**D16**).

- **`src/rules/endOfTurn.ts`** — step 1's gain branch widens from "on a dormant
  site" to "on a dormant site **or** in a bay", using `isBay` from
  `src/rules/bays.ts`. It stays **one** condition on an existing branch in the
  existing single pass over the moving side's fleet, raising the **same**
  `PowerGainedEffect` (**D5**); no new effect type, no new step, no second pass.
  A bay and a site can never be the same square (§3.2), so the branch chain
  stays as it is. Update the step-1 comment to name the bay case and cite §3.1.
- **`src/board/announcements.ts`** — no code change is expected: the gain
  clause from **D9** never names the cause, so it is already true of a bay.
  Confirm that by reading it; if it says anything a bay makes false, fix it here.
- **`src/rules/endOfTurn.test.ts`** — new cases: a ship in a bay at the end of
  its owner's turn gains one point and raises one `power-gained` effect naming
  the bay square; a ship already at 4 in a bay gains nothing and raises no
  effect; **no** `energy-collected` and **no** `energy-penalty` effect is raised
  for a ship in a bay; a ship of the _other_ side sitting in a bay gains nothing
  on this turn; and a ship in a bay and a ship on a charged node in the same ply
  produce one gain and one loss, in fleet order.
- **`src/board/announcements.test.ts`** — one case proving the gain clause reads
  correctly for a bay square.

The instant refill on arrival is still in `applyMove` after this step; step 5
removes it. The overlap is harmless and deliberate (**D1**, **D14**).

Depends on: Step 2 (the `power-gained` effect and `MAX_POWER` exist).

Verification (automated): `npm test` passes, including the new
`endOfTurn.test.ts` cases above. `npm run typecheck`, `npm run lint` and
`npm run format:check` pass.

---

## Step 5 — Ending a move in a bay no longer refills a ship

Status: committed

Notes: `applyMove` no longer writes a power value for the moving ship at
all — it now just carries `square: destination` forward, dropping the
`endsInBay`/`MAX_POWER` branch and the `"power-reset"` effect it pushed;
`MoveEffect` is now a plain alias of `EndOfActionEffect`, keeping its name
and doc comment (D15). The module header and `applyMove`'s own doc comment
were reworded to say a ship in a bay recovers through the end-of-turn
sequence, not on arrival. `announcements.ts`'s `moveSentence` now keys the
bay wording on `isBay(event.to)` (imported from `rules/bays.ts`) instead of
on the deleted effect, per D11 — `"… moved from A11 into the A10 bay."`
with no claim about power. `ply.test.ts`'s reset case was replaced by one
case proving a ship keeps the power it had whether it ends a move in a bay
or only flies over one, and the "nothing to lose" case was removed with the
effect it existed for. `announcements.test.ts`'s two bay-move cases lost
the `power-reset` effect from their fixtures and now expect the new
sentence; the "ship already at full power" case collapses into the same
expectation as the plain bay-arrival case, since the wording no longer
depends on power at all.

**Deviation, required by the collapse of `MoveEffect` to `EndOfActionEffect`
(D15), not called out in the plan's step-5 checklist:**
`src/board/EnergyOverlay.tsx`'s `settlementsForEvent` read `event.effects`
on the combined `event.type === "moved" || event.type === "attacked"`
branch and called `.find()` on it directly. Once `MoveEffect` became
structurally identical to `EndOfActionEffect` (a member of `AttackEffect`),
TypeScript widened `event.effects`'s type for that branch and the
type-predicate narrowing on the two `.find()` calls stopped applying,
failing typecheck (`Property 'endOfTurn' does not exist on type '... |
FightResolvedEffect'`). Fixed by extracting the shared `.find()` logic into
a new `endOfActionSettlements` helper taking a single, concretely-typed
`readonly (PassEffect | PlyEndedEffect | FightResolvedEffect)[]` parameter,
which sidesteps the union-of-array-types narrowing gap; no behaviour
changed, confirmed by `EnergyOverlay.test.tsx` passing unedited.

**Second deviation, in the new `ply.test.ts` case only:** isolating "the
move itself does not refill" from the same-call end-of-turn gain (per the
orchestrator's brief: `applyMove` runs the end-of-turn sequence in the same
call when it is the ply's last action, since `ACTIONS_PER_PLY` is 1)
required `actionsRemaining: 2` in the fixture. That alone was not enough:
with a single green ship, `applyPassGuard` still ran the end-of-turn
sequence early, on the same side, because green had no further legal
action once its only ship had acted. Added a second, unmoved green ship
(`H8`) to both halves of the case so green still has a legal action after
the move, keeping the case a true isolation of `applyMove`'s own effect
with no end-of-turn interaction — not a change to what the case proves,
just what made it provable without the interaction step 6's
`recovery.test.ts` is planned to pin.

Remove the instant refill, which is the last piece of §3.1's old rule.

- **`src/rules/ply.ts`** — `applyMove` no longer writes a power value for a ship
  that ends in a bay: the ship simply arrives. The `endsInBay` branch and the
  `"power-reset"` effect it pushed both go, and `MoveEffect` collapses to an
  alias of `EndOfActionEffect` **keeping its name and doc comment** (**D15**).
  The module's header comment stops saying a move "loses its shields if it ends
  in a bay" and says what a bay does now, citing §3.1 and §4.1.
- **`src/board/announcements.ts`** — `moveSentence` drops the effect-keyed
  branch and keys the bay wording on `isBay(event.to)` instead, per **D11**:
  `Red ship moved from A11 into the A10 bay.` Every other move sentence is
  unchanged.
- **`src/rules/ply.test.ts`** — the reset cases go: "resets shields to 0 when a
  move ends in a bay" becomes a case proving a ship that moves into a bay
  **keeps** the power it had, and the "no reset effect for a ship with nothing
  to lose" case goes with the effect. The case proving a ship that only _flies
  over_ a bay is unaffected stays, with its expectation converted.
- **`src/board/announcements.test.ts`** — the two bay-move cases lose the
  effect from their fixtures and expect the new sentence; the case for a ship
  with nothing to lose collapses into the same expectation.

Depends on: Step 4 (a bay must already restore a point a turn before the instant
refill is removed, so the branch is never without a way for a ship to recover —
**D14**).

Verification (automated): `npm test` passes. `ply.test.ts` proves a ship at 2
power that moves into a bay is still at 2 power immediately after the move, and
that no move effect other than the end-of-action ones is produced.
`announcements.test.ts` proves a move into a bay reads as a plain move that
names the bay and claims nothing about power. `seededReplay.test.ts` still meets
its three thresholds and its two seeds still diverge (**D13**).
`npm run typecheck`, `npm run lint` and `npm run format:check` pass.

---

## Step 6 — Integration cover: the fight, the bay and the recovery, end to end

Status: committed

Notes: Added `src/rules/recovery.test.ts` with three integration tests driven
entirely through `applyMove`/`applyAttack`, in `camping.test.ts`'s style. The
first covers the plan's points 1, 2 and 4 together: a ship fought at 0 power
lands in a bay (via `applyAttack`), gains a point at the end of each of its
own side's turns — including the same call the fight itself closes out — and
never on the other side's, stopping at 4, with no energy effect and no
energy-total change throughout. The second covers point 3: a ship moves into
a bay via `applyMove` (proving arrival alone grants nothing — the first point
comes from that move's own end-of-turn step), recovers two points over two
more of its owner's turns, then leaves at exactly 2 power with `reachFrom`/
`legalDestinations` confirmed against the 2-power set rather than the full
one. The third covers point 5 directly: a 4-power attacker and a 0-power
defender are both returned unchanged (using an attacker already at the
maximum sidesteps the same-call recovery interaction entirely, so the
final-state powers equal the pre-fight ones with no need to reason about
timing), with both origin squares left empty. Each test was verified to
fail when the corresponding step's fix (3, 4 and 5 respectively) was
temporarily reverted locally, then restored, per the step's own
verification instruction; no diff from that exercise remains. No deviation
from the plan.

`npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
(779/779, all new tests included) pass.

Pin the story's thesis — that the only ways to recover power are time in a bay
and time on a dormant site — through the **public rules API** (`applyMove`,
`applyAttack`, `applyPassGuard` and the effects an action carries), not by
calling `runEndOfTurn` directly. `src/rules/camping.test.ts` is the model for
this style and its header comment is the model for the new file's.

Add **`src/rules/recovery.test.ts`** covering:

1. **A beaten ship recovers in its bay.** Two ships fight; the drained one
   arrives in a bay at the power it had (0), then gains a point at the end of
   each of its owner's turns — one, two, three, four — and stops at 4, staying
   there on the turn after.
2. **Never on the opponent's turn.** The ship in the bay gains nothing at the
   end of a ply played by the other side.
3. **Leaving early keeps what was recovered.** A ship that leaves a bay after
   two of its owner's turns leaves at 2 power, and its reach from the square it
   lands on is §6's 2-power set.
4. **A bay costs and pays no energy.** Across those turns neither side's energy
   total moves for the ship in the bay, and no `energy-collected` or
   `energy-penalty` effect names a bay square.
5. **A fight between two ships at different powers changes neither.** 4 against
   0 comes back 4 and 0; both squares fought from are left empty.

Where a case needs a specific bay draw, follow whatever fixture technique
`ply.test.ts` and `fullGame.test.ts` already use for seeded returns rather than
inventing a new one.

Depends on: Steps 3, 4 and 5 (all three behaviours must be in place).

Verification (automated): `npm test` passes with the new file. Each of the five
cases above fails if its behaviour regresses — check that by temporarily
reverting one of steps 3–5's edits locally if it is not obvious, then restoring
it. `npm run typecheck`, `npm run lint` and `npm run format:check` pass.

---

## Step 7 — `README.md`, and a sweep for anything the old framing left behind

Status: pending

`README.md` is player-facing (`CLAUDE.md`, Intended audience) and describes
shields in its overview and in both quoted-flavour passages. Bring it in line
with 0.17:

- **The overview paragraph**: a ship carries **power**, and power is what lets
  it move. Sitting on a node drains it, so the longer a ship holds one the
  slower it becomes and the harder it is to leave. A ship holding a node cannot
  be attacked while it holds it. A fight has no winner — both ships are pushed
  back to bays on the edge of the board **carrying what they had** — and ships
  are never destroyed.
- **The dead-site sentence**: a ship left sitting on a dead site costs its owner
  energy every turn, and gives it power back; a bay gives power back for free,
  at a turn per point.
- **Both quoted passages** in the status block: "a lit node pays a shield to the
  player sitting on it" is doubly wrong now (it takes, and it takes power);
  "costs its owner a shield and some energy" becomes energy paid and power
  returned; "stripped of every shield they carried" becomes both ships keeping
  what they carried; and add that a bay is where a ship recovers, a point per
  turn. Keep the passages' voice and length — they are a player's tour, not a
  rules summary.

Then sweep the repository for anything the old framing left behind, and fix
whatever the sweep finds in the working tree, in this commit.

Do **not** edit `doc/plan/**` (historical planning documents describe the game
as it was and stay as written) or `doc/ruleset/changelog.md`'s pre-0.17 entries
(same reason).

Depends on: Steps 1 to 6.

Verification (automated): `grep -rin "shield" README.md src/ doc/ruleset/rules.md`
returns **nothing**. `grep -in "shield" doc/ruleset/changelog.md` returns only
lines inside pre-0.17 entries, plus any deliberate mention inside the 0.17 entry
of what is being replaced. `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass. A read-through of `README.md` confirms no
sentence says a fight strips a ship, that a bay refills one at once, or that a
node gives a ship anything.

---

## Step 8 — Owner play-through

Status: pending

The owner plays the app and confirms the story's player-facing verification
list. This is the story's manual gate, and the only step the pipeline pauses for
a person on.

Run `npm run dev` in the dev container and open the app. Press PLAY at the
default settings (seven ships a side, thirty rounds) unless a shorter game is
more convenient for a particular check.

Confirm, in the app:

1. **A fresh game starts every ship at full power.** Every ship's gauge shows
   **four** lit slots, and every ship in a bay offers §6's full twenty-square
   range where the board allows.
2. **A charged node drains the ship holding it.** Park a ship on a lit node: its
   gauge loses a slot at the end of each of its owner's turns, reaching empty
   after four and staying empty, while it collects energy throughout. The
   announcement says power was lost and names the ship that reached 0.
3. **A dormant site restores it.** Park a ship on a dead site: its gauge gains a
   slot per turn to full and stays there, and the owner pays energy for it. The
   announcement says power was gained and names the ship that reached 4.
4. **An active site does neither.** A ship parked on an unlit site keeps the
   same gauge turn after turn.
5. **A drained ship still moves.** A ship at 0 power offers exactly four
   destinations — one square up, down, left and right — and refusing an
   out-of-range attack explains reach in terms of power.
6. **A fight leaves power alone.** Attack with a full-power ship against a
   drained one, and again the other way round. Both ships land in bays, both
   squares they came from are empty, **each gauge is exactly what it was**, and
   the announcement says both kept what they were carrying.
7. **A bay restores at a point a turn.** A ship that moves into a bay keeps the
   power it arrived with — the move announcement claims nothing else — then
   gains one slot at the end of that same turn and one at the end of each of its
   owner's turns after it, to four and no further, and never on the opponent's
   turn. No energy is collected or paid for it.
8. **Leaving a bay early leaves with what was recovered.** Move a ship out after
   two turns and confirm its reach is the two-power reach, not the full one.
9. **A beaten drained ship recovers.** After a fight, watch the drained ship
   refill in its bay a point at a time like any other.
10. **The gauge reads the way a gauge should.** Full is four lit slots and means
    a fast ship; empty means a slow one. Confirm nothing on screen still reads
    upside down.
11. **A whole game still finishes** — play or fast-forward to the end and
    confirm the result panel and the return to the start screen still work.

Depends on: Steps 1 to 7.

Verification (manual): the owner confirms each of the eleven observations above
in the running app and reports anything that reads wrong, looks wrong, or
contradicts `doc/ruleset/rules.md` at 0.17.
