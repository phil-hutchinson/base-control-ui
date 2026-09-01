# Implementation plan — 00000031 Ships may stay on any site

## What this story is

Two halves of one rule are deleted together:

- **A move may end anywhere a ship can reach.** Today §6 forbids ending a move
  on a site that is not charged. That restriction goes. Reach, a clear path
  and an empty destination square are the whole of the restriction on a move.
- **A ship on a site that is not charged owes nobody anything.** Today §8.5
  makes such a ship **stranded**: its owner must spend their next turn moving
  it clear, and while any ship owes that action every other action of the turn
  is refused. That obligation is deleted outright, and the word **stranded**
  leaves the document, the code and the UI.

Three consequences follow, and the story is mostly about getting them right:

- **A site can charge underneath a ship.** The end-of-turn charge draw does not
  look at occupancy. A ship parked on an active site is standing there when it
  lights, and is holding a node from that moment — it collects at the end of
  its owner's next turn and gains a shield, without ever having travelled to
  the node. Camping on a site that has built up pressure becomes a real thing
  to try.
- **Leaving a node still ends it (§8.7, unchanged).** What changes is the
  alternative: staying put is now always available, so spending a node by
  walking away is a genuine choice rather than the only way out of one.
- **A winning attacker's advance is limited by ships alone.** It stops for an
  occupied square and nothing else, so the ordinary case — taking the square
  the loser has left — now holds even when that square is not charged.

This is a **gameplay change**, so `doc/ruleset/rules.md` goes from version
**0.12** to **0.13**, with a `doc/ruleset/changelog.md` entry and a matching
`RULES_VERSION` bump, in its own commit ahead of any code (step 1). Tagging
stays on hold, per `CLAUDE.md`.

Beyond the rule itself, the story asks for a **structural** clean-up. The
two-layer split in `movement.ts`/`moveLegality.ts` and inside `combat.ts`
exists **because of** §8.5 — the obligation had to ask "does this ship have a
legal move?" without its own answer feeding back into the question. With §8.5
gone the only difference left between the layers is a game-over check, so the
split has lost its reason to exist and collapses (step 6).

### Vocabulary reminder for a cold reader (`CLAUDE.md`)

Planning documents and code say **ply**; `rules.md`, the UI and `README.md` say
**turn**. They are the same thing: everything one player does before play
passes, which in this game is one action (`ACTIONS_PER_PLY` is 1). **Site**,
**bay** and **action** are the same word everywhere. **Hub** is the code word
for what player-facing text calls a **node**, and a node is precisely a site
that is charged. A **site** is one of the seventeen fixed positions; its state
is `active`, `charged` or `dormant`.

### Settled decisions that are not to be re-opened

Both were decided by the repository owner before planning began:

1. **The charge draw ignores occupancy.** An active site with a ship parked on
   it can be charged under that ship. Excluding occupied sites from the draw
   was considered and rejected (see **D3**).
2. **All the stranded UI is removed outright** — no replacement marker, no
   substitute condition, nothing drawn in its place (see **D4**).

---

## Where the work lands

| File                               | What happens to it                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `doc/ruleset/rules.md`             | §6, §7, §8.1, §8.2, §8.3, §8.5, §8.6 edited; 0.12 → 0.13 (step 1)                                           |
| `doc/ruleset/changelog.md`         | New 0.13 entry at the top (step 1)                                                                          |
| `src/rules/rulesVersion.ts`        | `RULES_VERSION` → `"0.13"` (step 1)                                                                         |
| `src/rules/moveLegality.ts`        | Site-state check and two refusal reasons deleted (step 2); whole module folded away (step 6)                |
| `src/rules/movement.ts`            | Obligation dropped (step 3); absorbs `moveLegality.ts` (step 6)                                             |
| `src/rules/stranded.ts` + its test | Deleted (step 3)                                                                                            |
| `src/rules/combat.ts`              | Obligation and `another-ship-stranded` dropped (step 3); `winnerAdvance` (step 4); split collapses (step 6) |
| `src/rules/endOfTurn.ts`           | `ShipStrandedEffect` deleted and no longer raised (step 3)                                                  |
| `src/rules/actions.ts`             | Reads whatever the collapse leaves (step 3 comment, step 6 imports)                                         |
| `src/board/Board.tsx`              | `owes-action` condition and its `strandedShipIds` read deleted (step 3)                                     |
| `src/board/squareLabel.ts`         | `owes-action` leaves `ShipCondition` and the wording table (step 3)                                         |
| `src/board/BoardSquare.tsx`        | The chevron mark and the `owes-action` class deleted (step 3)                                               |
| `src/board/BoardSquare.css`        | The blink animation and its reduced-motion rule deleted (step 3)                                            |
| `src/board/announcements.ts`       | Two destination-site rejection sentences (step 2); the stranding clause and sentence (step 3)               |
| `README.md`                        | The two removed rules (step 7)                                                                              |

Tests touched, and by which step:

| Test file                         | Step(s) | Why                                                            |
| --------------------------------- | ------- | -------------------------------------------------------------- |
| `src/rules/movement.test.ts`      | 2, 3, 6 | Site refusals, the obligation, the layering test               |
| `src/rules/stranded.test.ts`      | 3       | Deleted with its module                                        |
| `src/rules/combat.test.ts`        | 3, 4, 6 | `another-ship-stranded`, `winnerAdvance`, the seven-only layer |
| `src/rules/endOfTurn.test.ts`     | 3       | The `ship-stranded` effect                                     |
| `src/rules/ply.test.ts`           | 3, 4    | A `strandedShipIds` import, an advance held by a site          |
| `src/rules/actions.test.ts`       | 3       | Two obligation cases                                           |
| `src/rules/chargeDraw.test.ts`    | 3       | A `strandedShipIds` assertion                                  |
| `src/rules/fullGame.test.ts`      | 6       | Its two "legal a moment earlier" helpers                       |
| `src/game/session.test.ts`        | 2       | Two destination-site rejections                                |
| `src/board/announcements.test.ts` | 2, 3    | Rejection sentences and the stranding clause                   |
| `src/board/Board.test.tsx`        | 3       | The whole `owes-action` group                                  |
| `src/board/BoardSquare.test.tsx`  | 3       | The chevron and blink assertions                               |
| `src/board/squareLabel.test.ts`   | 3       | The `owes-action` wording                                      |
| new cover                         | 5       | Camping, end to end                                            |

Deliberately **not** touched:

- **`src/rules/chargeDraw.ts`.** It already draws occupied active sites like
  any other, and already has a test saying so. The story's "a site charges
  under a ship" is therefore a documentation and test-cover change, not a code
  change (**D3**).
- **`src/rules/vacating.ts` and §8.7.** Leaving a charged node still ends it,
  on exactly today's terms.
- **`src/rules/sites.ts`, `src/rules/energy.ts`, `src/rules/shields.ts`,
  `src/rules/bays.ts`, `src/rules/gameLength.ts`.** No number moves: no drain,
  recovery, pressure, capacity, energy, shield, range, bay or length change.
- **Artwork.** `SiteMarker.tsx`, `ShipIcon.tsx` and the site/ship CSS are
  untouched. A ship standing on an active or dormant site sits on that site's
  own artwork, and that is what shows the player what it is standing on.
- **`src/rules/sitePool.test.ts`** (no ships in it at all) and
  **`src/rules/seededReplay.test.ts`** (self-comparing, no pinned numbers).
  Both must pass unchanged; see **D12**.
- **`CLAUDE.md`.** No vocabulary changes; "stranded" was never in its glossary.
- **`doc/plan/00000021-accessibility-tech-debt/known-issues.md`** — nothing is
  expected (**D13**).

---

## Design decisions and reasoning

This section is the design record for the story. The code in this repository
does not carry design history (`CONTRIBUTING.md`, "Comments"), so anything a
future reader needs to know about **why** is written here and nowhere else.

### D1 — The rules change lands first, and the code is knowingly behind it for several commits

`CLAUDE.md` and `doc/guidelines/implementation-plan-guide.md` both require it:
`rules.md` is the single source of truth and the code implements it, so the
document is edited, the version bumped and the changelog written before any
behaviour changes. Stories 27 and 29 both did this and it is the house pattern.

Between step 1 and step 4 the code is knowingly behind the document. The
windows are deliberate; no step should try to paper over the one it sits in:

| After step | The app behaves like this                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 1          | 0.12 in full: a move may not end on a site that is not charged, and a stranded ship must be freed                 |
| 2          | A move may end anywhere in reach, but a ship left on a site that is not charged is still stranded and still binds |
| 3          | 0.13's rules of play, except that a winning attacker still refuses to advance onto a site that is not charged     |
| 4          | 0.13 in full                                                                                                      |
| 5          | 0.13 in full, with the consequences pinned by tests                                                               |
| 6          | 0.13 in full, with the scaffolding §8.5 needed removed                                                            |

### D2 — §8.5 keeps its number and is rewritten in place

Renumbering §8.6 and §8.7 to close a gap would invalidate every `§8.6`/`§8.7`
citation in the document and in the rule comments across `src/` — story 27 paid
that price once and story 29 explicitly refused to repeat it. §8.5 therefore
keeps its place in the numbering, and its **content** is replaced: from "you
may not stop here, and if you end up here you owe an action" to "standing here
is ordinary, and it pays nothing".

**Rejected:** deleting §8.5 outright and leaving a numbering gap. The section
still has something to say — that standing on a site that is not charged is
allowed and free, and what happens when a node runs out under its holder — and
a document with a hole in its numbering invites the reader to wonder what was
removed.

### D3 — The charge draw ignores occupancy: a site charges under whoever is standing on it

Settled by the owner before planning. An active site is drawn on its pressure
alone; a ship standing on it neither protects it from the draw nor excludes it.
The moment the draw picks it, the ship on it is holding a node.

Why: it is what makes camping a genuine tactic rather than a way of freezing a
site. A player who parks a ship on a long-waiting active site is making a real
bet — pressure makes that site likelier to be picked, and if it is picked, the
ship is already there.

**Rejected:** excluding occupied sites from the draw. It would make parking a
ship on a site a way to deny it to the board, and it would put a rule about
ships inside a rule about sites.

The code already behaves this way — `runChargeDraw` collects every `active`
site with no occupancy test, and `chargeDraw.test.ts` already asserts it. So
this decision costs no production change: it is a sentence in §8.2 (step 1) and
end-to-end test cover (step 5).

The **timing** matters and must be stated correctly wherever it is described.
§8.6's order is: (1) shields, (2) energy, (3) drain, (4) charge draw, (5)
pressure, (6) recovery. A site charged in step 4 of a turn was not charged
during steps 1 and 2 of that same turn, and steps 1 and 2 only ever pay the
side that just played. So a ship parked on a site that charges at the end of
turn N first gains its shield and first collects at the end of **its own
owner's next turn**, not at the end of turn N.

### D4 — Every trace of the stranded UI is removed, with nothing put in its place

Settled by the owner before planning. Today a ship that owes an action is drawn
with an amber chevron, blinks between full and dampened opacity, and is named
"stranded, must move this turn" in its accessible name; the opponent's whole
fleet is dampened while the obligation binds. All of it goes: the chevron
component, the CSS animation and its reduced-motion rule, the `owes-action`
member of `ShipCondition`, its wording-table row, and the `ship-stranded`
announcement.

Nothing replaces it, because there is nothing left to say. The state it marked
does not exist. A ship on an active or dormant site is an ordinary ship sitting
on that site's own artwork, which already tells the player what it stands on.

The `no-action` condition **stays exactly as it is** — it means "this ship has
no legal move and no legal attack target", which is still a real state (a
pinned ship, or one that has already acted). It will simply fire less often
once the obligation stops holding fleets back.

### D5 — The surviving §6 module is `movement.ts`; `moveLegality.ts` is folded into it and deleted

The story leaves the direction of the fold to the plan. `movement.ts` survives,
for three reasons:

- Every caller outside the pair already imports from `movement.ts`
  (`ply.ts`, `session.ts`, `Board.tsx`, `actions.ts`). Folding the other way
  would rewrite every one of those imports for no gain.
- It leaves one module per rules section — `movement.ts` for §6, `combat.ts`
  for §7, `vacating.ts` for §8.7, `chargeDraw.ts` for §8.2 — which is the
  shape the rest of `src/rules/` already has. `combat.ts`'s own module comment
  already calls `movement.ts` "the only implementation of §6".
- There is no `moveLegality.test.ts`. That module is tested entirely through
  `movement.test.ts` today, so folding it in leaves the test file where it
  already is.

After the fold, `movement.ts` holds: the reach table and `reachFrom`,
`ReachEntry`, `findShip`, `MoveRefusalReason`, `moveRefusalReason`,
`legalDestinations` and `sideToMoveHasLegalMove`. Its module comment is
rewritten to describe that shape; it must not be left describing a two-layer
split that no longer exists.

**Rejected:** keeping both files with `movement.ts` re-exporting. That is a
pass-through module, which is exactly the scaffolding-around-nothing the story
asks to be removed.

**Rejected:** moving `findShip` to `gameState.ts` while the files are open. It
is a fair suggestion — it is a lookup on `GameState`, not a §6 rule — but it
widens the diff into a module this story otherwise never touches, and
`combat.ts` already imports it across a module boundary today. It stays with
§6; if a later story wants it in `gameState.ts`, nothing here blocks that.

### D6 — `combat.ts` collapses its own split in place, keeping its name and every public function name

`sevenOnlyAttackRefusalReason` merges into `attackRefusalReason` and
`sevenOnlyLegalTargets` into `legalTargets`, each keeping the game-over check
that the public function has today, and the ordering of every other check
exactly as `sevenOnlyAttackRefusalReason` has it (ownership, already acted,
attacker in a bay, then everything about the target, then range and path — so
that a bay target in reach is still refused as `"target-in-bay"` rather than as
out of range). No file is created or deleted here; only the two `sevenOnly`
functions disappear and their bodies move into the public ones.

### D7 — `sideToMoveHasLegalAction` becomes game-over-aware, and the pass guard's own game-over check is what keeps that safe

Today `actions.ts` deliberately reads the game-over-**unaware** layers, because
the §5 pass guard would otherwise pass a ply on every call once the game had
ended. After the collapse there is no unaware layer left, so
`sideToMoveHasLegalAction` and `shipHasLegalAction` both read the public
`legalDestinations`/`legalTargets`, which return nothing once the game is over.

That is safe because `applyPassGuard` in `ply.ts` **already returns the state
untouched when `isGameOver(state)`, before it asks about legal actions at
all**. That early return must stay; it is the thing that stops an ended game
from passing plies forever. `ply.ts` already has two tests pinning it (search
`ply.test.ts` for "the trap"), and they must keep passing untouched.

There is no circularity: `isGameOver` reads `plyNumber` and `lengthInRounds`
only, and never asks whether an action is legal.

The one visible consequence: `sideToMoveHasLegalAction(state)` now answers
`false` for a state whose game is over, where today it answers `true` if a move
would otherwise exist. That reading is correct under §9 — once the game is
over, no action is legal for anyone — and the doc comment should say so.

### D8 — Removing §8.5 is one step, because the type system couples the rules layer and the UI

Step 3 touches thirteen files, which is large for one step, and it is
deliberate. `another-ship-stranded` is a member of both `MoveRefusalReason` and
`AttackRefusalReason`; `announcements.ts` switches exhaustively over those
unions, and `squareLabel.ts` has a `Record<ShipCondition, string>` wording
table. Removing a union member is a compile error at every `case` that still
names it, and deleting `stranded.ts` is a compile error in `Board.tsx`. There
is no ordering of those edits that leaves a compiling, coherent intermediate
state.

**Rejected:** removing the behaviour first and the dead types afterwards. It
would leave one commit in which the obligation no longer binds but the board
still blinks a chevron at a ship that owes nothing — a worse intermediate state
than the large step, and one that would confuse a manual look at the app.

**Rejected:** removing the UI first. Then the obligation still binds while the
board gives the player no clue which ship must move — actively misleading.

### D9 — `ShipCondition` stays a single-member string union

With `owes-action` gone, `ShipCondition` is `"no-action"` and nothing else. It
stays a string union rather than becoming, say, a `noAction?: boolean` prop.

Reasons: `squareLabel.ts`'s `CONDITION_WORDING` table is the one place a
condition's player-facing wording is written, and a `Record<ShipCondition,
string>` keeps that table honest; `BoardSquare`'s optional `condition` prop and
`Board`'s `shipCondition` function both already read as "which condition, if
any"; and a boolean would have to be renamed back into a union the first time a
second condition appears. The type churn would reach four files and their tests
and buy nothing.

What must **not** happen is the wording table keeping a dead row — that is the
part the story insists on, and a single-member union satisfies it.

### D10 — `winnerAdvance` considers occupancy alone, and its bay behaviour is unchanged

§7's advance scans the attack lane backwards from the loser's square towards
the attacker, and takes the furthest square the winner may legally end on.
"May legally end on" is §6's restriction, which after step 2 is occupancy
alone. So the site-state skip is deleted and nothing replaces it.

Two things stay exactly as they are, and must not be "fixed" while the file is
open:

- **A candidate that is occupied is skipped**, and a candidate the winner
  cannot reach without crossing an occupied square is skipped. Occupancy is
  re-checked at advance time even though the lane was clear when the attack was
  judged, because the beaten ship's return bay may have landed on that same
  lane.
- **Bays are not special-cased.** An empty bay square on the lane is a legal
  candidate today and remains one; in practice the advance takes the loser's
  own square long before it ever gets that far. `combat.test.ts`'s sweep proving
  a winner never lands in a bay must keep passing.

### D11 — What "the winner holds its ground" now means

Today the advance is blocked by two different things: a site that is not
charged, and an occupied lane square. After step 4 only the second remains, so
`winnerAdvance` returning `undefined` becomes rare — in practice it happens
only when the beaten ship's own return bay is drawn onto the lane between the
attacker and the square it just cleared (§7, §8.7's last bullet).

That case is **not** rare enough to stop testing: it is the case §8.7 hangs its
"a blocked advance leaves the node empty and dormant" bullet on. `ply.test.ts`
already has a test for it (search for "D15 reproduction"), and it must keep
passing untouched.

### D12 — No randomness moves, so the seeded stream must not move

This story draws no new randomness and removes none. The number of seed steps a
ply consumes is unchanged: the drain draws, the charge draw and the recovery
draws are all untouched, and no new draw is added.

`seededReplay.test.ts` compares a game against itself rather than against
recorded numbers, so it must pass unchanged. Its two thresholds ("at least ten
bay returns", "at least ten charge draws") are the only seed-sensitive numbers
in it, and they are floors with plenty of headroom.

`fullGame.test.ts` drives a deterministic greedy policy whose choices **will**
change — a policy that can now stop on an active site heads for sites it
previously walked past — so the game it plays diverges from today's. Its
assertions are structural (totals agree with the collected effects, the game
ends at the right ply, both sides score something) with no pinned energy
figures, so it should still pass. If a threshold in either file genuinely
fails, **read it as a signal and report it** rather than adjusting the number
blindly.

### D13 — Accessibility: nothing is owed to the ledger here

Per `CLAUDE.md`, pre-release stories do not spend work keeping accessibility
intact, and no plan step tests accessibility. Existing automated tests are
updated where the path is straightforward.

Nothing is expected for
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`: the announcement
and the accessible-name wording that go away describe a state that no longer
exists, so no accessible behaviour is lost. If an implementer finds that a step
does cost one, record it there as a new section for story 31 and say so in that
step's Notes.

### D14 — Three tests exist to pin the split, and each needs a new premise rather than a deletion

These are easy to delete by accident when the split goes, and each is worth
keeping in a rewritten form:

- `movement.test.ts` — "empties legalDestinations while the §6-only layer stays
  unchanged, pinning the layering". Its premise disappears in step 6. Replace
  it with the fact that still matters: a move that is legal in a state whose
  game has not ended is refused as `"game-over"` in the same state once it has.
- `ply.test.ts` — "the already-acted check must live in the seven-only layer".
  The **behaviour** it asserts (a side whose one in-range ship has already
  acted passes its ply) is unchanged; only its name and comment need rewriting
  to stop naming a layer that no longer exists.
- `fullGame.test.ts` — `findMoveLegalAMomentEarlier` and
  `findAttackLegalAMomentEarlier` exist solely because the unaware layers gave
  them a way to find an action that "would have been legal a moment earlier".
  Rebuild them by asking the public functions against a **copy of the state
  whose game has not ended** (raise `lengthInRounds`, or lower `plyNumber`),
  then asserting the refusal against the real state. The test's point — an
  ended game refuses a move, an attack and a pass — is unchanged.

---

## Step 1 — Rules 0.13: a ship may stop anywhere, and stranding is deleted

Status: committed

Notes: Edited `rules.md` exactly as specified — §6's closing paragraph
deleted, §7's two site-exclusion mentions removed, §8.1's three bullets
rewritten to describe production and draw eligibility only, §8.2 gained a
sentence on charging under an occupying ship (with the "owner's next turn"
timing per D3), §8.3's stranding clause reworded, §8.5 rewritten in place
keeping its number and title changed to "Standing on a site that is not
charged", and §8.6 step 3's stranding clause removed. Version bumped to 0.13
in both `rules.md` and `RULES_VERSION`, and a changelog entry added at the
top of `changelog.md`. No section renumbered (§8 still runs 8.1–8.7 with no
gap). No `src/` file other than `rulesVersion.ts` touched, per D1 — the code
(including `stranded.ts` and the site-state move refusal) is knowingly
behind the document until later steps. One incidental deviation: rewrapped a
couple of paragraph lines in §7 that the edits left ragged, to match the
document's existing ~80-character wrapping style; no wording beyond what the
step specified was changed.

Edit `doc/ruleset/rules.md`, add a `doc/ruleset/changelog.md` entry, and bump
`RULES_VERSION` in `src/rules/rulesVersion.ts` to `"0.13"`. **No behaviour
changes in this step** — no file under `src/` other than `rulesVersion.ts` is
touched. See **D1** for why this is its own commit and how far behind the
document the code then runs.

Read the whole of `rules.md` before editing: six of its sections mention the
rule being removed and several cross-reference each other.

**No section is renumbered** (**D2**). §8.5 keeps its number and gets new
content.

### The version line

`**Rules version: 0.12**` becomes `**Rules version: 0.13**`.

### §6 Movement

Delete the closing paragraph: "A ship may not **end** a move on a site that is
not charged (section 8.5). It may fly over one freely." Nothing replaces it.
What remains is the straight-line rule, the range table, the clear-path
paragraph and the "moving and attacking are entirely separate" paragraph — so
§6's whole restriction on where a move may end is now reach, a clear path and
an empty destination square.

### §7 Combat

Two edits, both removals of the site exclusion:

- The aside in the opening paragraph — "the site it stands on does not
  matter — a ship stranded on a site that is not charged (section 8.5) can
  still be attacked" — is reworded. The site a target stands on has never
  mattered, and there is no such thing as a stranded ship any more; say the
  first half plainly and drop the second.
- In **the winner advances**: delete the exclusion from "'May legally end on'
  is section 6's restriction and nothing else — not a site that is not charged
  (section 8.5)." It becomes section 6's restriction, full stop: the attacker
  takes the loser's square unless a ship is in the way. Keep the sentences
  about the beaten ship's own return bay blocking the lane, about the ordinary
  case being the loser's own square, and about the winner holding its ground if
  no square on the lane qualifies — all three are still true.

The rest of §7 — the shield arithmetic, the mutual return, the "node changes
hands intact" paragraph and the closing observations — is untouched.

### §8.1 The three states of a site

The three bullets stop describing where a ship may stop. They now differ only
in what a site produces and whether it is eligible for the draw:

- **Active** — eligible to be charged, but producing nothing.
- **Charged** — producing energy: a ship standing on it collects (section 8.4)
  and gains shields (section 4.1).
- **Dormant** — recovering after running out. Not eligible to be charged, and
  producing nothing.

Everything else in §8.1 — the cycle, the board's aim of five charged, the
opening position, and the paragraph about the five spreading apart on their
own — is unchanged.

### §8.2 Charging a site

Add **one** sentence (or a short pair) saying what happens when the draw picks
an occupied site, because that is now reachable and was not before: the draw
does not look at occupancy, so a site with a ship standing on it can be
charged, and that ship is holding a node from that moment — it collects at the
end of its owner's next turn and starts gaining shields, exactly as if it had
moved onto a node. Be careful with the timing: **its owner's next** turn, for
the reason set out in **D3**.

Everything else in §8.2 — pressure, the weighting, the recovery table — is
unchanged.

### §8.3 How long a node lives

"When drain reaches or passes capacity, the node is spent: it goes dormant at
the end of that turn, **stranding any ship left on it exactly as before
(section 8.5)**." The stranding clause goes. Say instead what now happens: the
node goes dormant and simply stops paying; a ship left standing on it stays
where it is (section 8.5). Keep the sentences about how long empty and held
nodes last, and the pointer to §8.7.

### §8.5 — rewritten, keeping its number

New title along the lines of **"8.5 Standing on a site that is not charged"**.
The whole of the current body — the prohibition, the stranding, the obligation,
the waiver and the tail-cost paragraph — is replaced by a short statement of
what standing on a site that is not charged now means. It must say:

- It is allowed and ordinary. A ship may end a move on an active or a dormant
  site, and may stay for the rest of the game if its owner likes.
- It pays nothing: no energy (section 8.4) and no shields (section 4.1) while
  the site is not charged.
- The site's own cycle carries on underneath the ship — a dormant site recovers
  and goes active on schedule, and an active site is eligible for the charge
  draw whether or not a ship is standing on it (section 8.2).
- The case that used to be a penalty: when a node runs out under the ship
  holding it (section 8.3), the node simply stops paying. The ship stays or
  leaves, exactly as its owner prefers.

The **tail-cost paragraph goes with the rest** — holding a node no longer costs
its holder an action when it runs out.

### §8.6 End-of-turn order

Step 3 currently reads "...any that reaches capacity goes dormant, stranding
any ship left on it." Delete the stranding clause: a node that reaches capacity
goes dormant, and any ship standing on it keeps standing there, collecting
nothing. No other step changes, and the order of the six steps does not change.

### §5, §3.1, §4.1, §8.4, §8.7, Appendix A, Appendix B

Untouched. §5 keeps its pass guard exactly as written: the obligation was never
the reason a player might have no legal action, and removing it only makes "no
legal action" rarer.

### The changelog entry

Add a `## 0.13 — ships may stay on any site` section at the top of
`doc/ruleset/changelog.md`, above 0.12, in the established style: bullets in
players' language, each naming the sections it touches. It should cover the
lifted restriction on where a move may end, the deletion of stranding and its
obligation, a site charging under a ship, the advance limited by ships alone,
and the note that §8.5 keeps its number with new content.

Verification (automated): run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all pass, and `rulesVersion.test.ts` in particular
confirms `RULES_VERSION` and the document agree at 0.13. Then confirm by
inspection:

- `grep -ni "strand" doc/ruleset/rules.md` returns nothing.
- `grep -n "may not end\|end a move" doc/ruleset/rules.md` returns no
  prohibition — only §8.5's new permission, if it uses the phrase.
- `git diff --name-only` lists exactly `doc/ruleset/rules.md`,
  `doc/ruleset/changelog.md` and `src/rules/rulesVersion.ts`.
- §8 still runs 8.1 to 8.7 with no gap and no duplicate.

---

## Step 2 — A move may end anywhere a ship can reach

Status: committed

Notes: `sixOnlyMoveRefusalReason` in `moveLegality.ts` no longer checks
`siteStateAt` for the destination; `destination-active-site` and
`destination-dormant-site` are gone from `MoveRefusalReason`, and the now
unused `siteStateAt` import is removed. The module and function comments
were rewritten to stop claiming the destination's site state matters, and
`movement.ts`'s module comment (which made the same now-false claim) was
also corrected — a one-line deviation from the step's file list, done
because leaving it would have left an inaccurate doc comment describing a
check that no longer exists. `announcements.ts` lost the two `rejectionSentence`
case arms for the removed reasons. `stranded.ts` and `another-ship-stranded`
are untouched, as specified — a ship on a site that is not charged is still
stranded until step 3. Tests updated: `movement.test.ts`'s site-exclusion
case now asserts active, dormant and charged destinations are all legal and
unrefused, and the two removed-reason rows left the "produces each specific
reason" table; `session.test.ts`'s two rejection tests became "applies a
move ending on an active/dormant site"; `announcements.test.ts` lost the two
rejection-sentence cases. Full suite (723 tests), typecheck and lint all
pass; `fullGame.test.ts` passed unchanged despite its greedy policy having
new destinations available, as anticipated by D12.

Delete §6's destination site-state check from the move-legality layer, and with
it the two refusal reasons that only that check produced.

Depends on: Step 1 (the rules no longer carry the restriction).

**What to change**

- `src/rules/moveLegality.ts` — `sixOnlyMoveRefusalReason` stops consulting
  `siteStateAt` for the destination. Remove the `destination-active-site` and
  `destination-dormant-site` members from `MoveRefusalReason`, and drop the now
  unused `siteStateAt` import (lint will flag it otherwise). What is left of a
  move refusal is: `not-your-ship`, `ship-already-acted`,
  `another-ship-stranded` (until step 3), `out-of-range`, `path-blocked`,
  `destination-occupied`, `game-over`. Update the module and function comments
  so nothing still claims the destination's site state matters.
- `src/board/announcements.ts` — delete the two `case` arms for the removed
  reasons in `rejectionSentence`. They become compile errors the moment the
  union members go, which is how they are found.

**What must not change in this step**

`stranded.ts` stays exactly as it is. A ship on a site that is not charged is
still stranded and still binds its owner's turn — that goes in step 3. The
board still shows the chevron. This is the deliberate intermediate state in
**D1**'s table.

**Tests**

- `src/rules/movement.test.ts` — the case that asserts an active destination is
  refused as `destination-active-site` and a dormant one as
  `destination-dormant-site` inverts: those destinations are now **legal**, so
  `legalDestinations` contains them and `moveRefusalReason` returns
  `undefined`. Keep the charged destination assertion as the control. The
  refusal-reason table cases naming the two removed reasons are deleted.
- `src/game/session.test.ts` — the two tests "rejects an active site as
  destination-active-site" and "rejects a dormant site as
  destination-dormant-site" become tests that the move is **applied**, ending
  with the ship on that square.
- `src/board/announcements.test.ts` — the two rejection-sentence cases go.
- Run the whole suite and fix any other fallout. Expect `fullGame.test.ts` to
  play a different game (its greedy policy can now stop on active sites); its
  assertions are structural, so it should still pass (**D12**).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` all
pass, with `movement.test.ts` proving that a ship with reach, a clear path and
an empty destination may end its move on an active site, on a dormant site and
on a charged site alike. `grep -rn "destination-active-site\|destination-dormant-site" src`
returns nothing.

---

## Step 3 — §8.5's obligation deleted, root and branch

Status: committed

Notes: Deleted `stranded.ts` and `stranded.test.ts`; dropped
`another-ship-stranded` from `MoveRefusalReason` and `AttackRefusalReason`
and the obligation checks that consulted it in `movement.ts` and
`combat.ts`; removed `ShipStrandedEffect` from `endOfTurn.ts` and step 3's
raising of it (the `occupants` lookup it used stays, still needed for the
held/empty drain table choice); reworded doc comments in `moveLegality.ts`,
`movement.ts`, `combat.ts` and `actions.ts` that named §8.5 as the reason
for the two-layer split, without collapsing the split itself (that is step
6's job). On the board: removed `owedShipIds`/`strandedShipIds` and the
`owes-action` branch from `Board.tsx`'s `shipCondition`; reduced
`ShipCondition` to the single member `"no-action"` in `squareLabel.ts`,
dropping its wording row (D9); deleted `OwesActionMark` and its now-unused
`CHEVRON_*` constants from `BoardSquare.tsx`; deleted the blink keyframes,
the owes-action class rule and its reduced-motion override from
`BoardSquare.css`; dropped the `ship-stranded` clause and the
`another-ship-stranded` rejection sentence from `announcements.ts`. Updated
every test file the plan named (`movement.test.ts`, `combat.test.ts`,
`endOfTurn.test.ts`, `actions.test.ts`, `ply.test.ts`, `chargeDraw.test.ts`,
`Board.test.tsx`, `BoardSquare.test.tsx`, `squareLabel.test.ts`,
`announcements.test.ts`), replacing each obligation-era case with one
proving the corresponding new-rule fact (a ship on a dormant/active site is
free, its fleet-mates are unaffected, and a node running out under a ship
raises only `node-ran-out` and leaves the ship in place). One test needed a
correction beyond the plan's description: `endOfTurn.test.ts`'s rewritten
"leaving a ship on it untouched" case initially omitted the
`energy-collected` effect that step 2 still produces for the ship's last
turn holding the node before it runs out in step 3 — added it once the
first run flagged the mismatch, rather than dropping the assertion. Also
reworded two stray comments in `ply.test.ts` (§8.7 regression tests) that
justified a charged-not-active attacker square by citing the now-deleted
stranding refusal; the constraint itself was left as unnecessary but
harmless test setup, per the step's "no behaviour change beyond §8.5"
scope. `npm run typecheck`, `npm run lint`, `npm test` (696 passed) and
`npm run format:check` all pass; `grep -rni "strand" src` returns nothing.
`winnerAdvance`'s site-state skip and the `sixOnly`/`sevenOnly` layering
were deliberately left untouched, per the plan's step 4 and step 6
boundaries.

Delete stranding from the rules layer, from the end-of-turn effects and from
the board, in one step. **D8** explains why it is one step and not several: the
refusal-reason unions and the deleted module couple the rules layer and the UI
at typecheck time, so there is no compiling intermediate.

Depends on: Step 2 (a move may already end anywhere, so nothing here depends on
the obligation to keep a ship's options open).

**Rules layer**

- Delete `src/rules/stranded.ts` and `src/rules/stranded.test.ts`.
- `src/rules/movement.ts` — `moveRefusalReason` and `legalDestinations` stop
  consulting `strandedShipIds`. Delete the `another-ship-stranded` member from
  `MoveRefusalReason` in `moveLegality.ts`. Rewrite the doc comments that
  describe the obligation and the layering it justified — the layering itself
  survives until step 6, but its stated reason changes to "the game-over check
  lives only in the public layer".
- `src/rules/combat.ts` — `attackRefusalReason` and `legalTargets` stop
  consulting `strandedShipIds`; delete `another-ship-stranded` from
  `AttackRefusalReason` and the long doc paragraph explaining why §8.5 refused
  every attack including the owing ship's own.
- `src/rules/endOfTurn.ts` — delete the `ShipStrandedEffect` interface, remove
  it from the `EndOfTurnEffect` union, and stop raising it in step 3 of the
  sequence. The `node-ran-out` effect stays exactly as it is and is now the
  whole of the news when a node runs out under a ship.
- `src/rules/actions.ts` — no code change is required yet, but its doc comments
  name §8.5's obligation as the reason for reading the unaware layers. Reword
  them to describe what is actually true after this step (the layers differ
  only by the game-over check); step 6 removes them entirely.

**Board**

- `src/board/Board.tsx` — delete the `strandedShipIds` import, the `owedShipIds`
  set, and the `owes-action` branch of `shipCondition`. The comment above
  `shipCondition` is rewritten: the only condition left is "this ship has no
  legal action at all", which still covers a pinned ship and a ship that has
  already acted.
- `src/board/squareLabel.ts` — `ShipCondition` becomes the single member
  `"no-action"` (**D9**), and `CONDITION_WORDING` loses the "stranded, must
  move this turn" row. Update the type's doc comment.
- `src/board/BoardSquare.tsx` — delete the `OwesActionMark` component, the
  `board-square--owes-action` class, and the chevron's render branch. Check
  whether the chevron geometry constants (`CHEVRON_*`) are still used by
  anything else and delete any that are not.
- `src/board/BoardSquare.css` — delete `.board-square--owes-action`, the
  `board-square-owes-action-blink` keyframes and the reduced-motion rule that
  turns the blink off. Leave the `--dampened-opacity` custom property and the
  `.board-square--dampened` rule alone: `no-action` still uses them.
- `src/board/announcements.ts` — delete the `ship-stranded` case from
  `endOfTurnClauses` and the `another-ship-stranded` case from
  `rejectionSentence`. The "The node at X ran out." clause stays **exactly** as
  it is.

**Tests**

- `src/rules/movement.test.ts` — delete the obligation tests (the ones about a
  non-owed ship being refused `another-ship-stranded`, the obligation binding
  and reopening). Replace them with one test of the new rule: a ship standing
  on a dormant site, its owner free to move a **different** ship, and no
  refusal anywhere.
- `src/rules/combat.test.ts` — delete the `another-ship-stranded` attack
  refusals and the "obligation waived" case; add that a ship standing on a site
  that is not charged neither blocks nor is blocked from attacking.
- `src/rules/endOfTurn.test.ts` — the test asserting a `ship-stranded` effect
  when a node runs out under a ship becomes its opposite: `node-ran-out` is
  raised, the ship is untouched (same square, same shields), and **no** other
  effect names it.
- `src/rules/actions.test.ts` — the two obligation cases ("held back by another
  ship's stranded obligation", "true once the freeing move is made") go; add
  one showing a ship on a dormant site and a sibling elsewhere both having
  legal actions.
- `src/rules/ply.test.ts` — drop the `strandedShipIds` import and rework the
  test that used it ("un-strands by force"): a ship on a dormant site beaten in
  a fight ends up in a bay, and nothing about its owner's next turn is
  constrained either way.
- `src/rules/chargeDraw.test.ts` — drop the `strandedShipIds` import and the
  assertion using it; keep the test that an occupied active site is drawn like
  any other, and strengthen it to assert the ship is still standing there on
  the newly charged node.
- `src/board/Board.test.tsx` — the "ship conditions" group's `strandedState`
  helper and its four owes-action tests are rewritten: a ship on a dormant site
  is named plainly ("H4, dormant site, green ship, 0 shields"), and the rest of
  the fleet keeps its ordinary names because nothing holds it back. Keep the
  "pinned ship" test and the "never gives the opponent's ship a condition"
  test, adjusting states as needed.
- `src/board/BoardSquare.test.tsx` — delete the chevron and blink assertions,
  and reduce the `ShipCondition` sweep to the one remaining member.
- `src/board/squareLabel.test.ts` — delete the two "stranded, must move this
  turn" cases.
- `src/board/announcements.test.ts` — delete the two stranding announcement
  cases and the `another-ship-stranded` rejection case; where a stranding
  clause sat inside a longer expected sentence, remove just that clause and
  keep the rest.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass, and `grep -rni "strand" src` returns nothing.
The suite must include, and be seen to include: a node reaching capacity under
a ship raises only `node-ran-out`, leaves the ship where it is, and leaves its
owner free to take any action on the following turn — a move with a different
ship, an attack, or nothing about that ship at all.

---

## Step 4 — A winning attacker advances by occupancy alone

Status: committed

Notes: `winnerAdvance` in `combat.ts` no longer skips a candidate whose site
is `active` or `dormant`; the `siteStateAt` check and its now-unused import
are deleted, and the function's doc comment now says the restriction is
occupancy alone, per D10. Occupied-candidate skipping, the blocked-path
skip and the `undefined`/holds-its-ground fallback are untouched, per D10
and D11. In `combat.test.ts`'s `winnerAdvance` group, the two "stops ...
short when ... dead site" cases and the "holds its ground when the only
square on the lane is dead" case became "lands on the loser's square when
it is an active/dormant site" (landing, not stopping short); the occupancy
tests are untouched, and the bay sweep now runs against both an all-dormant
and an all-charged board and asserts the two produce identical
`winnerAdvance` results, directly pinning "site state no longer affects the
advance" per D10/D11. In `ply.test.ts`, "stops the advance one square short
when the loser's square is a dormant site" became "advances onto the
loser's square when it is a dormant site", and "holds its ground on an
adjacent attack onto an active site" became "advances onto the loser's
square when it is an active site" (with `advanced: true` and the winner's
square updated); "landing on a charged site during a winning advance leaves
it charged" keeps its assertions with its comment reworded to stop claiming
charged is the only state a winner may end on. The "D15 reproduction" test
and all three §8.7 regression cases (a node changing hands intact, a drawn
fight, a blocked advance across the loser's own return bay leaving the node
empty and dormant) were left untouched and still pass, confirming the
§8.7 cover survives per the task's instruction. One correction during
verification: the first draft of the new "advances onto the loser's square
when it is an active site" case kept the old `remainingShields: 3`
expectation from the case it replaced; the fight is attacker (3 shields) vs
defender (0 shields), so the winner's remaining shields are `3 - (0 + 1) =
2` — fixed once the test run flagged the mismatch. `npm run typecheck`,
`npm run lint` and `npm test` (695 passed) all pass. No production files
outside `combat.ts` were touched, and the two-layer split (`sevenOnly*`,
`moveLegality.ts`) was left exactly as it was, per the task's instruction
that step 6 owns that collapse.

Make §7's advance stop for ships and nothing else.

Depends on: Step 2 (§6's restriction is now occupancy alone, and §7's advance
is defined in terms of §6's restriction) and step 1 (§7 no longer states the
exclusion).

**What to change**

`src/rules/combat.ts` — `winnerAdvance` stops skipping candidates whose site is
`active` or `dormant`. It keeps, unchanged: skipping an occupied candidate,
skipping a candidate the winner could only reach by crossing an occupied
square, and returning `undefined` when no candidate qualifies (**D10**, **D11**).
Remove the now unused `siteStateAt` import if nothing else in the file uses it,
and rewrite the doc comment so it no longer says which site states are skipped.

**Tests**

- `src/rules/combat.test.ts`, the `winnerAdvance` group — "stops one square
  short when the loser's square is a dead site", "stops two squares short..."
  and "holds its ground when the only square on the lane is dead" all invert:
  the winner now lands on the loser's square whatever site is under it. Keep
  the occupancy tests exactly as they are. The bay sweep keeps passing; rewrite
  its comment, which currently explains that "charged is the only state a
  winner may end on", and consider strengthening it to assert that the
  all-dormant and all-charged sweeps now produce **identical** results — a
  direct pin on "site state no longer affects the advance".
- `src/rules/ply.test.ts` — "holds its ground on an adjacent attack onto an
  active site" inverts: the winner advances onto the active site, with
  `advanced: true` and its square updated. Adjust the comment on "landing on a
  charged site during a winning advance leaves it charged", which currently
  asserts that charged is the only site a winner may end on. **Do not touch**
  the "D15 reproduction" test — a blocked advance across the loser's own return
  bay is still the case that leaves a node empty and dormant (§8.7).
- Add cover for the interesting new case in both directions: an attacker that
  beats a defender standing on a **dormant** site advances onto it, and one
  that beats a defender on an **active** site does too.
- Confirm the §8.7 regressions still hold and keep a test on each: a fight over
  a charged node still changes hands intact (the node stays charged with its
  drain untouched), a drawn fight over a node still ends it, and a blocked
  advance still leaves the node empty and dormant.

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
pass, with `combat.test.ts` and `ply.test.ts` demonstrating the advance onto an
active site and onto a dormant site, and the three §8.7 cases above still
passing.

---

## Step 5 — Camping, end to end

Status: committed

Notes: Added `src/rules/camping.test.ts`, a new integration test file driving
`applyMove` (and, for the one negative check that needs it, `moveRefusalReason`
directly) rather than `runEndOfTurn`/`runChargeDraw` in isolation, per the
step's instruction to prove the same thing a player's turn would. Five cases:
(1) a ship parked on the board's only active site is charged under it with no
move of its own, gaining its shield and collecting energy only at the end of
its owner's own next turn — two plies later, with the opponent's intervening
turn paying nothing, pinning D3's timing exactly; (2) a ship on a dormant site
stays put through recovery to active and then through the very next ply's
charge draw, since that site is then the board's only active candidate; (3) a
negative control: ships parked on an active and a dormant site (with the board
already at its five-charged target, so the active one is never drawn) collect
nothing and gain no shields across two full plies; (4) a node running out
under a ship raises only `node-ran-out`, leaves the ship's square and shields
untouched, and leaves both a different ship's move and `moveRefusalReason` for
the parked ship itself unrefused on the following turn; (5) a ship moving off
a charged node onto a dormant site produces a `node-vacated` effect for the
node it left and ends up standing on the dormant site, which keeps recovering
underneath it in the very same sequence since it was already dormant when the
ply began. No production code was touched, matching the step's constraint;
nothing surfaced that looked like a bug rather than a gap in cover. One
deviation from the initial draft, caught by the tests themselves rather than
predicted up front: the two single-ship states first tried for case 5 (no
second ship for the side passed to) triggered `applyPassGuard`'s immediate
forced pass for the side with no ships at all, which correctly runs a second
end-of-turn sequence for that passed ply — a real rules consequence, not a
bug — and moved the departed node's drain and recovery further than a single
green move alone would. Fixed by giving the state a second, red ship with a
legal move so the ply genuinely ends after green's one action, matching every
other case's setup. `npm test` (700 passed, up from 695), `npm run typecheck`,
`npm run lint` and `npm run format:check` all pass; `seededReplay.test.ts` and
`sitePool.test.ts` passed unchanged, confirming no new randomness was drawn.
The §5 pass guard was confirmed rather than duplicated: `ply.test.ts`'s
existing pass-guard tests (including `endOfTurn.test.ts`'s "a passed ply still
collects" case) already exercise it and continue to pass; no new pass-guard
case was needed since the existing cover was not disturbed by this story.

Add the integration cover for the consequences the story cares most about.
**No production code changes in this step** — every behaviour it pins is
already implemented by steps 1 to 4 plus the charge draw's existing
occupancy-blind pool (**D3**). If any of these tests needs a production change
to pass, stop and report it: that is a bug found, not a test to bend.

Depends on: Step 3 (until the obligation is gone, a ship cannot simply sit on a
site through several turns) and step 2.

**What to cover.** Drive these through the public rules API — `applyMove`,
`applyAttack`, `applyPassGuard` and `runEndOfTurn` — rather than by reaching
into internals. Put them where they read best: extending
`src/rules/endOfTurn.test.ts` and `src/rules/chargeDraw.test.ts` is reasonable,
as is a new integration test file under `src/rules/` in the style of
`fullGame.test.ts` if the setup is shared. Choose a seed that makes the draw
pick the site you care about, or build a state in which it is the only active
site, so the test is deterministic rather than lucky.

- **A site charges under a parked ship, and that ship is then holding a node.**
  A ship stands on an active site; the end-of-turn draw charges it; the ship
  has not moved. At the end of **its owner's next** turn it gains a shield
  (§8.6 step 1, §4.1) and collects energy for the node (§8.6 step 2, §8.4),
  with no move of its own in between. Watch the timing described in **D3**.
- **A ship parked on a dormant site is still there when the site recovers**, and
  still there if the draw then charges it. Drive enough plies for the recovery
  draw to take the site to active.
- **A ship standing on a site that is not charged collects nothing and gains no
  shields** while it is not charged — the negative control for the two above.
- **A node that runs out under a ship leaves the ship in place**, its owner free
  to do anything at all on the following turn, with no board marker, no
  announcement beyond "the node at X ran out", and no refusal when they move a
  different ship.
- **A ship that moves off a charged node onto a dormant site** ends the node it
  left (§8.7) and stands on the dormant site it arrived at.
- **The §5 pass guard still works**: a side with no legal move and no legal
  target passes, and the end-of-turn sequence runs for the passed turn in full.
  `ply.test.ts` already covers this; confirm it rather than duplicating it, and
  only add a case if the existing ones no longer reach the guard.

Verification (automated): `npm test` passes with the new cases present and
green, and `seededReplay.test.ts` and `sitePool.test.ts` pass **unchanged** —
neither the seeded stream nor the pool arithmetic has moved (**D12**). If a
seeded expectation does move, stop and report it rather than updating the
number.

---

## Step 6 — The two-layer split collapses

Status: committed

Notes: `src/rules/moveLegality.ts` is deleted; its contents (`reachFrom`,
`ReachEntry`, the reach table and helpers, `findShip`, `MoveRefusalReason`,
and the bodies of `sixOnlyMoveRefusalReason`/`sixOnlyLegalDestinations`) now
live in `src/rules/movement.ts`, merged into `moveRefusalReason` and
`legalDestinations` with the game-over check first, per D5.
`sideToMoveHasLegalMove` reads `legalDestinations`. `movement.ts`'s module
comment is rewritten to describe one module for §6 with §9's check layered
in front, with no split. In `combat.ts`, `sevenOnlyAttackRefusalReason`
merged into `attackRefusalReason` and `sevenOnlyLegalTargets` into
`legalTargets`, in the check order the seven-only functions had (game-over
first, then ownership, already-acted, attacker's bay, target checks, then
range and path), per D6; its `ReachEntry`/`findShip`/`reachFrom` import
moved from `./moveLegality` to `./movement`. `actions.ts`'s
`sideToMoveHasLegalAction` now reads `sideToMoveHasLegalMove` and
`legalTargets` directly (no `sevenOnlyLegalTargets` import left), with its
doc comment rewritten per D7 to explain why this is safe:
`applyPassGuard`'s own `isGameOver` early return in `ply.ts`, confirmed
untouched, is what keeps an ended game from passing plies forever;
`shipHasLegalAction`'s doc comment was trimmed of its "public §6 and §7
layers" phrasing since there is now only one. `ply.ts` needed no import or
comment change — it already named `movement.ts`/`combat.ts` as modules, not
layers. Tests updated per D14: `movement.test.ts`'s "pinning the layering"
case became "legalDestinations contains a destination legal before the game
ends, and is empty in the same state once it has", built from one state
copied with a later `plyNumber`; `combat.test.ts` got the analogous
treatment for its own "empties legalTargets ... pinning the layering" case
(not one of D14's three, but the same pattern applied for symmetry since
step 6 collapses combat.ts on the same terms), and its `sevenOnly*`
describe block was renamed to `attackRefusalReason / legalTargets` with
every call switched to the public functions, unaffected by the game-over
check since `buildState`'s defaults leave the game in progress;
`fullGame.test.ts`'s `findMoveLegalAMomentEarlier` and
`findAttackLegalAMomentEarlier` were rebuilt to call the public functions
against a copy of the state with `lengthInRounds` raised by one round
(rather than lowering `plyNumber`, an equally valid choice under
`isGameOver`'s arithmetic) and are unchanged in what they return to
`assertRefusesEverything`; `ply.test.ts`'s "must live in the seven-only
layer" test was renamed and its comment reworded to stop naming a layer,
with its assertions untouched. `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` (700 passed, unchanged from step 5,
confirming no cover was lost) all pass. `grep -rn "sixOnly\|sevenOnly\|moveLegality" src`
returns nothing, and `src/rules/moveLegality.ts` no longer exists. No
deviation from the plan's file list or design decisions.

Remove the scaffolding §8.5 needed. **No behaviour change in this step**: every
test that passed at the end of step 5 must still pass at the end of this one,
except where a test's only subject was the split itself (**D14**).

Depends on: Step 3 (the obligation was the split's whole reason for existing)
and step 4.

**§6 — `moveLegality.ts` folds into `movement.ts` and is deleted (D5)**

- Move `reachFrom`, `ReachEntry`, the reach table and its helpers, `findShip`,
  `MoveRefusalReason`, and the bodies of `sixOnlyMoveRefusalReason` and
  `sixOnlyLegalDestinations` into `src/rules/movement.ts`, merging each
  `sixOnly*` function into the public function of the same purpose:
  `moveRefusalReason` keeps its game-over check first, then the checks the
  six-only function performed, in its order; `legalDestinations` likewise.
  There must be no `sixOnly*` name left anywhere.
- `sideToMoveHasLegalMove` now reads `legalDestinations`.
- Delete `src/rules/moveLegality.ts`.
- Rewrite `movement.ts`'s module comment: it is the one implementation of §6 —
  reach, refusal reasons and legal destinations, with §9's game-over check
  layered in front — and it must not describe a split that no longer exists.
- Update the imports in `src/rules/combat.ts` (`ReachEntry`, `findShip`,
  `reachFrom`) and in any test that imports from `./moveLegality`.

**§7 — the split inside `combat.ts` collapses (D6)**

- Merge `sevenOnlyAttackRefusalReason` into `attackRefusalReason` and
  `sevenOnlyLegalTargets` into `legalTargets`, keeping the game-over check
  first and the rest of the check order exactly as the seven-only function has
  it today. Delete both `sevenOnly*` exports and rewrite the doc comments that
  describe the layering.

**Callers**

- `src/rules/actions.ts` — `sideToMoveHasLegalAction` reads
  `sideToMoveHasLegalMove` and `legalTargets`; `shipHasLegalAction` is
  unchanged in behaviour. Rewrite both doc comments per **D7**: the pass guard
  is safe because `applyPassGuard` returns early on `isGameOver`, and that
  early return must stay.
- `src/rules/ply.ts` — check its imports and the comments that mention the
  layers.

**Tests**

- `src/rules/movement.test.ts` — the "pinning the layering" test is replaced
  per **D14**.
- `src/rules/combat.test.ts` — the `sevenOnly*` describe block's assertions
  move onto the public functions. Where a case only made sense against a
  game-over-unaware layer, keep the case and build its state with a game that
  has not ended.
- `src/rules/fullGame.test.ts` — rebuild `findMoveLegalAMomentEarlier` and
  `findAttackLegalAMomentEarlier` per **D14**, against a copy of the state
  whose game has not ended.
- `src/rules/ply.test.ts` — rename and re-comment the "must live in the
  seven-only layer" test; its assertions do not change.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass; `grep -rn "sixOnly\|sevenOnly\|moveLegality" src`
returns nothing; and `src/rules/moveLegality.ts` no longer exists. The test
**count** should be within a case or two of step 5's — this step deletes
scaffolding, not cover — so a large drop means cover was lost and must be
restored.

---

## Step 7 — `README.md` and a sweep for the word "stranded"

Status: committed

Notes: Replaced the two obsolete sentences in the status blockquote. "A ship
can only stop on a site that is already lit." became "A ship may stop
anywhere it can reach, including a site that is not yet lit, and can camp
there for as long as its owner likes while it waits to light." "A ship still
standing on a node that has just run out has to be moved clear, and that is
what its owner's next turn is spent on." became "A ship left standing on a
node that has just run out simply stays there — it is never forced to
move, and its owner is free to spend their next turn however they like."
One deviation from the step's letter: rather than only patching the two
sentences in place and running `/update-readme` for the rest of the diff (no
such command was available to invoke directly in this session), reflowed the
whole status paragraph to consistent ~78-character lines, since the two
edits left several lines ragged and prettier's `proseWrap: preserve`
(the repository's default) does not reflow markdown prose itself; no other
wording in the blockquote was touched. Swept `README.md`, `doc/ruleset` and
`src` for "strand" (case-insensitive): the only hits are in
`doc/ruleset/changelog.md`, all inside the 0.13 entry (describing what this
story removed) or sections 0.11 and earlier (historical record of what the
rules said at the time), matching the plan's carve-out. Swept this story's
own `story.md` and `implementation-plan.md`: hits are all inside prose
describing what was removed, which the step says is fine. `npm test` (700
passed), `npm run typecheck` and `npm run lint` all pass with no changes
outside `README.md`. `npm run format:check` reports one pre-existing warning
on `doc/plan/00000031-remove-ship-removal-requirement/story.md`, unrelated
to this step's change and present before it.

Bring `README.md` back in line with 0.13 and confirm the removed rule has left
the repository's prose.

Depends on: Steps 1 to 6 (the README describes the finished behaviour).

**README**

Two sentences in the status blockquote state the removed rules and must go:

- "A ship can only stop on a site that is already lit." — deleted. Replace it
  with the fact that now holds: a ship may stop anywhere it can reach, and may
  sit on a site waiting for it to light.
- "A ship still standing on a node that has just run out has to be moved clear,
  and that is what its owner's next turn is spent on." — deleted; the ship may
  stay as long as its owner likes.

Run `/update-readme` for the rest of the branch diff and take what it suggests.
Keep the README's voice: it is written for a player, not a developer, and the
blockquote is one flowing paragraph rather than a list.

**Sweep**

- `grep -rni "strand" README.md doc/ruleset src` returns nothing.
- `grep -rni "strand" doc/plan/00000031-remove-ship-removal-requirement`
  returns only this plan and the story, where the word is used to describe what
  was removed. That is fine — planning documents are a record.
- Older plans under `doc/plan/` keep their text: they are the record of what
  was true when they were written and are never rewritten.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass; the greps above return what this step says
they should; and a read of the README's status paragraph confirms it describes
a game in which a ship may stop anywhere it can reach and may camp on a site
waiting for it to light.

---

## Step 8 — Owner play-through

Status: committed

Notes: The owner ran the app and confirmed the story's headline experience —
a ship may stop anywhere it can reach, nothing marks it afterwards, its owner
is free the next turn, a site charges under a parked ship, a node running out
under a ship is quiet, and a winning attacker takes the square. Nothing was
reported as reading wrongly, so no fixes were needed and this step commits
only its own status.

The owner runs the app and confirms the story's headline experience. This is
the pipeline's manual gate; nothing is committed for it beyond any fixes it
turns up.

Depends on: Steps 1 to 7.

Run `npm run dev` and open the app. Confirm, in roughly this order:

1. **A ship may stop anywhere.** Move a ship onto an active site (a waiting,
   growing disc) and onto a dormant site (a spent one). Both moves are offered
   as legal destinations and both are accepted, with no refusal message.
2. **Nothing marks the ship afterwards.** No amber chevron, no blinking ship,
   no "stranded, must move this turn" anywhere, and the rest of the fleet is
   not dampened. The ship sits on the site's own artwork, which is what shows
   what it is standing on.
3. **Its owner is free the next turn.** Take an entirely different action —
   move another ship, or attack — and it is accepted.
4. **A site charges under a parked ship.** Leave a ship on an active site for
   as many turns as it takes for the board to light it (a site that has been
   waiting a long time is likelier to be picked). When it lights, the ship is
   standing on a node: at the end of its owner's next turn it gains a shield
   and the energy readout goes up, with no move of its own in between. This may
   take a number of turns; it is the story's central experience and is worth
   the wait.
5. **A node running out under a ship is quiet.** Hold a node until it runs out.
   The announcement says the node ran out and nothing more; the ship stays put;
   nothing is refused next turn.
6. **The advance takes the square.** Attack and beat a defender standing on a
   dormant or active site. The winner advances onto that square and the
   announcement reads "It advanced to X and took it."
7. **A fight over a charged node is unchanged.** Beat a defender standing on a
   lit node: the attacker takes the square and the node stays lit.

Verification (manual): the owner confirms each of the seven observations above
in the running app, and reports anything that reads wrongly — wording,
missing announcement, or a marker that should not be there.
