# Story 00000029 — Variable node durations

## Summary

A node no longer lives for a fixed nine turns. It is given a **capacity** of
60 units and burns through it at a random rate each turn — slowly when it is
empty, more than twice as fast when a ship is standing on it. When its
**drain** reaches capacity, the node is spent and goes dormant. A dormant
site then works the same number back down to zero, and goes active when it
gets there.

Three further changes ride along with that:

- **Leaving a node ends it.** A charged node that has a ship on it goes
  dormant the moment it becomes unoccupied — mid-turn, not at the end of one.
- **Taking a node in a fight does not.** A beaten defender is replaced by the
  advancing attacker in the same resolution, so the node is never empty and
  keeps its drain.
- **Active sites build pressure.** An active site starts at 1 and gains 1 for
  every turn it stays active, capped at 50. The end-of-turn charge draw is
  weighted by pressure, so a site that has been waiting a long time is more
  likely to be picked than one that has just cycled.

Every one of those numbers is a first guess to be play-tested and retuned;
this story's job is to make them one obvious table each.

The visuals follow the mechanic. Charged and dormant keep today's artwork and
today's start-to-end travel, driven by drain against capacity instead of
turns against nine. Active gets the travel it has never had: it interpolates
between the small pale disc that story 27 shelved and today's larger gold
disc, so how much pressure a site has built is readable on the board.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.11**.
This story takes it to **0.12** — a gameplay change, so it earns a changelog
entry and a version bump (tagging remains on hold, per `CLAUDE.md`).

Planning documents say **ply** for the rules' and the UI's **turn**
(`CLAUDE.md`, Vocabulary). Everything below that is measured "per turn" in
the rules is measured per **ply** in code: once for each player's turn, twice
a round.

What exists today:

- **`src/rules/sites.ts`** — `SITES`, `SiteState`, `CHARGED_LIFE_PLIES`,
  `DORMANT_COOLDOWN_PLIES`, `TARGET_CHARGED_SITES`,
  `STAGGERED_OPENING_CHARGED_SITES`, `startingSiteStatus`,
  `hasChargedNodeFinished`, `hasDormantSiteFinishedCooling`,
  `siteCyclePosition`.
- **`src/rules/gameState.ts`** — `SiteStatus` (`state` plus `enteredOnPly`),
  `siteStateAt`, `siteStatusAt`, `startingGameState`.
- **`src/rules/chargeDraw.ts`** — the uniform end-of-turn charge draw.
- **`src/rules/endOfTurn.ts`** — §8.6's five steps.
- **`src/rules/random.ts`** — `mulberry32` and `drawIndex`, the seeded
  generator every random draw in the game runs from.
- **`src/rules/ply.ts`** — `applyMove` and `applyAttack`, where a ship
  changes square.
- **`src/board/SiteMarker.tsx`** — one artwork per state, and the middle
  gradient stop's start-to-end travel for the two clocked states.
- **`doc/plan/00000023-update-node-visual/node-artwork.md`** — the artwork
  reference, including the small pale disc ("Dormant" in that document's
  pre-0.11 headings) that story 27 took out of the code and left here.

### Where 60 comes from

Before story 27 a node's clock started when a ship moved onto it, so a node
lived nine turns of being held. At the held rate below, nine held turns costs
**41.4** units. A node that stands empty for a few turns before anyone
reaches it spends about 2.1 a turn doing so. Forty-one plus a handful of
empty turns is roughly fifty; sixty adds deliberate leeway, because a later
story is expected to penalise a ship that fails to vacate before its node
runs out, and that penalty needs room to bite.

What 60 buys, as a function of how long the node stands empty first:

| Empty turns before a ship arrives | Turns it can then be held |
| --------------------------------- | ------------------------- |
| 0                                 | 13.0                      |
| 3                                 | 11.7                      |
| 5                                 | 10.8                      |
| 8                                 | 9.4                       |
| 10                                | 8.5                       |

A node nobody ever visits lasts about 28.6 turns and then recycles itself.

## In scope

### 1. The rules edit, first and on its own

Version 0.11 → 0.12, with a changelog entry, in its own commit ahead of the
code.

**§8.3 — how long a node lives — is rewritten around capacity and drain.** A
charged node has a **capacity** of 60 units and a **drain** that starts at 0
and rises at the end of every turn by an amount drawn at random. Which
distribution it draws from depends on whether a ship is standing on it at
that moment — either player's ship; it makes no difference whose:

| Node  | 1   | 2   | 3   | 4   | 5   | 6   | Average |
| ----- | --- | --- | --- | --- | --- | --- | ------- |
| Empty | 20% | 50% | 30% | —   | —   | —   | 2.1     |
| Held  | —   | —   | 10% | 40% | 30% | 20% | 4.6     |

When drain reaches or passes capacity, the node is spent: it goes dormant at
the end of that turn, stranding any ship left on it exactly as the nine-turn
clock did. The section states the plain consequences — an empty node lasts
about 28 turns, a held one about 13, and holding a node is what uses it up.

**§8.2 — charging a site — gains pressure, and its cooldown becomes
recovery.** Two changes:

- A dormant site's number now counts **down**. It goes dormant carrying
  whatever drain it had, and at the end of every turn subtracts an amount
  drawn at random: 4 (10%), 5 (25%), 6 (30%), 7 (25%), 8 (10%) — an average
  of 6. At zero or below it goes active. From a full 60 that is about ten
  turns, close to today's fixed nine; a node ended early comes back sooner,
  in proportion to how much of it was left.
- An active site carries **pressure**. It goes active at 1 and gains 1 at the
  end of every turn it is still active, to a maximum of **50**. The charge
  draw is no longer uniform: each active site's chance of being drawn is its
  pressure as a share of the total pressure of all active sites. A site that
  has waited a long time is likelier than one that has just cycled, and a
  site can never be excluded outright — pressure is never less than 1.

The "genuinely random, and neither player can see it coming" assurance
carries over unchanged, and so does the rest of §8.2: as many active sites as
it takes to bring the charged count back to five, drawn one at a time, and
the board simply runs short when there are not enough.

**§8.1 — the opening position loses its stagger.** The same five sites —
H8, E5, K5, E11 and K11 — start charged, but all five now start at drain 0,
and the staggered table and the paragraphs justifying it are deleted. Its
purpose was to stop the board pulsing in lockstep, and the lockstep it
guarded against can no longer form: the five opening nodes drain at
independently drawn rates, are reached by ships at different turns, and can
be ended early by a ship stepping off. The drift the stagger created
artificially now arrives on its own within a few turns.

**§8.5 — active and dormant sites — keeps its shape.** A ship may not end a
move on either, may fly over both, and a ship left standing on a node that
ran out under it is stranded on the same terms. Two sentences need the new
clock: "nine turns later, when the site finishes cooling down" becomes the
variable recovery, and the note that the only way onto a dormant site is to
hold a node until its clock runs out stays true — leaving a node ends it, but
the ship that left is by definition no longer on it.

**§8 gains the vacating rule.** Stated once, in the terms that settle every
case: **a charged node that is occupied goes dormant the moment it becomes
unoccupied.** It happens immediately, as part of resolving the action, not at
the end of the turn, and the node carries its drain into dormancy. The
consequences are worth spelling out because they are the interesting part of
the story:

- A ship that moves off a node ends it. Holding a node and then leaving is a
  choice to spend it.
- A ship pushed off a node after losing a fight it started ends it too.
- A drawn fight over a node ends it: both ships go to bays, so it is left
  empty.
- A **defender beaten on a node does not end it.** The attacker advances onto
  the square as part of resolving the fight, so the node is never unoccupied,
  and it stays charged with its drain untouched. This is the case the rule is
  shaped around: a node changes hands intact.
- If the attacker's advance is blocked — §7's case where the beaten ship's
  own return bay lands on the lane — the node **is** left empty, and it goes
  dormant like any other.

**§8.6 — end-of-turn order — becomes six steps:**

1. Each of the moving player's ships standing on a charged node gains a
   shield.
2. The moving player collects energy.
3. Every charged node adds its drain; any that reaches capacity goes
   dormant, stranding any ship on it.
4. As many active sites as it takes to bring the board back to five charged
   are charged, drawn by pressure (§8.2).
5. Every site still active gains a point of pressure, to the cap of 50.
6. Every site that was dormant before this turn began subtracts its
   recovery; any that reaches zero or below goes active at 1 pressure.

The two ordering arguments the section already makes both survive and both
must be restated for the new steps. Step 6 stays **last** for the reason
0.11 gives: a site that finishes recovering at the end of turn N goes active
only after that turn's draw, so it is active for the whole of turn N+1 and is
first eligible in turn N+1's draw, at 1 pressure. Step 5 sits **after** the
draw for the matching reason: a site is drawn at the pressure it has held all
turn, so its first appearance in a draw is at weight 1. And the two clocks
are symmetric about the turn a state is entered — a node charged in step 4 of
turn N first drains in step 3 of turn N+1, and a node that goes dormant in
step 3 of turn N first recovers in step 6 of turn N+1, which is what step 6's
"dormant before this turn began" is for.

**§7 — combat — gains the node-changes-hands sentence** and a pointer to the
vacating rule for the drawn fight and the blocked advance. §7's mechanics are
otherwise untouched.

**§1 and §2.** §1's two random elements become three: which site is charged
next, which bay a beaten ship goes to, and how fast a node burns. §2 gains
the words the rest of the document now uses — capacity, drain, pressure — in
players' terms.

**Appendix B is redone.** With a mixed life of roughly twenty turns, the
board charges a site about every four turns, dormancy runs about ten turns so
roughly two or three sites are dormant at any moment, and about nine or ten
of the seventeen are active. The conclusion that matters is different from
0.11's: the pool is comfortable, and the number now worth checking is the
**pressure cap against the average wait**. A site waits something like forty
turns between cycles, against a cap of fifty, so most of the pool sits below
the cap and pressure discriminates across the whole of it. A cap far below
the average wait would flatten the weighting back to uniform, which is what
the appendix should say to whoever retunes these numbers.

### 2. One number per site

`SiteStatus` becomes `{ state, level }`, and `enteredOnPly` is deleted.
`level` is one number whose meaning is the state's:

| State   | `level` is       | Starts at            | Moves      | Changes state at |
| ------- | ---------------- | -------------------- | ---------- | ---------------- |
| Active  | pressure         | 1                    | +1 per ply | drawn (§8.2)     |
| Charged | drain            | 0                    | + the draw | ≥ capacity       |
| Dormant | drain to recover | the drain it carried | − the draw | ≤ 0              |

The carry from charged to dormant is a real property of the design, not an
implementation convenience: a node ended early is dormant for less time. It
is the reason for one field rather than three.

Deleting `enteredOnPly` removes the subtraction-against-`plyNumber` that
`hasChargedNodeFinished`, `hasDormantSiteFinishedCooling` and
`siteCyclePosition` all do today, and with it the negative-`enteredOnPly`
special case the staggered opening needed. The two predicates become
comparisons against a constant and can reasonably disappear into their call
sites; the plan should decide, not this story.

`startingGameState` builds the new opening: five charged at level 0, twelve
active at level 1.

### 3. The draws

Both new draws and the new charge draw are weighted, so `src/rules/random.ts`
gains one primitive next to `drawIndex`: a weighted index draw taking a list
of weights, returning the drawn index and the next seed, and refusing an
empty list or a non-positive total the way `drawIndex` refuses a
non-positive count.

That one primitive serves all three uses. The three distributions live in
`sites.ts` as tables of outcome-and-weight, written with the percentages the
rules table shows so the two can be read side by side, and drawn with the
same function that draws a site from the active pool by pressure.

Ordering is fixed and must stay fixed, because it is what makes a recorded
game replay: sites drain in `SITES`' declared order, each advancing the seed
before the next; then the charge draw runs as it does today, one site at a
time without replacement; then sites recover, again in `SITES` order. A ply
now consumes many more seed steps than it did under 0.11 — that is expected,
and the seeded-replay test's recorded expectations are regenerated, not
worked around. `Math.random` is banned in game code (`CLAUDE.md`), and none
of this is the exception.

### 4. Vacating, mid-ply

The vacating rule is one function, applied to the state an action produced
and given the state it started from: any site that is charged, was occupied
before the action, and is unoccupied after it, goes dormant carrying its
drain. Both call sites in `ply.ts` — after a move applies, and after a fight
resolves — use it, and it wants no knowledge of which kind of action ran.

Written that way it covers the beaten defender (the square is occupied after,
by the attacker), the drawn fight and the blocked advance (unoccupied after,
so dormant) without a case for each, which is why the rules state it the same
way. A ship that arrives on a node is not a departure and changes nothing.

It raises an effect of its own, distinct from the `node-ran-out` a node
reaching capacity raises: the two are different facts and a player is owed
different words for them. The new effect names the ship that left. Whether it
gets an announcement clause is judged on story 27's terms rather than
inherited — but note that unlike the board events 0.11 left silent, this one
is a direct consequence of the moving player's own action, which is an
argument for saying something.

Stranding is untouched: a node can still reach capacity underneath a ship,
and does so roughly every thirteen turns of being held.

### 5. Artwork

**Charged and dormant** keep their artwork and their travel exactly as they
are. Only the input changes: `siteCyclePosition` reports `level / capacity`
for a charged node and `1 − level / capacity` for a dormant one, both clamped
to [0, 1]. Reading the dormant end against capacity rather than against the
drain it happened to carry is deliberate — a node ended early begins its
dormancy already part-recovered, and its artwork should say so, because that
is exactly what is true of it.

**Active** gains the travel it has never had, between the two discs in
`node-artwork.md` that differ in three respects and nothing else:

|                    | that document's "Dormant" | its "Active" |
| ------------------ | ------------------------- | ------------ |
| circle radius      | 12                        | 24           |
| inner stop colour  | `#F1DBA5`                 | `#DAA520`    |
| outer stop opacity | 0.75                      | 0.5          |

Both are radius-`60%` radial gradients centred on the square, with a
`#DAA520` outer stop, so the travel is three interpolations over the same
shape: radius 12 → 24, inner colour pale wheat → gold, outer opacity 0.75 →
0.5, at `(pressure − 1) / (cap − 1)`. A freshly-cycled site is a small pale
dot; one that has waited swells and warms into the disc the board shows
today. That is the same treatment charged and dormant already get — a
calculation from state, one appearance per turn, **not an animation**;
nothing transitions, eases or moves on its own.

Interpolating a colour is new — the existing travel moves a single number —
so `SiteMarker.tsx` needs a small hex-lerp helper, unit-tested like the rest
of the module's arithmetic.

The shelved artwork comes back out of `node-artwork.md`; the document itself
does not change, and the transcription in `SiteMarker.tsx` should note which
of its sections each end of the active travel comes from, as the file already
does for the other two states.

### 6. Tests, `README.md` and the ledger

`sitePool.test.ts` guards Appendix B, and its premise changes with the
appendix. What it should assert under 0.12: the board holds at five charged
with no ship activity, the active pool stays comfortably populated, expiries
stay spread rather than arriving together, and — new — the pressure weighting
does its job, in that a site's wait between cycles is bounded far better than
an unweighted draw would bound it.

`README.md` states the nine-turn life directly: "A node runs out after nine
turns — its glow shifts a little as it runs down". That, and the surrounding
description of holding a node, are rewritten for a budget that burns faster
under a ship and ends when the ship leaves. Run `/update-readme` for the rest
of the diff.

`CLAUDE.md`'s vocabulary needs nothing: hub, site, ply and the rest all keep
their meanings.

Per the accessibility section of `CLAUDE.md`, existing automated tests are
updated where the path is straightforward and no plan step is added for
testing accessibility. One consequence to record in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`: an active site's
pressure is visible only in its artwork, and the square's accessible name
still says "active site" and nothing more — a new piece of board state that
does not reach assistive technology, alongside the cycle position that
already does not.

## Out of scope

- **Balance.** 60, 50, and all three distributions are first guesses to be
  play-tested. This story makes them easy to change; it does not claim they
  are right.
- **Penalising a ship that fails to vacate.** Anticipated, and part of why
  the capacity carries leeway, but a separate story. Stranding keeps exactly
  today's terms.
- **The site layout**, the target of five charged, energy values, movement,
  combat mechanics, bays and game length — all untouched except where the
  node lifecycle reaches into them.
- **Showing capacity, drain or pressure as a number** anywhere in the UI. The
  artwork is the readout.
- **Transitions or animation** of any kind, per section 5.
- **Game recording and replay.** The property that a seeded game replays
  exactly is kept, not extended; the recorded expectations move because the
  number of draws per ply moves.

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.12, and the changelog has an
  entry.
- An empty charged node's drain rises by 1, 2 or 3 each turn and never by
  anything else; a held one's by 3, 4, 5 or 6. Over a long run each
  distribution's frequencies match the table.
- A node held from the turn it is charged lasts about 13 turns; one never
  visited lasts about 28; a dormant site recovering from a full 60 takes
  about 10.
- A node that reaches capacity under a ship goes dormant and strands it,
  exactly as the nine-turn clock did.
- A ship that moves off a charged node leaves it dormant immediately, before
  the opponent's turn, carrying the drain it had.
- A defender beaten on a charged node is replaced by the advancing attacker,
  and the node is still charged, at the same drain, once the fight resolves.
- A drawn fight on a charged node leaves it dormant. An attacker whose
  advance is blocked by the beaten ship's return bay leaves it dormant too.
- An attacker that wins from a charged node and advances off it leaves that
  node dormant.
- A node ended at drain 30 recovers in about half the turns a node ended at
  60 does.
- An active site is at pressure 1 the first turn it is eligible for the draw,
  gains 1 per turn after that, and stops at 50.
- Over many draws with a rigged pool, a site at pressure 20 is drawn about
  twice as often as one at pressure 10, and a site at pressure 1 is still
  drawn sometimes.
- A site that finishes recovering at the end of turn N is active for the
  whole of turn N+1 and is first eligible in turn N+1's draw — never charged
  in the same end-of-turn sequence in which it went active.
- The opening board is five charged at drain 0 and twelve active at pressure
  1, and the five do not all run out on the same turn.
- With every site charged or dormant the draw charges nothing, the board runs
  below five, and the game continues without error.
- The same opening seed and the same sequence of actions produce the same
  game every time; a different seed produces a different one.
- Charged and dormant artwork travels with drain against capacity; active
  artwork travels from the small pale disc at pressure 1 to the gold disc at
  the cap.
- The full-game test from story 12 runs to completion, and `sitePool.test.ts`
  passes against its rewritten premise.
