# Implementation plan — 00000037 New combat rules, and nodes that run their course

## What this story is

Two rules changes that land together, because each removes the reason the
other's edge cases existed.

**Combat stops having a winner.**

- **Every fight is a draw.** Shields decide nothing. Both ships — the attacker
  and the ship it attacked — are returned to bays drawn at random, both
  stripped of every shield, and both squares are left empty. There is no
  winner, no `winner − (loser + 1)` cost, and no advance.
- **A ship standing on a charged node can neither attack nor be attacked.** The
  same protection a bay already gives, extended to a node a ship is holding. It
  applies to **charged** sites only: a ship on an **active** or a **dormant**
  site is an ordinary target and may attack like any other ship.
- **Every special condition on where a fight leaves a ship goes away** — the
  winner's advance, the walk back along the attack lane, and the blocked-advance
  case where the beaten ship's own return bay sat on the lane.

**Leaving a node stops ending it.**

- **§8.7 is deleted outright**, heading and all. A charged node that becomes
  unoccupied stays charged. It carries on draining at the slower empty rate
  (§8.3) until its drain reaches capacity, and only then goes dormant.
- **Every node therefore goes dormant at, or a little past, 60**, so recovery
  (§8.2) always starts from about the same level and always takes about ten
  turns. "A node ended early comes back sooner" disappears with the way of
  ending one early.
- **Nothing goes dormant mid-turn any more.** A site's state changes only in
  §8.6's end-of-turn sequence, never while an action is being resolved.

**What this does to shields, stated plainly.** After this story a shield does
nothing good for the ship carrying it. Shields used to buy strength at the cost
of reach; strength is gone and the cost of reach remains. A shield is now the
weight a ship picks up by holding a node: the longer it holds one, the slower it
becomes and the harder it is to leave. That is a deliberate reframing, not an
oversight, and every place the documents advertise shields as a combat advantage
has to stop.

**Why the two halves are one story.** The combat change alone would leave §8.7
with one live case out of four (a ship simply moving off) and a long explanation
of three cases that could no longer happen — a fight can no longer end a node,
because neither combatant may be standing on one. Deleting §8.7 is cleaner than
pruning it. Together the two also keep the contest for a node alive: a holder
cannot be dislodged, so a node is taken by arriving first — but a holder may
still choose to leave, and because leaving no longer destroys the node, the
square it vacates stays lit and is worth racing for.

This is a **gameplay change**, so `doc/ruleset/rules.md` goes from **0.15** to
**0.16**, with one `doc/ruleset/changelog.md` entry covering both halves and a
matching `RULES_VERSION` bump, in its own commit ahead of any code (step 1).
**Tagging stays on hold**, per `CLAUDE.md` — no step tags anything.

### Vocabulary reminder for a cold reader (`CLAUDE.md`)

Planning documents and code say **ply**; `rules.md`, the UI and `README.md` say
**turn**. They are the same thing: everything one player does before play
passes, which in this game is one action (`ACTIONS_PER_PLY` is 1). **Site**,
**bay**, **action**, **round** and **move** are the same word everywhere;
**move** means the movement action specifically and is never a synonym for a
turn.

`CLAUDE.md` reserves **hub** as the code word for a charged site, but the code
does not in fact use it — `energy.ts` has `chargedNodesHeldBy`, `endOfTurn.ts`
raises `node-ran-out`. **New identifiers in this story follow the code as it
stands: "charged" and "node", not "hub."** Introducing `hub` for the first time
in a combat story would be a rename with no story behind it.

A **site** is one of the seventeen fixed positions; its state is `active`,
`charged` or `dormant`. A **node** is precisely a site that is charged.

### Settled decisions that are not to be re-opened

Fixed by the story before planning began:

1. The rules edit goes first, in its own commit, ahead of any code — 0.15 →
   0.16, one changelog entry covering both halves, `RULES_VERSION` bump. No
   tagging.
2. Every fight is a draw. No shield comparison survives anywhere.
3. Only **charged** sites protect. Active and dormant protect nothing.
4. §8.7 goes entirely; no replacement mechanic for ending a node early.
5. No numeric retune of anything — drain, recovery, pressure, capacity, energy
   tables, movement ranges, the shield cap, fleet size or game length.
6. No new artwork: no marker for a protected ship, no new treatment for a
   vacated node.
7. Shields are left as a pure movement cost, deliberately. Giving them a new
   purpose is a later story.

---

## Where the work lands

| File                         | What happens to it                                                                                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `doc/ruleset/rules.md`       | §1, §4.1, §5, §7, §7.1, §8.1, §8.2, §8.3, §8.5, §8.6 edited; §8.7 deleted; 0.15 → 0.16 (1)                                                                                                                           |
| `doc/ruleset/changelog.md`   | One new 0.16 entry at the top, covering both halves (1)                                                                                                                                                              |
| `src/rules/rulesVersion.ts`  | `RULES_VERSION` → `"0.16"` (1)                                                                                                                                                                                       |
| `src/rules/combat.ts`        | Two new refusal reasons (2); `resolveFight`, `FightOutcome`, `winnerAdvance` deleted (4)                                                                                                                             |
| `src/board/announcements.ts` | Two rejection sentences (2); `fightSentence` collapses, `winnerAdvanceClause` deleted (4); `nodeVacatedClause` deleted (5)                                                                                           |
| `src/board/squareLabel.ts`   | `PredictedFightOutcome` and its three wordings deleted; `SquareMark` simplified (3)                                                                                                                                  |
| `src/board/Board.tsx`        | Stops importing `resolveFight`; builds a plain target mark (3)                                                                                                                                                       |
| `src/board/BoardSquare.tsx`  | Comment and the target-mark test both follow `SquareMark`'s new shape (3)                                                                                                                                            |
| `src/rules/ply.ts`           | `FightResolvedEffect` loses `outcome`/`winner`; `applyAttack` collapses; `AdvancingWinner` and the advance checks go (4); `applyVacating` calls and `NodeVacatedEffect` go (5); `dormantBeforePly` plumbing goes (6) |
| `src/rules/vacating.ts`      | **Deleted** (5)                                                                                                                                                                                                      |
| `src/rules/endOfTurn.ts`     | §8.7 citations corrected (5); `runEndOfTurn` derives its own start-of-ply dormant set (6)                                                                                                                            |
| `src/rules/gameState.ts`     | `dormantSiteNames`' doc comment rewritten (6)                                                                                                                                                                        |
| `README.md`                  | Four passages rewritten (8)                                                                                                                                                                                          |

Tests touched, and by which step:

| Test file                         | Step(s) | Why                                                                       |
| --------------------------------- | ------- | ------------------------------------------------------------------------- |
| `src/rules/combat.test.ts`        | 2, 4    | The two new refusals; the `resolveFight` and `winnerAdvance` describes go |
| `src/board/announcements.test.ts` | 2, 4, 5 | Two rejection sentences; the fight sentence; the vacated clause goes      |
| `src/rules/ply.test.ts`           | 2, 4, 5 | Fixtures that attack a ship on a charged node; the advance describe; §8.7 |
| `src/board/squareLabel.test.ts`   | 3       | One target wording instead of three                                       |
| `src/board/Board.test.tsx`        | 2, 3, 4 | The predicted-outcome cases; the post-fight focus case                    |
| `src/board/BoardSquare.test.tsx`  | 3       | The target mark's new shape, if it constructs one                         |
| `src/rules/actions.test.ts`       | 2       | The §5 pass guard with the narrower set of legal attacks                  |
| `src/rules/fullGame.test.ts`      | 4, 6    | A fight now returns two ships; `runEndOfTurn`'s signature                 |
| `src/rules/endOfTurn.test.ts`     | 6       | The explicit `dormantBeforePly` sets go; step 6's exclusion is re-proved  |
| `src/rules/sitePool.test.ts`      | 6       | `runEndOfTurn`'s signature only                                           |
| `src/rules/camping.test.ts`       | 5, 7    | The §8.7 case is rewritten; two new integration cases are added           |
| `src/rules/vacating.test.ts`      | 5       | **Deleted** with its module                                               |
| `src/rules/seededReplay.test.ts`  | 4       | See **D9** — it may well need no edit at all; check, do not assume        |

Deliberately **not** touched:

- **`src/rules/movement.ts`.** `reachFrom` and `ReachEntry` are §6 and stay
  exactly as they are. §7 still borrows §6's range through `attackReach`.
- **`src/rules/sites.ts`, `chargeDraw.ts`, `energy.ts`, `bays.ts`,
  `gameLength.ts`, `shields.ts`, `fleet.ts`.** No number moves. The shield cap,
  the drain and recovery tables, the capacity, the pressure cap, the energy
  table, the bays and the game length are all unchanged.
- **Artwork and CSS** — `SiteMarker.tsx`, `ShipIcon.tsx`, `BoardSquare.css`,
  `Board.css`. A charged node standing empty is drawn exactly as a charged node
  is drawn today; its glow already tracks its drain through `siteCyclePosition`,
  which is now the whole truth about it. A protected ship gets no new marker.
- **`src/game/session.ts`.** `RejectionReason` is
  `MoveRefusalReason | AttackRefusalReason | "nothing-to-select"`, so the two new
  refusals flow through it with no edit.
- **`CLAUDE.md`.** No vocabulary changes.
- **Game record / replay format.** No new fields.

### Accessibility (`CLAUDE.md`)

No plan step tests accessibility. Existing automated tests are updated where the
path is straightforward. **No entry in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` is expected**: the
`node-vacated` announcement disappears because the event it announced no longer
happens, and the target square's three predicted outcomes collapse to one
because the game now has one outcome — neither is a loss of an accessible
behaviour that still has a subject. If an implementer nonetheless finds a real
loss, record it there.

---

## Design decisions and reasoning

This section is the design record for the story. Code in this repository does
not carry design history (`CONTRIBUTING.md`, "Comments"), so everything a future
reader needs to know about **why** is written here and nowhere else.

### D1 — The rules change lands first, and the code runs knowingly behind it

`CLAUDE.md` and `doc/guidelines/implementation-plan-guide.md` both require it:
`rules.md` is the single source of truth and the code implements it, so the
document is edited, the version bumped and the changelog written before any
behaviour changes. Stories 27, 29, 31 and 33 all did this; it is the house
pattern.

Both halves of the story go in **one** version bump and **one** changelog entry.
Splitting them would put a version on `main` in which a fight can no longer end
a node while §8.7 still says it can.

Between step 1 and step 6 the code is knowingly behind the document. The windows
are deliberate; no step should try to paper over the one it sits in:

| After step | The app behaves like this                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1          | 0.15 in full: shields decide fights, winners advance, leaving a node ends it                                                       |
| 2          | A ship on a charged node can neither attack nor be attacked; fights that do happen are still decided by shields                    |
| 3          | As step 2, plus a target square's accessible name no longer predicts a winner — one commit in which that name is ahead of the code |
| 4          | Every fight is a draw. Leaving a node still ends it (§8.7 still in the code)                                                       |
| 5          | 0.16 in full: leaving a node leaves it lit                                                                                         |
| 6          | 0.16 in full, with the end-of-turn sequence no longer asking its caller for something it can work out itself                       |
| 7          | 0.16 in full, with the consequences pinned end to end                                                                              |
| 8, 9       | 0.16 in full, with `README.md` telling the truth and the owner having played it                                                    |

The step-3 window is the only one where a **player-facing string** is briefly
ahead of the behaviour: for one commit a target square's name says "both ships
would return to bays" while the rules layer still decides fights by shields.
This is accepted deliberately. The alternative orderings are worse: doing the
label after step 4 forces `Board.tsx` to invent a placeholder outcome purely to
satisfy a type that is about to be deleted, and doing it inside step 4 makes a
single step carry both the rules-layer collapse and the whole presentation
change with two unrelated verification points. Step 3 also removes `Board.tsx`'s
dependency on `resolveFight`, which is what lets step 4 delete `resolveFight`
cleanly — so this ordering is the genuinely bottom-up one.

### D2 — The two new refusal reasons sit beside the bay pair, and are checked in the same order

`AttackRefusalReason` gains two members, named to read beside the existing
`"attacker-in-bay"` / `"target-in-bay"` pair. This plan uses
**`"attacker-on-charged-node"`** and **`"target-on-charged-node"`**; keep those
names unless something already claims them.

They are checked in `attackRefusalReason` in exactly the positions the bay
checks occupy — the attacker's own condition before anything about the target,
and both **before** range and path:

1. `game-over`
2. `not-your-ship`
3. `ship-already-acted`
4. `attacker-in-bay`
5. **`attacker-on-charged-node`**
6. `no-target-there`
7. `target-is-friendly`
8. `target-in-bay`
9. **`target-on-charged-node`**
10. `target-out-of-range`
11. `attack-path-blocked`

The ordering matters for the wording a player hears: a protected target that is
within reach must be refused as protected, not as out of range, or the sentence
tells the player something false about their own ship's range.

`legalTargets` picks both up automatically, because it filters every square in
reach through `attackRefusalReason`. Its own early-exit list — which today
returns an empty array immediately when the attacker is not the side to move,
has already acted, or is in a bay — gains "the attacker stands on a charged
node", exactly the way it carries the bay case today. That early exit is an
optimisation, not a second rule: it must agree with `attackRefusalReason` and is
tested to.

"Standing on a charged node" is read with `siteStateAt` from `gameState.ts`,
which `combat.ts` already imports from for `shipsBySquare`. No new module and no
new query is needed.

**Rejected:** one combined reason for both ships (e.g. `"node-protected"`). The
board has to say two different things — "your ship cannot attack from there" and
"you cannot attack that ship" — and a single reason would force the wording
layer to work out which ship it was talking about, which is exactly the
information the refusal reason exists to carry.

**Rejected:** protecting active or dormant sites. Explicitly out of scope. A
regression test pins that both remain ordinary.

### D3 — `applyVacating` and its module are **deleted**, not left with no call sites

The story calls this the plan's call and says deleted. This plan confirms it:
delete `src/rules/vacating.ts` and `src/rules/vacating.test.ts` outright, with
`applyVacating`, `VacatingResult` and `NodeVacatedEffect`.

The reasoning is `CLAUDE.md`'s: rule logic in `src/` implements `rules.md` and
"never carries a rule the document does not state". The module **is** §8.7 — its
file comment says so in its first line — and §8.7 will not exist. A module left
in the tree with no call sites is a rule the document does not state, sitting
there waiting to be called back into service by someone who does not know it was
repealed. There is no backwards compatibility in this repository (`CLAUDE.md`):
a game played under 0.15 is replayed by checking out 0.15, not by keeping 0.15's
code alongside 0.16's.

**Rejected:** removing the call sites and keeping the module. It leaves dead
code carrying a section number that no longer exists, and `npm run lint` will
not catch it because the exports are still exports.

**Rejected:** keeping `NodeVacatedEffect` in the effect unions "in case". An
effect that can never be raised is a branch every consumer must keep handling
for nothing.

### D4 — `runEndOfTurn` derives its own "dormant before this ply" set, and the parameter goes

The story calls this the plan's call. This plan **drops the
`dormantBeforePly` parameter** and has `runEndOfTurn` compute the set itself, at
entry, with `dormantSiteNames(state)`.

Why it is now correct. Step 6 of §8.6 must recover exactly those sites that were
dormant **before this turn began**, never one that went dormant during this very
sequence (step 3 produces those). The parameter existed because a site could
also go dormant **mid-ply**, under §8.7, before `runEndOfTurn` was ever entered
— so the state `runEndOfTurn` received could not be trusted to tell it which
sites had been dormant all along. With §8.7 gone, **no action changes a site's
state at all**, so the set of dormant sites at the moment `runEndOfTurn` is
entered is exactly the set from the start of the ply. Steps 1 and 2 of the
sequence do not touch site states either, so computing it at entry, before step
3 runs, is exact.

Why it is better than keeping the parameter:

- It removes an obligation the caller can silently get wrong. Passing the wrong
  set does not throw; it quietly recovers a node a turn early or holds one back
  a turn, which is the kind of bug that shows up as a drifting economy weeks
  later.
- It removes the last piece of "the caller knows something the function cannot"
  from this module, which is what made the doc comment long.
- It is **more** robust to a future ruleset with more than one action per ply,
  not less. Today's doc comment has to explain that the caller can only build
  the set because `ACTIONS_PER_PLY` is 1; derived at entry, the set is right for
  any number of actions, as long as no action changes a site's state. That
  invariant is exactly what step 4's strengthened `assertFightInvariants` and
  `ply.test.ts`'s "nothing a ship does changes any site's state" describe pin.

The one thing this **costs** is the ability of a test to force the exclusion by
handing in an arbitrary set. `endOfTurn.test.ts` currently proves step 6's
exclusion by calling `runEndOfTurn(state, new Set())` and
`runEndOfTurn(state, new Set(["H8"]))`. Those become tests that build a state in
which a node genuinely runs out in step 3 and assert it does not also recover in
step 6 of the same sequence, then that it does recover at the end of the next
one. That is a **better** test — it exercises the real path rather than a seam —
and step 6 of this plan is largely that rewrite.

`dormantSiteNames` stays where it is, exported from `gameState.ts`, and becomes
`endOfTurn.ts`'s own import. Its doc comment currently says it is "how a caller
captures 'dormant before the ply began' for `runEndOfTurn`'s second argument";
that has to be rewritten, since there is no second argument.

**Rejected:** keeping the parameter with a rewritten justification. The story
permits it, but the only justification left would be "so a test can force it",
which is not a reason a production signature should carry.

**Rejected:** snapshotting a start-of-ply dormant set into `GameState`. It adds
a field to the game state — and therefore to every recorded game — to carry
something derivable.

### D5 — `FightResolvedEffect` keeps its name and its `fight-resolved` type string

The story calls this the plan's call. This plan **keeps the name**, and keeps it
as **one effect for the whole fight**.

- It is still a fight, and it is still resolved. What changed is the outcome,
  not the category of event.
- The type string `"fight-resolved"` is read by `announcements.ts`,
  `fullGame.test.ts`, `seededReplay.test.ts` and the board. Renaming it touches
  every one of them for no gain and makes the step's diff much harder to review
  against the behaviour change that actually matters.
- The alternatives are worse. `"fight-drawn"` borrows the vocabulary of a game
  result (§9's draw) for something quite different. `"ships-returned"` describes
  the consequence rather than the event, and would read oddly beside
  `"ply-ended"` and `"node-ran-out"`, which both name what happened.

What the effect keeps: `attacker` and `defender`, both `FightShip`, describing
the two ships **as they stood before the fight** — including the shields they
were carrying, which the announcement no longer needs but which is the honest
record of the fight and costs nothing. And `returns`, with **exactly two**
entries, **attacker first**.

What it loses: `outcome` and `winner`. `FightShip` and `FightReturn` are
unchanged.

**Rejected:** dropping `attacker.shields` / `defender.shields` now that shields
decide nothing. They are still true facts about the fight, they are what a
future game record would want, and removing them is a separate decision with no
story behind it.

### D6 — `SquareMark`'s target member becomes the plain string `"target"`

The story calls this the plan's call and forbids a type that keeps a field which
can only hold one value. This plan makes `SquareMark` a plain three-member
string union: `"selected" | "destination" | "target"`.

- `PredictedFightOutcome` and `PREDICTED_OUTCOME_WORDING` are deleted, and
  `MARK_WORDING` gains a third entry so all three marks are worded in one place
  again, exactly as they were before predicted outcomes were introduced.
- `Board.tsx` sets `mark = "target"` and stops importing `resolveFight`.
- `BoardSquare.tsx` tests `mark === "target"` instead of
  `typeof mark === "object" && mark.kind === "target"`. **Nothing it draws
  changes**: the target ring is already the same ring for all three outcomes.
  Only its comment changes.

The wording of the target mark says what now actually happens. This plan's
wording is **"can attack here, both ships would return to bays"** — which is the
existing mutual-return wording, already reviewed and already in the tests, so
the diff is a deletion of two strings rather than a rewrite of three. Keep it
unless something reads badly in context.

**Rejected:** keeping the object shape with a single-valued `kind`. The story
forbids it, and it would make `Board.tsx` allocate an object per target square
to carry no information.

**Rejected:** wording the mark as a bare "can attack here". It is true but it
throws away the one thing a player most needs to know before committing an
attack under the new rules — that it costs them their own ship's position too.

### D7 — `assertFightInvariants` gets **stronger**, not weaker

The advance is gone, so `AdvancingWinner`, the fourth parameter and every
lane/crossing check go with it. What remains, and must remain, is:

- Every ship in `before` is still in `after` (§7 never removes a ship).
- Every ship that did **not** return is on exactly the square it was on.
- Both returned ships are on bay squares, they do not share a bay, and each
  landed in a bay that held no ship in `before` — which is exactly what §7.1's
  "there is always somewhere to go" promises.
- Each side's fleet count is unchanged.

And the site-state check changes meaning. Today its message says the check is
only about "while the fight itself was resolving", because `applyVacating` was
applied afterwards to the very same `after`. After step 5 nothing is applied
afterwards, so the check becomes the plain, unconditional statement that **no
action changes a site's state**. The message must stop pointing at the vacating
rule.

Note the ordering across steps: step 4 removes the advance checks while
`applyVacating` still runs after the fight, so the site-state check's message
can only be fully corrected in **step 5**. Step 4 should leave the message
truthful for step 4 (still mentioning that vacating is applied afterwards) and
step 5 rewrites it. This is called out so the peer review does not read it as
step 4 forgetting.

### D8 — `attackReach` and `drawReturnBay` both stay, with corrected comments

`attackReach` stays. It is still how §7 borrows §6's range and it is still what
the path check reads. Its doc comment currently ends by saying both the legality
check and `winnerAdvance` "share one answer to 'what lane is this'"; with
`winnerAdvance` gone, the legality check is the only reader, and the comment
says so.

`drawReturnBay` stays **unchanged in behaviour**. This is load-bearing and is
why the story insists the work is deleting a branch rather than writing a new
one: `ply.ts`'s existing mutual-return path already draws the attacker's bay,
places it, then draws the defender's bay from the bays still empty, advancing
the seed once per ship. That branch becomes the only branch. Its comment's
qualifier "on a mutual return" becomes the ordinary case.

The module comment for `combat.ts` currently promises "who may attack whom, and
where a winning attacker ends up". It must be rewritten to what the module now
is: who may attack whom, and where a returning ship lands.

### D9 — `seededReplay.test.ts`: check it, do not assume it needs re-recording

The story warns that a fight now draws **two** bays where a decided fight drew
one, so the seed stream moves, and that any changed expectation there is
legitimate rather than a warning sign. That warning stands and the implementer
should hold onto it.

But the file as it stands has **no hard-coded recorded values**. It plays a game
twice from one seed and asserts the two runs agree, plays a third from a
different seed and asserts they differ, and checks that a forty-round game
produces at least ten bay returns and at least ten charge draws. Nothing in it
records a specific bay or a specific site. So in all likelihood it needs **no
edit at all**, and the honest expectation is that it simply keeps passing.

Where it could still move:

- The **at least ten** floors. Bay returns can only go up (two per fight), so
  that floor is safe. Charge draws are unaffected.
- The **different seeds diverge** case. The file's own comment says that if a
  future change makes that pair coincide, pick another pair. That is the
  sanctioned fix if it fires.
- The attack-first policy now finds fewer legal attacks, because ships on
  charged nodes are off limits. If the run becomes vacuous — under ten fights —
  that is a **finding to raise**, not a threshold to lower.

If any expectation in this file does have to move, **re-record it by running the
game**, never by hand-editing a value towards green.

### D10 — `sitePool.test.ts` will almost certainly not move, and that is not a mistake

The story expects this test's observed numbers to shift, because nodes are no
longer cut short by departures. In fact `runEconomy` starts from
`startingGameState` and **never moves a ship**: every ship stays in its opening
bay for all 500 turns, so no node was ever vacated in this test and §8.7 never
fired in it. Its numbers should therefore be unchanged, and the only edit it
needs is the call-signature change in step 6.

If its tolerances **do** need widening, that is a genuine surprise and is worth
saying so in the step's Notes. If it fails in a way that says the pool has
stopped being comfortable, raise it rather than relaxing a threshold.

### D11 — The `no-action` condition changing meaning is wanted, not a regression

`shipHasLegalAction` is `legalDestinations(...).length > 0 || legalTargets(...).length > 0`.
After step 2, a ship standing on a charged node has **no** legal targets at all,
so a node-holder that also has no legal move — a 4-shield ship boxed in, for
instance — now shows the board's `no-action` marker and says "no action
available this turn" in its accessible name. That is correct under the new
rules and needs no code. It is written down here so it is not mistaken for a
regression when it shows up on the board, and the owner is asked to look for it
in step 9.

The §5 pass guard follows from the same fact: a side whose only ships are on
nodes or out of range, with no legal move, passes, and §8.6's sequence still
runs in full for the passed turn. `actions.test.ts` gains cover for that in
step 2.

### D12 — Wording for the two new refusals

Two sentences join `rejectionSentence` in `announcements.ts`, in the players'
vocabulary ("node", never "hub"; "turn", never "ply") and matching the tone of
the bay pair sitting beside them:

- `attacker-in-bay` reads "A ship in a bay cannot attack. Move it out first."
- `target-in-bay` reads "A ship in a bay cannot be attacked."

So, in the same register:

- **attacker on a charged node** — that a ship holding a charged node cannot
  attack while it stands there, and that it must leave the node to attack. This
  plan's wording: _"A ship holding a charged node cannot attack while it stands
  there. Move it off first."_
- **target on a charged node** — that a ship holding a charged node cannot be
  attacked. This plan's wording: _"A ship holding a charged node cannot be
  attacked."_

Say **"charged node"**, not "node", in both sentences — the owner asked for it
explicitly at the plan gate. Although rules.md §2 defines a node as a site that
is charged, the word "node" appears loosely enough elsewhere in the app that a
refusal sentence naming the state leaves no room to wonder whether an unlit
site protects too; it is the charged state that grants the protection, and the
sentence should say so.

Use these unless something reads better in context; the tests should assert the
sentences the code ships, not these exact strings copied from the plan. Any
rewording keeps the words "charged node".

**Note for the implementer:** `rejectionSentence` is a `switch` over the
rejection reason with an annotated `string` return and no `default`. Adding a
member to `AttackRefusalReason` without adding its case makes the function fall
off the end and **fails `npm run typecheck`**. That compile coupling is why
step 2 carries the wording as well as the rule.

### D13 — The fight sentence collapses to the one it already produces for a draw

`fightSentence` currently branches three ways. Two branches go; what survives is
the sentence the mutual-return branch already produces — who attacked whom, that
both were beaten, and the two bays they landed in with no shields. It names both
ships, both bays and the loss of all shields, and it never mentions a winner or
an advance.

`winnerAdvanceClause` is deleted with the branch that called it.

Because there is now exactly one shape of fight, the function no longer needs
its "a decided fight always carries a winner" throw. It should keep a guard that
the effect exists at all, and may keep a guard that `returns` has two entries —
`ply.ts` guarantees it, so that is a bug detector, not a case to handle.

---

## Step 1 — Rules 0.16: every fight is a draw, and a node runs its course

Status: committed

Notes: Edited `doc/ruleset/rules.md` (§1, §4.1, §5, §6's closing sentence, §7,
§7.1, §8.1, §8.2, §8.3, §8.5, §8.6; §8.7 deleted outright), added one `## 0.16`
entry to `doc/ruleset/changelog.md` covering both halves, and bumped
`RULES_VERSION` to `"0.16"` in `src/rules/rulesVersion.ts`. No file under
`src/` other than `rulesVersion.ts` was touched. Followed the plan as written;
the only judgement calls were exact wording within the sentences the plan
sketched (e.g. §1's shield paragraph, §8.5's protection paragraph), all within
the plan's stated content and none introducing a rule the plan didn't call
for. Verified with `grep` that no reference to "8.7", "vacat", "winner"
(combat sense) or "advance" (combat sense) survives, and that no wrapped line
starting with a digit-and-full-stop tripped Prettier's list detection.

Edit `doc/ruleset/rules.md`, add **one** `doc/ruleset/changelog.md` entry
covering both halves, and bump `RULES_VERSION` in `src/rules/rulesVersion.ts` to
`"0.16"`. **No behaviour changes in this step** — no file under `src/` other
than `rulesVersion.ts` is touched. See **D1** for why this is its own commit and
how far behind the document the code then runs. **Do not tag anything**
(`CLAUDE.md`: tagging is on hold).

Read the whole of `rules.md` before editing. This change touches ten sections
and deletes an eleventh, and several of them cross-reference each other; a
reference left pointing at §8.7 is a defect this step must not ship.

**No section is renumbered.** §8.7 is the last subsection of §8, so deleting it
moves no other number. Renumbering would invalidate every `§8.x` citation in the
document and in the rule comments across `src/` — a price stories 27 and 29
already refused to pay.

### The version line

`**Rules version: 0.15**` becomes `**Rules version: 0.16**`.

### §7 Combat — rewritten

§7 keeps its number and its opening on range: an attack travels exactly as far
as a move, the same straight lines, every square it passes over must be empty,
the target square is of course occupied, and the site the target stands on
does not matter for **reach**. Keep "attacking is always the attacking player's
choice; ships never fight automatically". Drop "A ship may attack an enemy
stronger than itself" — there is no stronger.

What replaces the rest, in this order:

- **Who may not fight.** Neither ship may be in a bay, as today. **And neither
  ship may be standing on a charged node**: a ship holding a node cannot attack
  and cannot be attacked. State **both halves** explicitly — it is not only
  protection, it is also a cost, because a ship holding a node has given up
  striking out while it stands there. Say explicitly that this applies to
  **charged** sites alone: an active or a dormant site protects nothing, and a
  ship standing on one fights and is fought like a ship on an ordinary square
  (cross-reference §8.5).
- **The fight.** There is no winner. Both ships are returned to bays (§7.1) with
  0 shields, and both squares are left empty. Shields do not enter into it: a
  4-shield ship and an unshielded one come out of a fight identically.
- **What that means to play**, in a sentence or two, in the same voice the
  section currently uses to explain why attacking a near-equal is expensive. An
  attack is a **trade**: a player spends their own ship's position and shields
  to take away their opponent's. It is worth making when the enemy ship stands
  better than the attacker's own — beside a node, in the way, deep in the
  attacker's half — and not worth making otherwise.
- **And the two things that now follow about nodes.** A ship that reaches a node
  first cannot be driven off it, so nodes are contested by arriving rather than
  by force. And a holder who chooses to leave gives the node up **still lit**
  (§8.3), so the square it vacates is worth racing for.

Everything else in today's §7 goes: the shield comparison, the
`winner − (loser + 1)` formula and its worked examples, the whole "**The winner
advances**" paragraph, the node-changes-hands paragraph, the equal-shields
paragraph (its content is now the only rule and belongs in "The fight" above),
and the closing two paragraphs about the cost of attacking a near-equal and
about a won fight taking a node outright.

### §7.1 Returning to a bay — keeps its rule, loses its cases

Unchanged: the random draw from the bays **empty at that moment**, every empty
bay equally likely; the assurance that the choice is genuinely random and
neither player can see it coming; and that a returning ship is placed
immediately, as part of resolving the fight.

Changed: there is now only **one** shape of return. Every fight returns two
ships — the attacker placed first, the defender's bay then drawn from the bays
still empty — and fixing that order is what lets a recorded game replay exactly.
The "there is always somewhere to go" argument keeps only its **two-ship** form:
both ships were by definition on the board and not in a bay, so at least two
bays are empty and the attacker's placement can never leave the defender without
one. The single-ship form and the "the case above" framing go.

§7.2 (returning by choice) is **unchanged**.

### §4.1 Shields — rewritten around what a shield now is

The "opposite directions" sentence is now **false** and must go. Rewrite the
section around: a shield is **gained** by standing on a node (end of its owner's
turn, up to 4); it is **lost** on a dormant site (down to 0); it is **stripped
entirely** on returning to a bay (§7.1) or on ending a move in one (§3.1); and
every one a ship carries takes away part of its movement (§6) and with it part
of its attack range (§7). **It does nothing in a fight.** Say that plainly; do
not soften it and do not leave the old framing standing anywhere.

Keep the range 0 to 4, keep "an **active** site does neither", and keep that a
ship reduced to 0 shields is not destroyed — though "it is simply at its fastest
and its weakest" needs its second half reconsidered, since there is no longer a
weakest.

### §1 Overview — follows §4.1 and §7

- "A ship carries **shields**, which make it stronger in a fight but slower to
  move" is false: shields are the weight a ship picks up by holding a node —
  they slow it down and nothing more.
- "Shields are gained by sitting on a node and spent by winning fights" is
  false: there is no winning.
- "A ship that loses a fight is pushed back to a bay" becomes: a fight has no
  winner — **both** ships are pushed back to bays and stripped of their shields.
  Keep "Ships are never destroyed".
- **Add the refuge**: a ship holding a node cannot be attacked while it holds
  it.
- The three random elements are unchanged, though "which bay a beaten ship is
  pushed back to" now covers two ships a fight; adjust the wording if it reads
  oddly.

### §5 Turns and actions — the aside is reworded

The pass rule itself does **not** change. The aside explaining that an action is
not always available gains a **second reason** beside reach: a ship holding a
node has no attack available to it at all.

### §6 Movement — one closing sentence goes

§6's last paragraph ends "Winning a fight can still move the winning ship — see
section 7's advance, which is not a move." There is no advance; delete that
sentence. Keep "Moving and attacking are entirely separate: a ship never attacks
by moving onto its target", which is still true and still worth saying. (The
story's list of touched sections does not name §6; this sentence is a
consequence of deleting the advance and must not be left behind.)

### §8.1 The three states of a site

- The **charged** bullet gains the protection: still "producing energy: a ship
  standing on it collects (§8.4) and gains shields (§4.1)", and now also that
  the ship standing on it can neither attack nor be attacked (§7). **Active and
  dormant are untouched.**
- The start-of-game paragraph loses "and can be ended early by a ship stepping
  off it (section 8.7)". The five opening nodes still spread apart on their own,
  for the two reasons that remain: each drains at an independently drawn rate,
  and each is reached by ships at different turns. The paragraph should stand on
  those two.

### §8.2 Charging a site — the recovery paragraph loses its second case

"It goes dormant carrying whatever drain it had" becomes what is now true: a
node goes dormant at its capacity, or a little past it, because the drain draw
that tips it over may overshoot. So recovery always starts from about the same
level and always takes about ten turns. Delete "a node ended early comes back
sooner, in proportion to how much of it was left when it went dormant". The
recovery table and everything about the charge draw and pressure are unchanged.

### §8.3 How long a node lives — absorbs what is left to say

The closing "Holding a node is what uses it up. Section 8.7 covers the other way
a node ends: leaving it." is replaced by the single rule that now governs: a
node ends **one** way, when its drain reaches capacity. A ship leaving a node
does not end it — the node simply reverts to the slower empty rate and burns on.

The two lifetime figures (about 28 turns empty, about 13 held) are **unchanged**
and now bracket every node's life rather than being cut short by a departure.

### §8.5 Standing on a site that is not charged — says the other side of it

The section keeps its existing point that a ship may stay or leave exactly as
its owner prefers. It gains:

- Neither an active nor a dormant site offers what a charged node offers: a ship
  on one can be attacked like any other (§7), and may attack like any other.
- A ship whose node runs out under it **loses its protection at the same moment
  it starts paying**.
- Leaving now costs the node nothing.

### §8.6 End-of-turn order — the ordering tail drops its mid-turn case

**The six steps themselves do not change.** Step 6's "dormant before this turn
began" qualifier stays exactly as it is: it is still needed, because a node that
goes dormant in step 3 must not recover in step 6 of the same sequence.

In the closing paragraph, "a node that goes dormant in step 3 of turn N — or
mid-turn, by the vacating rule (section 8.7)" becomes step 3 alone. Add the
statement that a site's state now changes **only** in this sequence and never
during an action.

### §8.7 — deleted

The whole subsection goes, heading and all. Nothing renumbers. After deleting
it, search the document for every remaining reference to "8.7" and to the idea
of a node ending early, and make sure none survives.

### Untouched

§2, §3, §6 (apart from the one sentence above), §8.4, §9 and both appendices.
Appendix B's arithmetic still holds: a node's life was already described as a
mix of empty and held turns averaging about twenty, and recovery as about ten.

### The changelog

Add **one** `## 0.16 — …` entry at the top of `doc/ruleset/changelog.md`, in the
shape the existing entries use: a short title covering both halves, a line
saying it is a gameplay change and that tagging stays on hold, then bullets for
the substantive changes — §7's rewrite (no winner, both ships home at 0 shields,
the charged-node refuge on both sides, the advance and the shield cost deleted),
§7.1 keeping one shape of return, §4.1's reframing of what a shield is, §1 and
§5 following, §8.7's deletion and what §8.1, §8.2, §8.3, §8.5 and §8.6 absorb
from it. Say explicitly that both halves are one change made together. Do not
tag.

### Formatting

`rules.md` and `changelog.md` are covered by `npm run format:check`. Run
`npx prettier --write` on both after editing. Watch for a wrapped line that
begins with a digit followed by a full stop — Markdown reads that as an ordered
list item and Prettier will rejoin it — and choose break points that avoid it.

Verification (automated): `npm test` passes — `rulesVersion.test.ts` reads the
version line straight out of `rules.md` and also checks the changelog has an
entry for it, so a mismatch fails there. `npm run typecheck`, `npm run lint` and
`npm run format:check` pass. `git status` shows exactly `doc/ruleset/rules.md`,
`doc/ruleset/changelog.md` and `src/rules/rulesVersion.ts` changed, and nothing
else. `grep -n "8\.7" doc/ruleset/rules.md` returns nothing. A read-through of
§7, §7.1 and §4.1 confirms no sentence anywhere in the document still says
shields win a fight, that a winner advances, or that leaving a node ends it.

---

## Step 2 — A ship on a charged node can neither attack nor be attacked

Status: committed

Notes: `combat.ts` gained `attacker-on-charged-node` and
`target-on-charged-node` to `AttackRefusalReason`, checked via `siteStateAt`
in `attackRefusalReason` at the positions D2 sets out (attacker's own
condition right after `attacker-in-bay`; target's right after
`target-in-bay`; both ahead of range and path), and `legalTargets`' early
exit gained the attacker's charged-node case beside its bay case.
`announcements.ts` gained the two D12 rejection sentences verbatim. Added
cases to `combat.test.ts` (a new "on a charged node (§7)" describe: attacker
refused, target refused and absent from `legalTargets`, a protected target
within reach refused as protected rather than out of range, the attacker's
reason ahead of the target's when both are protected; plus one case in the
existing §8.5 describe proving the roles work swapped — attacker dormant,
target active), `announcements.test.ts` (the two new rows in the rejection
table), and `actions.test.ts` (`sideToMoveHasLegalAction` and
`shipHasLegalAction` both false for a ship boxed in on a charged node that
would otherwise have a legal target, per D11).

Several existing fixtures in `ply.test.ts` and one in `Board.test.tsx`
attacked or moved from a ship standing on a charged node and became illegal
once the refusal landed; per the step's instruction these were fixed, never
the rule:

- `Board.test.tsx`'s "keeps focus on the attacked square…" test used the
  default seed's H8, which starts charged; overrode `siteStates.H8` to
  `active` in that one fixture.
- `ply.test.ts`'s two fictitious-square cases ("changes no site on a
  defender's win…", "changes no site on a mutual return…") had the
  attacker's own square carrying a fictitious `"charged"` label on a square
  that isn't a real site; changed the label to `"active"`, which exercises
  the same non-real-site immunity the tests are about.
- `ply.test.ts`'s "nothing a ship does changes any site's state" fixture had
  its target (a real site, H8) charged; changed it to `dormant` with a high
  starting level (so three end-of-turn sequences cannot recover it) — an
  `active` alternative was tried first and rejected because with only one
  other real active site in the fixture, the end-of-turn charge draw is
  certain (pool of one) to charge it on the very first sequence, which
  contradicted the invariant under test.
- Six `ply.test.ts` tests had no viable fixture repair, because their entire
  premise — a fight leaving a winner standing on a charged node, or a fight
  vacating either side's own charged node — is now categorically
  impossible: to reach it, either the attacker's origin square or the
  defender's own square would have had to be charged, and both are now
  illegal to fight from or onto. This is exactly the "three cases that can
  no longer happen" the story's own design rationale names. These six were
  deleted rather than contorted into something they no longer are: "lets a
  winner reduced to 0 shields advance onto a charged node…", "leaves an
  already-charged node the winner advances onto charged…", "landing on a
  charged site during a winning advance leaves it charged", and four of the
  five fight-based cases under "§8.7 — leaving a node ends it" (the node
  changing hands, a drawn fight sending a node dormant, an occupant's own
  origin node going dormant on a win, and a losing attacker's own node going
  dormant) — replaced with one comment explaining why. This is a deviation
  from "fix the fixture" read literally, recorded here because the
  alternative (forcing an active/dormant substitute site into these
  fixtures) would have made each test assert something unrelated to its own
  title with no compensating value, and every one of them is already
  scheduled for full deletion in step 4 or step 5 regardless. The three
  move-based §8.7 cases (moving off a node, arriving on one, and the
  no-collection case) are untouched — moving off a node still works exactly
  as before this step.

Fights themselves are unchanged in this step, as scoped: `resolveFight` and
`winnerAdvance` are still in place and still decide any fight that is legal
to have. `npm run typecheck`, `npm run lint`, `npm run format:check` and
`npm test` all pass (800 tests).

Add §7's new legality rule to `src/rules/combat.ts`, and — because the
typechecker forces it, see **D12** — the two rejection sentences that go with it
in `src/board/announcements.ts`. **Fights themselves are unchanged in this
step**: a fight that does happen is still decided by shields.

Depends on: Step 1 (the document this implements).

### `src/rules/combat.ts`

- `AttackRefusalReason` gains **`"attacker-on-charged-node"`** and
  **`"target-on-charged-node"`**, declared beside the existing
  `"attacker-in-bay"` / `"target-in-bay"` pair (**D2**).
- `attackRefusalReason` checks them in the positions **D2** sets out: the
  attacker's own condition immediately after `attacker-in-bay`, the target's
  immediately after `target-in-bay`, and **both before** the range and path
  checks. Update the function's doc comment, which currently narrates the check
  order and explains why range comes last, to include the two new checks and the
  same reason.
- `legalTargets`' early-exit list gains "the attacker stands on a charged node",
  the way it already carries "the attacker is in a bay".
- Read the site state with `siteStateAt` from `./gameState`, which this module
  already imports from. **Only `"charged"` protects** — `"active"` and
  `"dormant"` do not.

### `src/board/announcements.ts`

Add a case to `rejectionSentence` for each new reason, worded as **D12** sets
out. Nothing else in this file changes in this step.

### Tests

- **`src/rules/combat.test.ts`** — add cases: an attacker on a charged node is
  refused with the attacker reason and `legalTargets` for it is empty; a target
  on a charged node is refused with the target reason and is absent from
  `legalTargets`; a **protected target within reach** is refused with the target
  reason and **not** as out of range (this pins the check order); the attacker's
  reason is reported ahead of the target's when **both** stand on charged nodes;
  and — extending the existing "on a site that is not charged (§8.5)" describe —
  a ship on an **active** site and a ship on a **dormant** site are both
  ordinary targets and both may attack.
- **`src/board/announcements.test.ts`** — the two new rejection sentences.
- **`src/rules/actions.test.ts`** — §5's pass guard with the narrower set of
  legal attacks: a side whose only ships stand on charged nodes and have no
  legal move has no legal action; and, through `applyPassGuard`, its turn passes
  and the end-of-turn sequence runs in full for the passed turn.
- **`src/rules/ply.test.ts` and `src/board/Board.test.tsx`** — several existing
  fixtures attack a ship standing on a **charged** site and will now be refused.
  `ply.test.ts`'s "nothing a ship does changes any site's state" describe is one
  (it attacks a ship on a charged H8). **Fix the fixture, never the rule**: move
  the site state off the target's square, or make the target's site active
  instead of charged, whichever preserves what the test was actually about. Run
  the full suite and work through every failure this way.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass with the new cases present. The new combat cases
must show, at minimum: an attack **on** a ship on a charged node is refused with
`"target-on-charged-node"` even though it is in range; an attack **from** a ship
on a charged node is refused with `"attacker-on-charged-node"` and that ship
offers no targets at all; and both an active and a dormant site leave attacking
and being attacked entirely unaffected.

---

## Step 3 — A target square reads one way

Status: committed

Notes: Deleted `PredictedFightOutcome` and `PREDICTED_OUTCOME_WORDING` from
`squareLabel.ts`; `SquareMark` is now the plain `"selected" | "destination" |
"target"` union, `MARK_WORDING` carries all three wordings (target reusing
the existing mutual-return string, per D6), and `squareLabel` dropped its
`typeof mark === "string"` branch. `Board.tsx` no longer imports
`resolveFight` and sets `mark = "target"` directly. `BoardSquare.tsx`'s
render condition is `mark === "target"`; nothing it draws changed, only its
file comment. Updated `squareLabel.test.ts` (the three outcome cases become
two, both asserting the one wording), `BoardSquare.test.tsx` (every
`{ kind: "target", outcome: ... }` construction becomes the plain string
`"target"`), and `Board.test.tsx` (renamed the two tests that referenced "the
predicted outcome" to describe what attacking now does, updated their
expected accessible names, and replaced "produces the right predicted
outcome for every combination of 0-4 against 0-4" with "reads a legal target
the same one way whatever shields either ship carries", which sweeps the
same 0-4 x 0-4 grid but asserts the single wording instead of computing an
outcome via `resolveFight`; also dropped the now-unused `resolveFight`
import). No rules-layer file was touched, as scoped. `npm run typecheck`,
`npm run lint`, `npm run format:check` and `npm test` all pass (799 tests).
The plan's closing `grep -rn "PredictedFightOutcome\|attacker-won\|defender-won"
src/board/` still finds hits in `announcements.ts` and `announcements.test.ts`
— those are `FightResolvedEffect.outcome` (`FightOutcome`'s values from
`combat.ts`), an unrelated type this step does not touch and step 4 deletes;
confirmed no hit remains in any file this step edited
(`squareLabel.ts`/`.test.ts`, `Board.tsx`/`.test.tsx`,
`BoardSquare.tsx`/`.test.tsx`). No deviation from the plan otherwise.

Collapse the board's three predicted fight outcomes to the single thing that now
happens. **No rules-layer file changes in this step.** See **D6** for the shape
chosen and **D1** for why this step comes before the rules-layer collapse: it is
what removes `Board.tsx`'s dependency on `resolveFight`, so step 4 can delete
`resolveFight` without inventing a placeholder.

Depends on: Step 1 (the document), Step 2 (only in sequence; no code dependency).

### `src/board/squareLabel.ts`

- Delete `PredictedFightOutcome` and `PREDICTED_OUTCOME_WORDING`.
- `SquareMark` becomes the plain union `"selected" | "destination" | "target"`.
- `MARK_WORDING` covers all three marks again, so the wording for every mark
  lives in one record. The target wording is **"can attack here, both ships
  would return to bays"** (**D6**).
- `squareLabel` no longer needs its `typeof mark === "string"` branch — every
  mark is a string.
- The module comment's closing paragraph ("A target square's mark names the
  fight's predicted outcome rather than a fixed phrase, so a listener does not
  have to hold two ships' shield counts across two focus stops") describes
  something that no longer exists. Replace it with what is now true: a fight has
  one outcome, so a target square's mark is a fixed phrase saying what attacking
  there does.

### `src/board/Board.tsx`

- Stop importing `resolveFight` from `../rules/combat`; `legalTargets` is still
  needed.
- The target branch sets `mark = "target"`. Everything else about how the
  component builds squares is unchanged.

### `src/board/BoardSquare.tsx`

- The target-mark render condition becomes `mark === "target"`.
- **Nothing it draws changes.** The ring is already outcome-independent.
- Its file comment describes a predicted outcome that no longer exists; correct
  it.

### Tests

- **`src/board/squareLabel.test.ts`** — the three predicted-outcome cases become
  one: a mark of `"target"` produces the one wording, in the right position in
  the name (last, after the condition).
- **`src/board/Board.test.tsx`** — "produces the right predicted outcome for
  every combination of 0-4 against 0-4" loses its reason to exist. Replace it
  with a case proving the **opposite**: every legal target reads the same one
  way whatever shields the two ships carry. "marks legal targets distinctly from
  legal destinations, naming the predicted outcome" and "highlights a target two
  squares away for a 1-shield ship, with the predicted outcome" keep their point
  — a target is marked and named distinctly from a destination — with the
  outcome wording updated.
- **`src/board/BoardSquare.test.tsx`** — update wherever it constructs a target
  mark.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass. `grep -rn "PredictedFightOutcome\|attacker-won\|defender-won" src/board/` returns
nothing. A target square's accessible name reads the one wording regardless of
either ship's shields, and the ring drawn on the board is unchanged.

---

## Step 4 — Every fight is a draw

Status: committed

Notes: `combat.ts` lost `FightOutcome`, `resolveFight` and `winnerAdvance`
(with the now-unused `ShieldCount`/`isShieldCount` imports), kept
`attackReach` and `drawReturnBay` with corrected comments, and the module
comment now describes "who may attack whom, and where a returning ship
lands." `ply.ts`'s `FightResolvedEffect` lost `outcome` and `winner`,
`AdvancingWinner` is deleted, `assertFightInvariants` dropped its fourth
parameter and every lane/crossing check (per D7, its site-state check
message still cites the vacating rule applied afterwards — correct for this
step, step 5's job to fix), and `applyAttack` collapsed to the single
mutual-return body. `announcements.ts` deleted `winnerAdvanceClause` and the
now-dead `shieldsPhrase` helper (unused once the two decided-fight sentences
it served were removed — not called out explicitly in the plan text but
required by `noUnusedLocals`), and `fightSentence` collapsed to the one
sentence per D13.

Tests: rewrote `combat.test.ts`'s deleted `resolveFight`/`winnerAdvance`
describes away along with their now-unused imports
(`COLUMN_LETTERS`/`squareAt`/`BOARD_SIZE`/`ReachEntry`/`reachFrom`/`MAX_SHIELDS`/
`MIN_SHIELDS`/`SITES`/`ALL_SHIELD_COUNTS`); reworked `ply.test.ts`'s
`applyAttack` describe into the single-outcome shape (a parameterised
4-vs-0/2-vs-2/0-vs-4 case, seed-advances-twice, both-bays-distinct, and the
"marks the attacker as acted" case), deleted the "winner's advance" describe
outright (its every case is now illegal or meaningless), fixed the fight leg
of "nothing a ship does changes any site's state" and `assertFightInvariants`
(dropped the two lane/crossing cases, all remaining calls lose their fourth
argument), and deleted the now-unused `shipsFillingEveryBayExcept` helper;
`fullGame.test.ts`'s two "draws a beaten ship's return only from the bays
empty at the start" cases now expect two returns as D9/the plan's own
verification anticipated; `announcements.test.ts`'s combat describe
collapsed to four cases proving the one sentence (naming both ships and both
bays, never a winner), and its two other `FightResolvedEffect` fixtures
(the §8.7 node-vacated-by-a-fight case, and the game-ending-attack case) lost
`outcome`/`winner` and gained a second `returns` entry; `Board.test.tsx`'s
"keeps focus on the attacked square" test was retitled and now asserts the
square is empty afterwards with the new sentence, rather than showing a
"winner". `seededReplay.test.ts` needed no edit, exactly as D9 predicted.

`npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
all pass (772 tests). `grep -rn "winnerAdvance\|resolveFight\|FightOutcome\|attacker-won\|defender-won" src/`
and a separate check for `AdvancingWinner`/`PredictedFightOutcome` both
return nothing. No deviation from the plan beyond the `shieldsPhrase`
deletion noted above, which the plan didn't call out by name but which
`noUnusedLocals` requires once its only two call sites were removed with the
decided-fight sentences.

Collapse combat to its single outcome. This is the story's central change and it
is one behaviour with one verification point: **any two ships that fight both
end in bays with 0 shields, and both squares they came from are left empty.**

Depends on: Step 1 (the document), Step 3 (`Board.tsx` no longer calls
`resolveFight`, so it can be deleted here).

**The mutual-return path already exists and is already correct.** `ply.ts` today
draws the attacker's bay, places it, then draws the defender's bay from the bays
still empty, advancing the seed once per ship. That branch becomes the **only**
branch. The work is deleting the other one, not writing a new one.

### `src/rules/combat.ts`

- **Delete** `FightOutcome` and `resolveFight`.
- **Delete** `winnerAdvance`, with its lane walk and its re-check of occupancy
  (which existed only for the blocked-advance case).
- Remove the imports left unused by those deletions (`ShieldCount`,
  `isShieldCount`; `noUnusedLocals` will find them).
- `attackReach` **stays**, unchanged in behaviour. Its doc comment loses the
  claim that it and `winnerAdvance` share one answer (**D8**).
- `drawReturnBay` **stays**, unchanged in behaviour. Its comment's "On a mutual
  return, call this once…" becomes the ordinary case: call it once for the
  attacker, then again against the state that already holds the attacker **and
  the advanced seed**, for the defender (**D8**).
- Rewrite the module comment: the module is now who may attack whom, and where a
  returning ship lands.

### `src/rules/ply.ts`

- `FightResolvedEffect` **keeps its name and its `"fight-resolved"` type
  string** (**D5**) and loses `outcome` and `winner`. What remains is `attacker`
  and `defender` as they stood before the fight, and `returns` with **exactly
  two** entries, **attacker first**. Rewrite its doc comment accordingly.
- **Delete** the `AdvancingWinner` interface.
- `assertFightInvariants` loses its fourth parameter and every advance and
  crossing check (**D7**). It keeps: no ship missing; every non-returning ship
  on the square it was on; both returned ships on distinct bay squares that held
  no ship before the fight; fleet counts unchanged; and the site-state identity
  check. Its "changed square in a fight it neither lost nor won as the attacker"
  message needs rewording — there is no attacker exemption left, so it now says
  only a returning ship may change square. **Leave the site-state check's
  message mentioning that the vacating rule is applied afterwards**; that is
  still true in this step and step 5 corrects it (**D7**).
- `applyAttack` loses its branch entirely. What survives is today's
  mutual-return body: draw and place the attacker, draw and place the defender
  from the bays still empty, advance the seed once per ship, build the one
  `fight-resolved` effect with both returns, assert the invariants, mark the
  attacker as having acted, spend the action, and run the end-of-action tail
  exactly as now. The `applyVacating` call stays in this step (step 5 removes
  it). Rewrite the function's doc comment.
- Rewrite the module comment's description of what an attack does.

### `src/board/announcements.ts`

- **Delete** `winnerAdvanceClause`.
- `fightSentence` collapses to the single sentence the drawn-fight branch
  already produces (**D13**), and drops the "a decided fight always carries a
  winner" throw. Update its doc comment — the note about a losing attacker
  reading as a deliberate choice no longer applies.

### Tests

- **`src/rules/combat.test.ts`** — delete the `resolveFight` and `winnerAdvance`
  describes entirely. Nothing replaces them; the behaviour they tested does not
  exist.
- **`src/rules/ply.test.ts`** — delete the "the winner's advance (rules.md §7)"
  describe entirely. Rework the `applyAttack` describe so its cases assert the
  one outcome, including at minimum: **4 against 0, 2 against 2, and 0 against
  4** all send both ships to bays at 0 shields with both original squares empty;
  the effect carries exactly two `returns`, attacker first; the seed advances
  exactly twice; the two bays are distinct and were both empty before the fight;
  and the attacker is marked as having acted even though it ends the action in a
  bay itself. Rework the `assertFightInvariants` describe for the three-argument
  signature, keeping its hand-constructed impossible before/after pairs.
- **`src/rules/fullGame.test.ts`** — the two "draws a beaten ship's return only
  from the bays empty at the start" cases now expect **two** returns, both
  landing in the two bays left empty. That pair of tests becomes a direct proof
  of §7.1's two-ship "there is always somewhere to go" argument, since exactly
  two bays are free.
- **`src/board/announcements.test.ts`** — the fight-sentence cases collapse to
  the one sentence; assert it names both ships, both bays and the loss of all
  shields, and mentions no winner and no advance.
- **`src/board/Board.test.tsx`** — "keeps focus on the attacked square, which
  now shows the winner having taken it" is no longer true: after a fight the
  attacked square is **empty**. Keep the focus assertion, which is what the test
  is really about, and update what the square now shows.
- **`src/rules/seededReplay.test.ts`** — read **D9** before touching it. Most
  likely it needs no edit. If an expectation must move, re-record it by running
  the game.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass. The new `ply.test.ts` cases must show that 4-vs-0,
2-vs-2 and 0-vs-4 fights are **indistinguishable** in outcome — both ships in
bays at 0 shields, both original squares empty, two seed advances, two distinct
bays — and `grep -rn "winnerAdvance\|resolveFight\|FightOutcome\|attacker-won\|defender-won" src/`
returns nothing.

---

## Step 5 — The vacating rule leaves the code

Status: committed

Notes: Deleted `src/rules/vacating.ts` and `src/rules/vacating.test.ts` with
`applyVacating`, `VacatingResult` and `NodeVacatedEffect`. `ply.ts` dropped
the import and both `applyVacating` calls (in `applyMove` and `applyAttack`,
each now feeding its own post-action state straight to
`applyEndOfActionTail`), dropped `NodeVacatedEffect` from `MoveEffect` and
`AttackEffect`, rewrote the module comment's site-state sentence to "nothing
a ship does changes a site's state," and corrected `applyMove`'s and
`applyAttack`'s doc comments plus `assertFightInvariants`' site-state check
and its thrown message to the unconditional "no action changes a site's
state" per D7. `announcements.ts` dropped the `vacating` import,
`nodeVacatedClause`, the `vacatedClauses` list and its ordering in
`actionEndingClauses`, and rewrote that function's doc comment.
`endOfTurn.ts`'s two §8.7 citations (the `dormantBeforePly` doc comment and
step 6's inline comment) were corrected to cite only step 3 as the source of
mid-sequence dormancy; `dormantBeforePly` itself is untouched, as step 6's
job.

Tests: retitled and rewrote `ply.test.ts`'s "still throws when a site's
state changes..." case to drop its §8.7/vacating-rule wording; replaced the
"§8.7 — leaving a node ends it" describe with "a ship leaving a node no
longer ends it (rules.md §8.3)", whose first case now asserts a charged
node stays charged after a ship moves off it, with its drain risen by
exactly that turn's empty-table draw (computed via `drawTableAmount` and
`EMPTY_NODE_DRAIN_TABLE`, both newly imported from `./sites`) and no
`node-vacated` effect anywhere in the result; kept its "arrives" and
"collects no energy" sibling cases, which were already about the move-based
behaviour and needed no rule change, and dropped a now-stale comment
explaining why fight-based cases used to sit there. Rewrote
`camping.test.ts`'s "leaving a node for a dormant site" describe the same
way — the vacated node now stays charged with a risen level and no
`node-vacated` effect — and retitled it without the §8.7 reference.
Deleted `announcements.test.ts`'s whole "announcementFor — a node vacated"
describe, since the event it covered no longer occurs.

Deviation: none from the plan's substance. One point of tension worth
recording: the plan's own verification line asks for `grep -rn "vacat" src/`
to return nothing, but the plan's own test instructions for this step (and
step 7's later cases) require asserting the _absence_ of a `node-vacated`
effect, which necessarily puts the string `"node-vacated"` in test code
(`ply.test.ts`, `camping.test.ts`) — a handful of unrelated hits on the
ordinary English word "vacated" also remain in `combat.test.ts` and
`ply.test.ts`, describing bays a ship moved out of, not the deleted rule.
Treated the grep instruction as being about the rule and its module, not
about forbidding a negative assertion that proves the rule is gone; no
reference to `applyVacating`, `NodeVacatedEffect`, `VacatingResult` or
section 8.7 remains anywhere in `src/`.

Verification: `npm run typecheck`, `npm run lint`, `npm run format:check`
and `npm test` all pass (43 files, 759 tests).

Delete `src/rules/vacating.ts` and `src/rules/vacating.test.ts`, and every
reference to them. After this step, a charged node that becomes unoccupied stays
charged and goes on draining at the empty rate until it reaches capacity. See
**D3** for why the module is deleted rather than left uncalled.

Depends on: Step 1 (the document), Step 4 (a fight can no longer leave a node,
so the only remaining caller of `applyVacating` with anything to do is
`applyMove`).

### Deletions

- `src/rules/vacating.ts` — with `applyVacating`, `VacatingResult` and
  `NodeVacatedEffect`.
- `src/rules/vacating.test.ts`.

### `src/rules/ply.ts`

- Drop the import and **both** `applyVacating` calls — the one in `applyMove`
  and the one in `applyAttack`. In each case the state that was fed to
  `applyVacating` is passed straight to `applyEndOfActionTail` instead.
- `NodeVacatedEffect` leaves the `MoveEffect` and `AttackEffect` unions.
- The module comment's sentence beginning "Exactly one thing a ship does changes
  a site's state…" is now **false in the opposite direction**: nothing a ship
  does changes a site's state. Say that.
- `applyMove`'s and `applyAttack`'s doc comments lose their §8.7 sentences.
- `assertFightInvariants`' site-state check message is now corrected to the
  unconditional statement (**D7**): no action changes a site's state, full stop.
  It must stop pointing at a vacating rule that is applied afterwards, because
  nothing is applied afterwards.

### `src/board/announcements.ts`

- Drop the `NodeVacatedEffect` import, `nodeVacatedClause`, and the
  `vacatedClauses` list in `actionEndingClauses` together with the ordering that
  put it ahead of the end-of-turn clauses. The clauses that remain keep their
  existing order.
- Rewrite `actionEndingClauses`' doc comment, which currently opens by
  describing the vacated-node clauses.
- The end-of-turn "node at X ran out" announcement is **untouched** and becomes
  the only way a player hears that a node has gone dark.

### `src/rules/endOfTurn.ts`

Two comments cite §8.7's mid-ply dormancy and must be corrected — the
`dormantBeforePly` doc comment and step 6's inline comment. **Step 6's exclusion
of sites that went dormant during this sequence stays**: step 3 still produces
them. The `dormantBeforePly` parameter itself stays in this step; step 6 of this
plan removes it.

### Tests

- **`src/rules/ply.test.ts`** — the "§8.7 — leaving a node ends it" describe is
  deleted and **replaced** by a describe proving the opposite: a ship that moves
  off a charged node leaves it **charged**, with no `node-vacated` effect
  anywhere in the result; the node's state is still `charged` after the move
  resolves; and its drain has risen only by that turn's ordinary §8.3 draw from
  the **empty** table, not the held one.
- **`src/rules/camping.test.ts`** — "camping — leaving a node for a dormant site
  (§8.5, §8.7)" is rewritten: the node it left stays charged, and no
  `node-vacated` effect is raised. Retitle it without the §8.7 reference.
- **`src/board/announcements.test.ts`** — the `node-vacated` cases go.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass. `grep -rn "vacat" src/` returns nothing, and
`ls src/rules/vacating*` finds no file. The new `ply.test.ts` cases must show a
ship moving off a charged node leaving it charged with its drain risen only by
the empty-rate draw, and no announcement made about it.

---

## Step 6 — `runEndOfTurn` works out its own start-of-ply dormant set

Status: committed

Notes: `runEndOfTurn` now takes only `state` and computes `dormantBeforePly`
internally via `dormantSiteNames(state)` at entry, per D4; its doc comment
and the module comment's closing line were rewritten to explain why the
set captured at entry is exact rather than describing a parameter. Dropped
the parameter from `applyEndOfActionTail` in `ply.ts` and both its call
sites (`applyMove`, `applyAttack`), and from the two direct `runEndOfTurn`
callers in `applyPassGuard`; the `dormantSiteNames` import left `ply.ts`
entirely. Rewrote `dormantSiteNames`' doc comment in `gameState.ts` to drop
its reference to the deleted second argument.

In `endOfTurn.test.ts`, inlined the now-unnecessary `runEndOfTurnFresh`
helper (every call is fresh) and rewrote the four cases that drove step 6
by passing an explicit `dormantBeforePly` set: all four already had a
fixture that was genuinely charged or genuinely dormant at the moment
`runEndOfTurn` was called, so the explicit sets were dropped outright with
no fixture changes needed beyond that — the real state already carried
the set `runEndOfTurn` now derives on its own. The two-call test ("does
not recover a site that only went dormant during this very sequence")
keeps its structure (first call proves no early recovery, second call on
`result.state` proves recovery at the end of the next sequence) but now
drives both calls through the genuine state rather than a hand-built set,
which is the better test D4 anticipated. Dropped the `dormantSiteNames`
import from `endOfTurn.test.ts`, `fullGame.test.ts` and `sitePool.test.ts`
along with their now-argumentless `runEndOfTurn` calls; per D10,
`sitePool.test.ts` needed no other change and its tolerances did not move.

No deviation from the plan. `npm run typecheck`, `npm run lint` and
`npm test` all pass (759 tests, unchanged from step 5 — this step edits
existing tests rather than adding new ones). `npm run format:check` flags
only the pre-existing `implementation-plan.md` warning that predates this
step (confirmed present on the unmodified step-5 commit via `git stash`).
`grep -rn "dormantBeforePly" src/` finds only the internal local variable
and comments inside `runEndOfTurn` itself, and `grep -rn "second argument"
src/` finds nothing.

Remove `runEndOfTurn`'s `dormantBeforePly` parameter and have the function
derive the set itself. See **D4** for the full reasoning, including why this is
now correct and why it is a genuine simplification rather than a tidy-up.

Depends on: Step 5 (this is only correct once no action can change a site's
state, which is true only after §8.7 leaves the code).

### `src/rules/endOfTurn.ts`

- `runEndOfTurn` takes only `state`. At **entry**, before step 3 runs, it
  computes the dormant set with `dormantSiteNames(state)` from `./gameState` and
  uses that in step 6 exactly as it uses the parameter today.
- Rewrite the doc comment. It must still explain **why step 6 needs the set at
  all** — a node that goes dormant in step 3 must not recover in step 6 of the
  same sequence — and it should now say the set is captured at entry because
  nothing outside this sequence can change a site's state.
- The module comment's closing "which is what this file's second argument is
  for" needs rewording; there is no second argument.

### `src/rules/gameState.ts`

`dormantSiteNames`' doc comment currently says it is how a caller captures
"dormant before the ply began" for `runEndOfTurn`'s second argument. Rewrite it
to describe what the function is — the square names of every dormant site in a
given state — without referring to a parameter that no longer exists.

### Callers

- `src/rules/ply.ts` — both call sites (`applyPassGuard` and
  `applyEndOfActionTail`) drop their second argument. `applyEndOfActionTail`
  loses its own `dormantBeforePly` parameter and the paragraph of its doc
  comment explaining it, and both its callers stop building the set. The
  `dormantSiteNames` import goes.
- `src/rules/fullGame.test.ts`, `src/rules/sitePool.test.ts` — drop the
  argument. `sitePool.test.ts` needs no other change (**D10**); if its
  tolerances do move, say so in the step Notes and raise it.

### `src/rules/endOfTurn.test.ts`

The helper `runEndOfTurnFresh` becomes unnecessary — every call is now "fresh" —
so inline it. The two tests that force the exclusion by passing `new Set()` and
`new Set(["H8"])` can no longer do that, and must be **rewritten to prove the
same rule through the real path** (**D4**):

- A charged node whose drain reaches capacity in **step 3** goes dormant in that
  sequence and **does not** recover in step 6 of the same sequence — its level
  is exactly what step 3 left it at.
- That same node **does** recover at the end of the **next** sequence, dropping
  by one recovery draw.
- The existing "the charge draw never charges a site that went active in the
  same sequence" test also passes an explicit set; rebuild its fixture so the
  site is genuinely dormant when the sequence is entered.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass. `grep -rn "dormantBeforePly" src/` returns
nothing. The rewritten `endOfTurn.test.ts` cases must show a node that runs out
in step 3 holding its level through step 6 of the same sequence and recovering
only at the end of the next one — the rule §8.6 step 6 exists for, now proved
without a test seam.

---

## Step 7 — Integration cover: the node refuge and the node left lit

Status: committed

Notes: Added three `it`s across two new describes in `camping.test.ts`,
driven through `applyMove`, `applyAttack`, `attackRefusalReason` and
`legalTargets` exactly as the file's existing discipline requires. Case 1
("the node refuge") uses a single deterministic fixture: a camper on H8 at
`NODE_CAPACITY - 3`, guaranteeing the held table's smallest draw (3) tips it
to dormant in exactly one turn, no loop needed. It checks the refusal from
both directions — the enemy cannot target the camper, and the camper (its
own square swapped to `sideToMove`, since the refusal is a property of the
attacker's square rather than of whose turn it is) has no legal attack of
its own — then drives one real green move to exhaust the node, a spare red
move to hand the turn back to green, and finally a real `applyAttack` that
now resolves, landing both ships in bays at 0 shields. Case 2 ("a node left
lit") is two `it`s: one runs a capped loop (40 rounds, red then green
alternating, neither ever touching F2) asserting every single turn's level
rise is in the empty table's [1,3] range and the site stays charged until
`node-ran-out` fires, breaking out and asserting dormancy once it does; the
other has the vacated ship's opponent walk onto the still-charged square and
shows it immediately gains a shield and collects energy at the end of that
same arriving turn.

One deviation from the plan's literal wording, recorded for the peer review:
the plan's third bullet for case 2 says a node taken by an opponent starts
"collecting from the end of its owner's next turn." Tracing the actual code
(`runEndOfTurn`'s steps 1 and 2 read the state as it already stands when the
sequence starts, which includes the ship's own just-completed move) shows
collection happens at the end of the very turn the ship arrives on an
already-charged node, not a turn later — confirmed independently with a
throwaway probe test before writing the real one. The delayed case that
phrase describes is the different scenario the first "camping" describe
already covers, where a site charges _during_ someone else's turn, after
that ply's steps 1–2 have already run. Wrote the assertion to match the
behaviour the code actually has rather than the plan's paraphrase of it, per
the instruction not to weaken an assertion — asserting a one-turn delay that
doesn't exist would have been a false test, not a faithful one.

No `src/` file outside `camping.test.ts` was touched. All three new cases
were confirmed to fail for the right reason by temporarily reverting the
underlying behaviour in `combat.ts` and `endOfTurn.ts` (restored
immediately after) rather than by inspection alone. `npm run typecheck`,
`npm run lint`, `npm run format:check` and `npm test` all pass (43 files,
762 tests). `git status` shows only `src/rules/camping.test.ts` changed.

Add the two end-to-end cases the story asks for to
`src/rules/camping.test.ts`, which is the integration cover for a ship that
stays put. This step adds **tests only** — no `src/` file outside a test changes.
If a case fails, that is a defect in an earlier step, not a reason to change the
test's premise.

Depends on: Step 2 (the refuge), Step 5 (a vacated node stays lit), Step 6 (the
signature these tests drive through).

`camping.test.ts` drives everything through the public rules API — `applyMove`,
`applyAttack`, `moveRefusalReason`, `attackRefusalReason` and the effects they
carry — rather than calling `runEndOfTurn` directly, so a case proves the same
thing a player's turn would. Keep that discipline; the file's header comment
says so.

### Case 1 — a ship parked on a charged node cannot be attacked, until the node runs out under it

One ship parked on a charged site, an enemy ship in range of it, and enough
turns played through `applyMove` for the node's drain to reach capacity.
Assert, in order:

- While the site is **charged**, the attack is refused with
  `"target-on-charged-node"` and the parked ship is not among the attacker's
  legal targets.
- The parked ship also has **no legal attack of its own** while it stands there.
- The moment the node runs out — signalled by the ordinary `node-ran-out`
  effect from the end-of-turn sequence, **without the parked ship moving** —
  the same attack becomes legal and the parked ship becomes an ordinary target.

Set the site's starting level close enough to `NODE_CAPACITY` that one or two
turns will tip it, so the test is short and does not depend on a lucky draw.

### Case 2 — a ship that steps off a charged node leaves it lit for either side

A ship holding a charged node moves away. Assert:

- The site is still **charged** immediately after the move, and no
  `node-vacated`-style effect exists to be found.
- Its drain then rises at the **empty** rate, not the held rate, over the
  following turns, and it goes dormant only when the drain reaches capacity — at
  which point the ordinary `node-ran-out` announcement fires from the
  end-of-turn sequence.
- **Either** player's ship may move onto that node while it is still charged and
  hold it, collecting from the end of its owner's next turn. Prove it with the
  **opponent's** ship, which is the case the story is about — the race for a
  vacated node.

Verification (automated): `npm test` passes with both new cases present, and
each fails for the right reason if its assertion is inverted. `npm run typecheck`,
`npm run lint` and `npm run format:check` pass. `git status` shows only
`src/rules/camping.test.ts` changed.

---

## Step 8 — `README.md`, and a sweep for anything the old rules left behind

Status: committed

Notes: Rewrote the four passages `README.md` was carrying the old rules in.
The second paragraph now says a shield does nothing good for the ship
carrying it, that a shield is built by holding a node, that holding a node
is a refuge from attack, and that a fight has no winner and sends both
ships home stripped of shields — keeping "Ships are never destroyed." The
third paragraph drops "holding a node and then walking away spends what is
left of it" and says instead that walking away costs the node nothing, so
it stays lit at its slower pace for either player to reach. The status
blockquote's combat sentences (shield comparison, the cost of winning, the
advancing winner taking a node outright, "two ships carrying the same
shields both go home") are replaced by one passage stating the no-winner
rule, the random-bay return with shields stripped, and the node refuge,
while keeping "a ship attacks exactly as far as it moves" verbatim as
instructed. The blockquote's two node sentences about ending instantly on
departure and recovering sooner if spent early are deleted with nothing
substituted, matching the plan's "and that is all." Reflowed the touched
blockquote lines with a one-off wrap (prettier's `proseWrap: preserve`
default does not rewrap prose, so this was manual) to keep the paragraph's
line width consistent with the rest of the file; `prettier --check` and
`format:check` both pass.

The sweep (`doc/ruleset/`, `README.md`, `src/`, excluding `doc/plan/`) found
one live hit beyond the four README passages: `src/rules/gameState.ts`'s
`SiteStatus` doc comment still reasoned that "a node ended early is dormant
for proportionally less time" as the justification for carrying `level`
across states in one field rather than three. That reasoning is now false —
a node only ever goes dormant at or a little past capacity — so the comment
was rewritten to say recovery now always starts from about the same level,
keeping the same "one field rather than three" conclusion since that part
is still true. Everything else the sweep's four bullets named turned up
only expected, deliberate hits: `doc/ruleset/changelog.md`'s historical
0.8/0.11/0.16-and-earlier entries (a changelog is a historical record, not
rewritten, per the same principle that protects `doc/plan/`); `rules.md`'s
and `announcements.ts`'s live, correct uses of "beaten" applied to _both_
ships in a fight (not "the only one returning" — announcements.ts's own
sentence is "and both were beaten"); test fixtures and assertions that
search for `"node-vacated"` specifically to prove it is **absent**
(`camping.test.ts`, `ply.test.ts`), exactly like the existing
`Board.test.tsx` regression case for "beaten ship" in an accessible name;
and unrelated senses of "winner"/"advance" (the game's §9 winner, and a
random seed "advancing"). No dead export of `resolveFight`, `FightOutcome`,
`winnerAdvance`, `applyVacating`, `VacatingResult`, `NodeVacatedEffect`,
`AdvancingWinner` or `PredictedFightOutcome` remains; `dormantBeforePly` now
names only a local `const` inside `runEndOfTurn`, not a parameter.

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (43
files, 762 tests) and `npm run build` all pass. `git status` shows only
`README.md` and `src/rules/gameState.ts` changed. No deviation from the
plan beyond the one extra fix the sweep itself calls for (the `gameState.ts`
comment) and the cosmetic rewrap, both recorded above.

Bring `README.md` in line with 0.16 and sweep the repository for stale wording.

Depends on: Steps 1 to 7 (the README describes the finished behaviour).

Run `/update-readme` for the general diff, then confirm by hand that all four
passages the story names have actually changed:

1. **The second paragraph** — "Shields win fights … winning a fight burns them
   off. Ships are never destroyed: a ship that loses is pushed back to a bay" is
   rewritten. Shields no longer win anything; a fight sends **both** ships home
   with no shields; shields are what a ship accumulates by sitting on a node,
   and they slow it down. Keep "Ships are never destroyed".
2. **The third paragraph** — "and holding a node and then walking away spends
   what is left of it" is **deleted**. Walking away costs the node nothing.
3. **The status blockquote's combat sentences** — the shield comparison, the
   cost of winning, the advancing winner taking a node outright, and "Two ships
   carrying the same shields both go home" are replaced by the new rule (a fight
   sends both ships to random bays with no shields) and the node refuge (a ship
   holding a node can neither attack nor be attacked). **"A ship attacks exactly
   as far as it moves" stays** — still true, and still the thing a player needs
   to know.
4. **The status blockquote's node sentences** — "and instantly the moment a ship
   that was holding it moves away" and "coming back sooner if it was spent early
   rather than burned all the way down" are **deleted**. A node burns down at a
   random pace, faster while a ship sits on it, and that is all.

The README is written for a **non-technical player** (`CLAUDE.md`). Keep its
voice; do not import the rules document's section numbers into it.

`CLAUDE.md` needs nothing — no vocabulary changes.

### The sweep

Search the whole repository (`doc/ruleset/`, `README.md`, `src/`, excluding
`doc/plan/`, which is a historical record and is **not** to be rewritten) for
wording that still says:

- shields win, decide, or are spent by winning a fight;
- a winner, an advance, a loser, or a beaten ship as the only one returning;
- leaving or stepping off a node ends, spends or dormants it;
- a node coming back sooner because it was ended early;
- `§8.7` or "section 8.7".

Every hit outside `doc/plan/` is either fixed here or explained in this step's
Notes.

Also confirm no dead exports survive the deletions: nothing in `src/` still
exports or imports `resolveFight`, `FightOutcome`, `winnerAdvance`,
`applyVacating`, `VacatingResult`, `NodeVacatedEffect`, `AdvancingWinner`,
`PredictedFightOutcome` or `dormantBeforePly`.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm run build` all pass. The greps above return
nothing outside `doc/plan/`. A read of `README.md` confirms all four passages
have changed and that nothing in it still credits shields with winning a fight
or says that leaving a node ends it.

---

## Step 9 — Owner play-through

Status: committed

Notes: the owner ran the play-through and confirmed all ten observations.
One change was asked for that is not part of this story's ruleset change — the
result panel's button to read "New Game" rather than "Back to start" — and it
is added as step 10 rather than made as a side edit.

The owner plays the app and confirms the story's player-facing verification
list. This is the story's manual gate; it is the only step the pipeline pauses
for a person on.

Depends on: Steps 1 to 8.

Run `npm run dev` in the dev container and open the app. Press PLAY at the
default settings (seven ships a side, thirty rounds) unless a shorter game is
more convenient for a particular check.

Confirm, in the app:

1. **A ship on a charged node cannot be attacked.** Move a ship onto a lit node,
   then try to attack it with an enemy ship in range. The attack is refused and
   the announcement says a ship holding a charged node cannot be attacked. The node
   holder is not ringed as a target when the enemy ship is selected.
2. **A ship on a charged node cannot attack.** Select a ship standing on a lit
   node with an enemy in range. It offers **no** targets, and activating the
   enemy square is refused with the sentence about not attacking while it holds
   a node.
3. **An active site and a dormant site protect nothing.** A ship standing on
   either is ringed as an ordinary target and can be attacked, and can attack
   out.
4. **A ship whose node runs out under it becomes attackable at that moment**,
   without moving — watch a held node's glow run down, hear "node ran out", and
   see the ship become a target on the next selection.
5. **A fight sends both ships home.** Attack with a heavily shielded ship
   against an unshielded one, and again the other way round. In both cases both
   ships land in bays with no shields, both squares they came from are left
   empty, and the announcement names both ships, both bays and the loss of all
   shields — and mentions no winner and no advance.
6. **A target ring reads one way.** Whatever the two ships' shields, the target
   square's marking and its announcement say the same thing.
7. **Stepping off a node leaves it lit.** Move a ship off a lit node. The node
   stays lit with the same glow, and nothing is announced about it. Watch it
   burn down more slowly than it did while held, and hear the ordinary "node ran
   out" only when it reaches the end.
8. **Either side can take a vacated node.** Move the **opponent's** ship onto
   that still-lit node and confirm it starts collecting at the end of that
   player's next turn.
9. **The `no-action` marker on a node-holder is expected** (**D11**). A ship
   standing on a lit node with no legal move now shows "no action available this
   turn". Confirm it looks deliberate rather than broken.
10. **A whole game still finishes** — play or fast-forward to the end and
    confirm the result panel and the return to the start screen still work.

Verification (manual): the owner confirms each of the ten observations above in
the running app and reports anything that reads wrong, looks wrong, or contradicts
`doc/ruleset/rules.md` at 0.16.

---

## Step 10 — The end screen's button says "New Game"

Status: committed

Notes: Changed the button's literal text in `GameOverPanel.tsx`, updated the
three `getByRole` queries in `GameOverPanel.test.tsx`, and named the button in
the README's status blockquote. The README edit also rewrapped just the two
affected lines to keep them under the paragraph's usual line width, without
reflowing the rest of the paragraph. `onReturnToStart` and
`handleReturnToStart` were left unchanged as specified.

Rename the result panel's button from **"Back to start"** to **"New Game"**.

This step is **not part of the story's ruleset change**. It was asked for by
the owner at step 9's play-through gate and added here, per
`.claude/commands/implement-story.md`, because owner feedback that needs work
becomes a plan step rather than a side edit. Nothing about the rules, the game
state or `RULES_VERSION` is touched, and `doc/ruleset/` is not edited.

What to change:

- **`src/hud/GameOverPanel.tsx`** — the button's visible text, currently the
  literal `Back to start` at the end of the component. That string is the
  button's accessible name too; there is no `aria-label` and no separate
  wording table for it, so this one literal is the whole of the change.
- **`src/hud/GameOverPanel.test.tsx`** — three `getByRole("button", { name:
"Back to start" })` queries (around lines 97, 116 and 286) select the button
  by that name and will fail until they are updated.
- **`README.md`** — the status blockquote's closing sentence says "a button
  returns you to the start screen with the same choices still set, ready to
  play again". Name the button in it, so a player reading the README knows
  what to look for.

What **not** to change:

- **The `onReturnToStart` prop keeps its name**, along with `App.tsx`'s
  `handleReturnToStart`. The button's behaviour is unchanged — it returns to
  the start screen, with the same choices still set, where the player presses
  PLAY — and the prop names describe that behaviour accurately. "New Game"
  is what the player is being offered, not a different thing the code now
  does. Renaming the prop would touch `App.tsx`, the panel and every test
  harness in `GameOverPanel.test.tsx` for no gain.
- **The capitalisation is the owner's**, given as "New Game". The existing
  label is sentence case ("Back to start") and the start screen's button is
  "PLAY", so the file has no single convention to defer to; use "New Game"
  exactly as asked.
- Nothing else in the panel: the heading, the scores, the hidden result
  sentence, the focus behaviour and the CSS are all untouched.

Depends on: Step 9 (the owner's play-through, which is where this was asked
for). Independent of steps 1 to 8 — it would apply equally to the code before
this story.

Verification (automated): `npm test` passes with the three updated queries,
and `grep -rn "Back to start" src/ README.md` returns nothing. Then
`npm run typecheck`, `npm run lint` and `npm run format:check`.
