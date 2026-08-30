# Story 00000037 — New combat rules, and nodes that run their course

## Summary

Two changes that turn out to be one story, because each one removes the
reason the other's edge cases existed.

**Combat stops having a winner.**

- **Every fight is a draw.** Shields no longer decide anything. Both ships —
  the attacker and the ship it attacked — are returned to bays chosen at
  random, both stripped of every shield they were carrying, and both squares
  are left empty. There is no winner, no shield cost formula, and no advance.
- **A ship on a charged node cannot attack and cannot be attacked.** The same
  protection a bay gives, extended to the node a ship is holding. It applies
  only to **charged** sites: a ship standing on an active or a dormant site
  is an ordinary target, and can attack like any other ship.
- **The special conditions on where a fight leaves a ship go away.** The
  winner's advance, the "furthest square it may legally end on" walk back
  along the attack lane, and the case where a beaten ship's own return bay
  blocks that walk are all deleted. Both ships go to bays; there is nothing
  left to place.

**Leaving a node stops ending it.**

- **§8.7 is deleted outright.** A charged node that becomes unoccupied stays
  charged. It carries on draining, at the slower empty rate (§8.3), until its
  drain reaches capacity like any other node, and only then goes dormant.
  Walking away no longer spends what is left of a node — it just stops
  burning it down quickly.
- **Every node therefore goes dormant at, or a little past, 60.** Recovery
  (§8.2) always starts from about the same level, so it always takes about
  ten turns. The "a node ended early comes back sooner" case disappears
  along with the way of ending one early.
- **Nothing goes dormant mid-turn any more.** A site's state changes only in
  the end-of-turn sequence (§8.6), never as part of resolving an action.

### How the two fit together

The combat change alone would have left an oddity: a fight can no longer end
a node — neither ship in a fight may be standing on one — so §8.7 would have
been left with a single case out of four and a long explanation of cases that
could no longer happen. Deleting it entirely is cleaner than pruning it, and
it is a change the owner wanted anyway.

Together they also fix what the combat change would otherwise do to the
contest for a node. A holder cannot be dislodged, so a node is taken by
getting there first — but the holder may still **choose** to leave, and now
that leaving no longer destroys the node, the node it vacates stays lit and
is there for either player to walk onto. An empty charged node burning slowly
towards its capacity is a thing worth racing for. Without the second change,
stepping off would simply have killed it, and there would have been nothing
to race for.

### What this does to shields

It should be said plainly, because the rules document has to say it plainly:
after this story a shield does nothing good for the ship carrying it. Shields
used to buy strength at the cost of reach; strength is gone, and the cost of
reach remains. What a shield now is, is the weight a ship picks up by sitting
on a node — the longer it holds one, the slower it becomes, and the harder it
is to leave when it wants to. That is a coherent tension and it is the one
the story delivers, but it is a **reframing of what shields are for**, not a
tweak, and the rules document must stop advertising them as a combat
advantage everywhere it currently does.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.15**.
This story takes it to **0.16** — a gameplay change, so it earns a changelog
entry and a version bump (tagging remains on hold, per `CLAUDE.md`). Both
halves go in **one** version bump and one changelog entry: they are one
ruleset change, made together, and splitting them would put a version on
`main` in which a fight cannot end a node but §8.7 still says it can.

Planning documents say **ply** for the rules' and the UI's **turn**
(`CLAUDE.md`, Vocabulary). On the other word: `CLAUDE.md` reserves **hub** for
the code's name for a charged site, but the code does not in fact use it —
`energy.ts` has `chargedNodesHeldBy`, `vacating.ts` raises `node-vacated`,
`endOfTurn.ts` raises `node-ran-out`. New identifiers in this story follow the
code as it stands (**charged**, **node**) rather than introducing `hub` for
the first time in a combat story.

What exists today:

- **`doc/ruleset/rules.md`** — §1's overview of shields and of what happens to
  a beaten ship, §4.1's "they decide who wins a fight", §5's aside about an
  attack not always being available, §7 in full (the shield comparison, the
  `winner − (loser + 1)` cost, the winner's advance, the mutual-return
  paragraph and the node-changes-hands paragraph), §7.1's two placement
  cases, §8.1's charged state and its "can be ended early by a ship stepping
  off it" note, §8.2's recovery paragraph, §8.3's closing pointer to §8.7,
  §8.5, §8.6's ordering tail, and §8.7 in full.
- **`src/rules/combat.ts`** — `attackReach`, `winnerAdvance`,
  `AttackRefusalReason`, `attackRefusalReason`, `legalTargets`,
  `FightOutcome`, `resolveFight`, `drawReturnBay`.
- **`src/rules/vacating.ts`** and **`vacating.test.ts`** — `applyVacating`,
  `NodeVacatedEffect`, `VacatingResult`. The whole module is §8.7.
- **`src/rules/ply.ts`** — `FightShip`, `FightReturn`,
  `FightResolvedEffect` (with its `outcome` and optional `winner`),
  `applyAttack` with its decided-fight branch, its mutual-return branch and
  the `AdvancingWinner` bookkeeping that `assertFightInvariants` checks; and
  the `applyVacating` calls in both `applyMove` and `applyAttack`.
- **`src/rules/endOfTurn.ts`** — `runEndOfTurn`'s required `dormantBeforePly`
  parameter, whose doc comment and step 6 comment both cite §8.7's mid-ply
  dormancy as a reason it cannot be derived.
- **`src/rules/movement.ts`** — `reachFrom` and `ReachEntry`, which §7's range
  reads and which this story does not touch.
- **`src/rules/gameState.ts`** — `siteStateAt` / `siteStatusAt`, the way to
  ask whether a square is charged.
- **`src/board/`** — `squareLabel.ts`'s `PredictedFightOutcome` and its three
  wordings; `Board.tsx`'s use of `resolveFight` to build a target mark;
  `BoardSquare.tsx`'s single `TargetMark` (the drawing is already outcome
  independent — only the accessible name distinguishes the three today);
  `announcements.ts`'s `fightSentence`, `winnerAdvanceClause`,
  `nodeVacatedClause` and its ordering ahead of the end-of-turn clauses, and
  the `attacker-in-bay` / `target-in-bay` rejection sentences.

Three facts shape the design and should not be rediscovered by the
implementer:

- **The mutual-return path already exists and is already correct.** `ply.ts`
  draws the attacker's bay, places it, then draws the defender's bay from the
  bays still empty, advancing the seed once per ship. That branch becomes the
  only branch; the work is deleting the other one, not writing a new one.
- **The number of random draws per fight changes.** A decided fight drew once;
  every fight now draws twice. `seededReplay.test.ts`'s recorded expectations
  therefore **will** move, and legitimately so — unlike the last several
  stories, a changed expectation there is expected rather than a warning
  sign. The re-recorded values must come from running the game, and the test's
  premise (same seed, same actions, same game) must still hold.
- **After this story, no action changes a site's state.** `applyMove` and
  `applyAttack` leave `siteStates` untouched; only `runEndOfTurn` moves a
  site. That is a stronger invariant than the one `assertFightInvariants`
  checks today, and it is what makes the deletions in §3 and §4 below safe.

## In scope

### 1. The rules edit, first and on its own

Version 0.15 → 0.16, with a changelog entry covering both halves, in its own
commit ahead of the code.

#### Combat

**§7 is rewritten.** It keeps its number, its opening on range — an attack
travels exactly as far as a move, the same lines, the same clear-path
requirement, the target square of course occupied — and it keeps "attacking is
always the attacking player's choice; ships never fight automatically". What
replaces the rest:

- **Who may not fight.** Neither ship may be in a bay, as today; and neither
  ship may be standing on a **charged node**. A ship on a node cannot attack
  and cannot be attacked. Both halves are stated, because it is not only
  protection — a ship holding a node has given up striking out while it
  stands there. The document should say explicitly that this applies to
  charged sites alone: an active or a dormant site protects nothing, and a
  ship standing on one fights and is fought like a ship on an empty square.
- **The fight.** There is no winner. Both ships are returned to bays (§7.1)
  with 0 shields, and both squares are left empty. Shields do not enter into
  it: a 4-shield ship and an unshielded one come out of a fight identically.
- **What that means to play.** An attack is a **trade**: a player spends their
  own ship's position and shields to take away their opponent's. It is worth
  making when the enemy ship stands better than the attacker's own — next to
  a node, in the way, deep in the attacker's half — and not worth making
  otherwise. The document should say this in a sentence or two, the way it
  currently explains why attacking a near-equal is expensive.

  It should also say the two things that now follow about nodes: a ship that
  reaches a node first cannot be driven off it, so nodes are contested by
  arriving rather than by force; and a holder who chooses to leave gives the
  node up **still lit** (§8.3), so the square it vacates is worth racing for.

**§7.1 keeps its rule and loses its cases.** The random draw from the bays
standing empty is unchanged, and so is the assurance that neither player can
see it coming. What changes is that there is now only one shape of return:
every fight returns two ships, the attacker placed first and the defender's
bay then drawn from the bays still empty, which is what lets a recorded game
replay exactly. The "there is always somewhere to go" argument keeps only its
two-ship form: both ships were by definition on the board and not in a bay, so
at least two bays are empty.

**§4.1 stops crediting shields with winning fights.** The section is
rewritten around what a shield now is: it is gained by standing on a node, it
is lost on a dormant site and stripped entirely on returning to a bay, and
every one a ship carries takes away part of its movement and with it part of
its attack range. It no longer does anything in a fight. The document must not
soften this or leave the old framing standing anywhere — the "opposite
directions" sentence, and §1's "make it stronger in a fight but slower to
move", are both now false.

**§1's overview follows §4.1 and §7.** A fight has no winner: both ships are
pushed back to bays and stripped of their shields. Shields are the weight a
ship picks up by holding a node — they slow it down and nothing more. And the
overview gains the refuge: a ship holding a node cannot be attacked while it
holds it.

**§5's aside is reworded.** An action is still not always available, and there
is now a second reason as well as reach: a ship holding a node has no attack
available to it at all. The pass rule itself does not change.

#### Nodes

**§8.7 is deleted.** The section goes entirely, heading and all. It is the
last subsection of §8, so nothing renumbers and no other section's number
moves — the churn that made story 31 keep §8.5's number does not arise here.

**§8.3 absorbs what is left to say.** Its closing "Holding a node is what
uses it up. Section 8.7 covers the other way a node ends: leaving it." is
replaced by the single rule that now governs: a node ends **one** way, by its
drain reaching capacity. A ship leaving a node does not end it; the node
simply reverts to the slower empty rate and burns on. The section's two
lifetime figures — about 28 turns empty, about 13 held — are unchanged and
now bracket every node's life rather than being cut short by a departure.

**§8.2's recovery paragraph loses its second case.** "It goes dormant carrying
whatever drain it had" becomes what is now true: a node goes dormant at its
capacity, or a little past it, because the drain draw that tips it over may
overshoot. So recovery always starts from about the same level and always
takes about ten turns; "a node ended early comes back sooner, in proportion to
how much of it was left" is deleted.

**§8.1 loses its early-ending clause.** The start-of-game paragraph explaining
why the five opening nodes spread apart on their own drops "and can be ended
early by a ship stepping off it (section 8.7)". They still spread — each
drains at an independently drawn rate and is reached by ships at different
turns — and the paragraph should stand on those two reasons.

**§8.1's charged state gains the protection.** Charged is still "producing
energy: a ship standing on it collects (§8.4) and gains shields (§4.1)", and
now also: that ship can neither attack nor be attacked (§7). Active and
dormant are untouched.

**§8.5 says the other side of it.** The section already contrasts active and
dormant; it gains the fact that neither offers what a charged node offers — a
ship on an active or a dormant site can be attacked like any other, and a ship
whose node runs out under it loses its protection at the same moment it starts
paying. Its existing point — that a ship may stay or leave exactly as its
owner prefers — is unchanged, and now carries the extra fact that leaving
costs the node nothing.

**§8.6's ordering tail drops its mid-turn case.** "a node that goes dormant in
step 3 of turn N — or mid-turn, by the vacating rule (section 8.7)" becomes
step 3 alone. The **steps themselves do not change**, and step 6's "dormant
before this turn began" qualifier stays exactly as it is: it is still needed,
because a node that goes dormant in step 3 must not recover in step 6 of the
same sequence. The document should say that a site's state now changes only
in this sequence and never during an action.

**§2, §3, §6, §8.4, §9 and both appendices are untouched.** Appendix B's
arithmetic still holds: node life was already described as a mix of empty and
held turns averaging about twenty, and recovery as about ten.

### 2. Combat legality and the fight itself

`combat.ts` takes the two new refusal reasons and loses everything the winner
needed:

- `AttackRefusalReason` gains a reason for the attacker standing on a charged
  node and a reason for the target standing on one, named beside the existing
  `attacker-in-bay` / `target-in-bay` pair and checked in the same places in
  `attackRefusalReason`'s order — the attacker's own condition before the
  target's, and both before range and path, so a protected target within
  reach is refused as protected rather than as out of range.
- `legalTargets` picks the new refusals up through `attackRefusalReason` as it
  already does; its own early-exit list gains the attacker's node the way it
  carries the attacker's bay today.
- `resolveFight` and `FightOutcome` go. Every fight has the same outcome, so
  there is nothing left to compute or to name; a function that always returns
  the same constant should not survive as scaffolding.
- `winnerAdvance` goes, with its lane walk and the re-check of occupancy that
  existed for the blocked-advance case.
- `attackReach` stays. It is still how §7 borrows §6's range, and it is still
  what the path check reads. Its comment loses the reference to
  `winnerAdvance` sharing its answer.
- `drawReturnBay` stays as it is. Its comment's "on a mutual return" wording
  becomes the ordinary case: call it once for the attacker, then again
  against the state that already holds the attacker and the advanced seed.

The module comment for `combat.ts` currently describes "who may attack whom,
and where a winning attacker ends up". It should describe what the module is
now.

### 3. The vacating rule leaves the code

`src/rules/vacating.ts` and `src/rules/vacating.test.ts` are **deleted**, with
`applyVacating`, `VacatingResult` and `NodeVacatedEffect`. Every reference
goes with them:

- `ply.ts` drops both `applyVacating` calls — the one after a move and the one
  after a fight — and `NodeVacatedEffect` leaves the `MoveEffect` and
  `AttackEffect` unions.
- `announcements.ts` drops `nodeVacatedClause`, the `vacatedClauses` list and
  the ordering that put it ahead of the end-of-turn clauses. The clauses that
  remain keep their existing order. The end-of-turn "node at X ran out"
  announcement is untouched and becomes the only way a player hears that a
  node has gone dark.
- `endOfTurn.ts`'s two comments citing §8.7's mid-ply dormancy are corrected.
  Step 6's exclusion of sites that went dormant during this sequence stays —
  step 3 still produces them.
- **`runEndOfTurn`'s `dormantBeforePly` parameter may now be derived.** Its
  doc comment says it cannot be defaulted because a site might have gone
  dormant mid-ply; that reason is gone, and the set of dormant sites when
  `runEndOfTurn` is entered is now exactly the set from the start of the ply.
  Dropping the parameter and computing it internally is a genuine
  simplification and is **the plan's call** — but if it is kept, the doc
  comment's justification must be rewritten to a reason that is still true,
  not left citing a deleted rule.

### 4. `applyAttack` collapses to one path

`ply.ts` keeps its structure and loses its branch:

- `FightResolvedEffect` loses `outcome` and `winner`. What remains is the
  attacker and the defender as they stood before the fight, and `returns`
  with its two entries, attacker first. Whether the effect keeps the name
  `fight-resolved` is the plan's call, but it stays **one effect for the whole
  fight**, which is the shape the board and the announcements already read.
- `applyAttack`'s decided-fight branch is deleted along with the
  `AdvancingWinner` bookkeeping. What survives is today's mutual-return body:
  draw and place the attacker, draw and place the defender, advance the seed
  once per ship, mark the attacker as having acted, spend the action, and run
  the end-of-action tail exactly as now.
- `assertFightInvariants` keeps the checks that still have a subject — the two
  ships that returned, the seed advancing twice — and loses the advance-lane
  checks entirely. Its site-state check gets **stronger**, not weaker: no
  action changes a site's state any more, so "unchanged while the fight was
  resolving" becomes "unchanged, full stop", and its message must stop
  pointing at a vacating rule that is applied afterwards.

### 5. What the player sees and hears

- **`squareLabel.ts`** — `PredictedFightOutcome` and its three wordings go.
  A target square now reads one way, and the wording should say what actually
  happens: attacking here sends both ships back to bays. Whether `SquareMark`'s
  target member stays an object or becomes the plain string `"target"` is the
  plan's call; the type must not keep a field that can only hold one value.
- **`Board.tsx`** stops importing `resolveFight` and stops computing an
  outcome to build the mark with. Everything else about how it builds squares
  is unchanged.
- **`BoardSquare.tsx`** draws exactly what it draws today — the target ring is
  already the same ring for all three outcomes. Only its comment, which
  describes a predicted outcome that no longer exists, changes.
- **`announcements.ts`** — `winnerAdvanceClause` goes and `fightSentence`
  collapses to the single sentence a drawn fight already produces: who
  attacked whom, that both were beaten, and the two bays they landed in with
  no shields. Two rejection sentences are added for the new refusals, in the
  players' words and matching the tone of the bay pair beside them: a ship
  holding a node cannot attack while it stands there, and a ship holding a
  node cannot be attacked.
- **The `no-action` ship condition** needs no new code but does change
  meaning: a ship on a charged node now has no attack available at all, so it
  is marked as having no action whenever it also has no legal move. That is
  correct and wanted; it is called out here so it is not mistaken for a
  regression when it shows up on the board.

Nothing about site or ship **artwork** changes. In particular:

- A ship on a charged node gets **no new marker** for being protected: the
  node under it already says so, and inventing a shield-of-protection visual
  is a later story's call if it turns out to be needed.
- A charged node standing empty is drawn exactly as a charged node is drawn
  today. Its glow already tracks its drain (`siteCyclePosition`), which is now
  the whole truth about it, so a vacated node looks like what it is with no
  new treatment.

### 6. `README.md`, tests and the ledger

`README.md` states the old rules in four places, and all four must go:

- The second paragraph — "Shields win fights … winning a fight burns them
  off. Ships are never destroyed: a ship that loses is pushed back to a bay"
  — is rewritten. Shields no longer win anything; a fight sends **both** ships
  home; shields are what a ship accumulates by sitting on a node, and they
  slow it down.
- The third paragraph's "holding a node and then walking away spends what is
  left of it" is deleted. Walking away costs the node nothing.
- The status blockquote's combat sentences — the shield comparison, the cost
  of winning, the advancing winner taking a node outright, "two ships carrying
  the same shields both go home" — are replaced by the new rule and the node
  refuge. "A ship attacks exactly as far as it moves" stays; it is still true
  and still the thing a player needs to know.
- The status blockquote's node sentences — "instantly the moment a ship that
  was holding it moves away" and "coming back sooner if it was spent early
  rather than burned all the way down" — are deleted. A node burns down at a
  random pace, faster while a ship sits on it, and that is all.

Run `/update-readme` for the rest of the diff. `CLAUDE.md` needs nothing: no
vocabulary changes.

Tests expected to move: `combat.test.ts`, `ply.test.ts`, `actions.test.ts`,
`endOfTurn.test.ts`, `camping.test.ts`, `announcements.test.ts`,
`squareLabel.test.ts`, `Board.test.tsx`, `fullGame.test.ts`, and
`seededReplay.test.ts` — the last one for the reason given above, its recorded
values re-recorded from a real run rather than hand-edited towards passing.
`vacating.test.ts` is deleted with its module. `camping.test.ts` is the
integration cover for a ship that stays put and should gain the two cases
that belong to it end to end: a ship parked on a charged node cannot be
attacked and becomes attackable the moment that node runs out; and a ship
that steps off a charged node leaves it lit, still draining, for either side
to walk onto.

`sitePool.test.ts` guards Appendix B's claims over a long run. Its premise is
unchanged, but the numbers it observes will shift — nodes are no longer cut
short by departures, so lives run slightly longer and recoveries are uniformly
about ten turns. If its tolerances need widening, that is expected; if it
fails in a way that says the pool has stopped being comfortable, that is a
finding to raise, not a threshold to relax.

Per the accessibility section of `CLAUDE.md`, existing automated tests are
updated where the path is straightforward and no plan step is added for
testing accessibility. If the implementation costs an accessible behaviour,
record it in `doc/plan/00000021-accessibility-tech-debt/known-issues.md`. The
`node-vacated` announcement disappearing is not such a cost — it announces an
event that no longer happens.

## Out of scope

- **Giving shields a new purpose.** This story leaves a shield as a pure
  movement cost, deliberately and with its eyes open (see the summary). If
  play-testing says shields need to do something again, that is a later story
  with a mechanic in it, not a hedge bolted onto this one.
- **Protecting active or dormant sites.** Only a charged node is a refuge.
- **Any other way of taking a node** — no forced eviction, no contested
  occupation, no capture-by-adjacency. A node is taken by being first to it,
  or by being first to it after its holder walks away.
- **Any other way of ending a node early.** With §8.7 gone, a node ends by
  reaching capacity and by nothing else; no replacement mechanic is added.
- **Retuning anything numeric.** Drain, recovery, pressure, capacity, the
  energy tables, movement ranges, the shield cap, fleet size and game length
  are all untouched, and so is Appendix B's arithmetic. Nodes now live
  slightly longer on average and recoveries are uniform; measuring whether
  that wants a retune is a later story.
- **The site layout and the bays** — unchanged, including §3.1's rule that a
  ship ending a move in a bay loses its shields.
- **A visual marker for a protected ship**, a new treatment for a vacated
  node, and artwork, animation and transitions of any kind.
- **Game records and replay format** — no new fields; only the recorded seed
  expectations move, because the draw count per fight moves.

## Verification

Rules and combat:

- `RULES_VERSION` agrees with `rules.md` at 0.16, the changelog has an entry,
  and no wording anywhere in `rules.md`, `README.md` or `src/` still says
  shields win fights, that a winner advances, or that leaving a node ends it.
- Any two ships that fight, whatever shields they carry — 4 against 0, 2
  against 2, 0 against 4 — both end in bays with 0 shields, and both of the
  squares they came from are left empty.
- A fight draws exactly two bays, the attacker's first, and the defender's
  from the bays still empty afterwards; the same opening seed and the same
  sequence of actions produce the same game every time.
- A ship standing on a charged node cannot be attacked: it is not offered as
  a target, and an attack aimed at it is refused with the new reason rather
  than resolving.
- A ship standing on a charged node cannot attack: it offers no targets, and
  an attack from it is refused with the new reason.
- A ship standing on an **active** site and a ship standing on a **dormant**
  site are both ordinary targets and both may attack.
- A ship protected on a node becomes attackable the moment the node runs out
  under it, without the ship moving.
- The §5 pass guard still works with the narrower set of legal attacks: a
  side whose only ships are on nodes or out of range, with no legal move,
  passes, and the end-of-turn sequence runs for the passed turn in full.

Nodes:

- A ship that moves off a charged node leaves it **charged**, with its drain
  unchanged, and no announcement is made about it.
- That node then drains at the empty rate, not the held rate, and goes dormant
  only when its drain reaches capacity — at which point the ordinary "node ran
  out" announcement fires from the end-of-turn sequence.
- Either player's ship may then move onto that node and hold it, collecting
  from the end of its owner's next turn.
- No action of any kind — move, attack, or a passed turn's absence of one —
  changes any site's state; every state change happens inside the end-of-turn
  sequence.
- A node that goes dormant in step 3 still does not recover in step 6 of the
  same sequence, and first recovers at the end of the next turn.
- Every node reaching dormancy does so at 60 or a little above, and recovery
  therefore takes about ten turns in every case.

Presentation:

- The announcement for a fight names both ships, both bays and the loss of
  all shields, and never mentions a winner or an advance; the two new
  refusals are announced in the players' words.
- A target square's accessible name reads the one outcome, and no square's
  name still predicts a win or a loss.
- A vacated charged node still draws as a charged node, with the glow its
  drain gives it.

Whole build:

- `fullGame.test.ts` plays a complete game, and `sitePool.test.ts` still finds
  the pool comfortable over a long run.
- Typecheck, lint, `format:check` and the full test suite pass, with no dead
  exports left behind by the deleted winner path or the deleted vacating
  module.
