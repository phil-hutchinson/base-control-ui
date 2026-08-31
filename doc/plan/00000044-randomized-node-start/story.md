# Story 00000044 — A randomized opening board

## Summary

Every game currently opens on the same board: H8, E5, K5, E11 and K11
charged at drain 0, and the other twelve sites active at pressure 1. That is
the one part of the game with no randomness in it at all, and it makes the
opening moves the same every time — the same five squares are worth racing
for, and they are all worth exactly as much as each other.

This story deals the opening board instead, from the same seeded generator
everything else random already runs from. Three draws, all made once, before
green's first turn:

- **Which five sites are charged** is drawn at random from the seventeen,
  every site equally likely, no two the same. No site is privileged; the
  centre is not guaranteed.
- **How far into its life each node already is** is drawn from a table
  weighted towards the start, up to a maximum of two-thirds of capacity. A
  node can open nearly fresh or well used, but never nearly spent.
- **How long each of the other twelve has been waiting** — its pressure — is
  drawn from a table weighted towards the low end, with a thin tail up to
  the cap. Most sites have waited a little, one or two have waited a long
  time, and the first charge draw of the game is no longer a level field.

Nothing starts dormant; a site is charged or active at the start, exactly as
now.

The point is variety in the opening, which is where the game currently has
none. It is also a fairer approximation of what the board looks like at any
other moment: at turn 40 the five nodes are scattered, part-used and
unevenly aged, and there is no reason turn 1 should be the one moment they
are neat.

**The opening stays reproducible.** The draws come from `state.randomSeed`,
so the same opening seed deals the same board every time, and a recorded
game still replays exactly.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.17**.
This story takes it to **0.18** — a gameplay change, so it earns a changelog
entry and a version bump (tagging remains on hold, per `CLAUDE.md`).

Planning documents say **ply** for the rules' and the UI's **turn**
(`CLAUDE.md`, Vocabulary).

What exists today:

- **`src/rules/sites.ts`** — `SITES`, `NODE_CAPACITY` (60), `PRESSURE_CAP`
  (50), `STARTING_PRESSURE` (1), `TARGET_CHARGED_SITES` (5), the three
  `WeightedAmount` tables and `drawTableAmount`, the private
  `OPENING_CHARGED_SQUARES` list, `startingSiteStatus`, and
  `siteCyclePosition`.
- **`src/rules/gameState.ts`** — `SiteStatus` (`state` plus `level`),
  `startingGameState`, which walks `SITES` calling `startingSiteStatus` for
  each and stores the caller's seed untouched.
- **`src/rules/random.ts`** — `mulberry32`, `drawIndex`,
  `drawWeightedIndex`.
- **`src/rules/chargeDraw.ts`** — the pressure-weighted end-of-turn draw,
  which is the model for drawing from a pool without replacement.
- **`src/game/seed.ts`** — where the app's opening seed comes from.
- **`src/rules/seededReplay.test.ts`** — the recorded expectations that
  prove a seeded game replays.

### Where the two tables come from

**Opening drain.** A node opens somewhere in the first two-thirds of its
capacity of 60, weighted so the early part of the range is much the likelier:

| Drain | 0   | 5   | 10  | 15  | 20  | 25  | 30  | 35  | 40  | Average |
| ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- |
| Share | 20% | 18% | 15% | 12% | 10% | 8%  | 7%  | 6%  | 4%  | 14      |

An average opening node has 46 of its capacity left: about 22 turns if
nobody ever reaches it, about 10 if a ship arrives and holds it from the
first turn. The most-used opening node has 20 left — about 9 empty turns, or
4 held ones. That is the reason for the cap: a ship needs two or three turns
to get out of its bay and onto a site, and an opening node that could expire
before anyone could possibly reach it would be a node the deal simply threw
away. Two-thirds leaves every dealt node worth racing for, while still
letting the board open with nodes at visibly different ages.

**Opening pressure.** Each of the other twelve sites opens with pressure
drawn from:

| Pressure | 1   | 5   | 10  | 15  | 20  | 25  | 30  | 40  | 50  | Average |
| -------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- |
| Share    | 24% | 20% | 16% | 12% | 9%  | 7%  | 5%  | 4%  | 3%  | 12.8    |

Most sites have waited only a little — the shape a board reaches naturally,
where a site that has just cycled is the common case — but the tail means a
game can open with one or two sites already close to the cap of 50, which
are the sites the first charge draw will favour. Pressure keeps rising by 1
a turn from wherever it was dealt, so a site dealt at 40 reaches the cap
within ten turns and one dealt at 1 behaves exactly as every site does
today.

Both tables are first guesses to be play-tested and retuned, like every
other number in section 8. Their job here is to be one obvious table each.

## In scope

### 1. The rules edit, first and on its own

Version 0.17 → 0.18, with a changelog entry, in its own commit ahead of the
code.

**§8.1 — the opening position is dealt, not fixed.** The paragraph naming
H8, E5, K5, E11 and K11 at drain 0 is replaced by the deal: five of the
seventeen sites are chosen at random, every site equally likely; each starts
charged at a drain drawn from the opening drain table; every other site
starts active at a pressure drawn from the opening pressure table. Nothing
starts dormant, and that sentence stays.

The paragraph that follows it today — "Nothing needs to spread their
expiries out by hand" — is kept but re-argued: the five now open at
different ages as well as draining at independently drawn rates, so they are
spread from the first turn rather than spreading within a few.

**§8.2 gains the opening pressure**, or rather stops contradicting it: the
section says an active site "goes active at 1", which stays true of every
site that goes active *during* the game. The one exception is the deal, and
§8.2 should point at §8.1 for it rather than repeat the table.

**§8.3 gains the same pointer** — a node's drain "starts at 0" during play,
except for the nodes the opening deal starts part-drained.

**§1 — the game's random elements go from three to four.** The opening
board joins which site is charged next, which bay a beaten ship goes to, and
how fast a node burns. It is worth a sentence in the overview in its own
right: no two games start the same, and neither player has seen this board
before.

**§8.1's "the board aims to keep five sites charged"** is unaffected, and so
is every other section: the deal changes only the state the game starts in,
not a single rule about how it proceeds. No section is renumbered.

**Appendix B** needs one adjustment. Its sizing argument is about the steady
state and holds unchanged, but it currently reasons from a board that starts
neat; a line should note that the deal starts the board closer to its steady
state than the fixed opening did, so the first twenty turns are no longer an
unrepresentative settling-in period.

### 2. The deal

`startingSiteStatus(square)` — one square in, a status out, no seed — cannot
express this, because the five charged sites are drawn without replacement
and each draw depends on the ones before it. It is replaced by a function
that deals the **whole board at once**: a seed in, the seventeen statuses
and the next seed out. `sites.ts` is where it belongs, next to the tables it
draws from.

The order of the draws is fixed, and must stay fixed, because it is what
lets a recorded game replay:

1. **Five charged sites**, drawn one at a time and uniformly from a pool of
   all seventeen walked in `SITES`' declared order, each draw removing its
   site from the pool — the shape `chargeDraw.ts` already uses, but with
   `drawIndex` rather than a weighted draw, since at the deal no site has
   any pressure to weight by.
2. **One number for each site**, walking the seventeen in `SITES`' declared
   order: a charged site draws its opening drain from the drain table, an
   active site draws its opening pressure from the pressure table. One
   `drawTableAmount` call each.

That is 22 seed steps before green's first turn, where today there are none.

`startingGameState` calls it, and stores **the advanced seed** on the new
state, so play continues from where the deal left off. Its documentation
comment describes the dealt opening rather than the fixed one.

Both tables live in `sites.ts` beside the three that are already there, as
`WeightedAmount` tables written with the whole-number percentages the rules
tables show, so the document and the code can be read side by side.
`STARTING_PRESSURE` stays: it is what a site goes active at during play
(§8.2, §8.6 step 6), which the deal does not change.

`Math.random` is banned in game code (`CLAUDE.md`) and this is not the
exception. The deal draws from the game's seed and nowhere else.

### 3. The tests that assumed a fixed opening

This is the bulk of the work, and the plan should treat it as such rather
than as fallout. Fifty-odd tests call `startingGameState`, and they divide
into three kinds:

- Tests that build the position they need on top of it, overriding
  `siteStates` wholesale. Unaffected.
- Tests that assert the opening itself — `sites.test.ts`'s "exactly five
  sites starting charged at drain 0: H8, E5, K5, E11, K11" and its
  neighbours, and the equivalents in `gameState.test.ts`. These are rewritten
  against the properties the deal guarantees: five charged and twelve active
  out of seventeen, nothing dormant, every charged drain drawn from the drain
  table's values, every active pressure from the pressure table's, the same
  seed dealing the same board, and different seeds dealing different ones.
- Tests that quietly relied on a particular site being charged or active
  while testing something else — movement, energy, announcements, the board
  rendering. Each needs the board it wants stated explicitly rather than
  inherited from the opening. Where a test genuinely wants a known board and
  says so, setting `siteStates` directly is the honest fix; a shared helper
  is a reasonable answer if the plan finds enough call sites to justify one,
  but it is not required by this story.

`seededReplay.test.ts`'s recorded expectations move, because the seed is now
22 steps further along by green's first turn. They are **regenerated**, not
worked around — the property being guarded is that the same seed produces
the same game, and that property is exactly as true after this change.

`sitePool.test.ts` guards Appendix B over a long run and should still pass;
if it starts from the opening board its premise now varies per seed, so it
should either run across several seeds or state the board it starts from.

`fullGame.test.ts` must still run to completion.

### 4. What the player sees

No new UI. The board already draws a charged node's artwork from its drain
against capacity and an active site's from its pressure against the cap, so
a dealt board renders correctly the moment it exists: the five nodes open at
visibly different stages of burn, and the twelve active sites at visibly
different sizes and warmths, with no change to `SiteMarker.tsx` at all.

`README.md` describes the opening in player's terms and should say that
every game deals a different board. Run `/update-readme` for the rest of the
diff.

Per the accessibility section of `CLAUDE.md`, existing automated tests are
updated where the path is straightforward and no plan step is added for
testing accessibility. Nothing new needs recording in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`: the deal
introduces no new board state, only new starting values for state that is
already there, and the note about pressure and cycle position not reaching
assistive technology already covers it.

## Out of scope

- **Balance between the two sides.** The deal is unconstrained: it can put
  four of the five nodes in one half of the board. This is accepted. The
  fleets are symmetric and alternate around the whole edge, so neither
  player is far from any region, and the board tops itself up within a few
  turns of any node running out. A constrained or mirrored deal is a
  possible later story if play shows it is needed — this story deliberately
  does not build one.
- **Dealing dormant sites.** Nothing starts dormant; §8.1 keeps that
  sentence.
- **Retuning the tables**, `NODE_CAPACITY`, `PRESSURE_CAP` or
  `TARGET_CHARGED_SITES`. Both new tables are first guesses.
- **The site layout, fleet layout and starting power.** Ships still start in
  the bays §4 names, at full power. Only the sites are dealt.
- **Choosing or showing the seed**, or any UI for replaying a particular
  opening. The seed comes from `src/game/seed.ts` as it does today.
- **Game recording and replay.** The property that a seeded game replays
  exactly is kept, not extended; the recorded expectations move because the
  deal consumes seed steps ahead of the first turn.

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.18, and the changelog has an
  entry.
- A dealt board has exactly five charged sites and twelve active ones, out
  of the seventeen, and nothing dormant.
- Over many seeds, every one of the seventeen sites is charged sometimes,
  and no site is charged much more often than any other.
- Every dealt charged node's drain is one of the drain table's values, and
  every dealt pressure is one of the pressure table's values. Over many
  seeds each distribution's frequencies match its table.
- No dealt node opens above two-thirds of capacity, and every dealt node has
  enough capacity left to be worth reaching — the deepest opens with 20.
- The same seed deals the same board every time; a different seed deals a
  different one.
- The deal advances the seed, and the state it produces carries the advanced
  seed — the first turn of the game does not re-use the seed the deal
  started from.
- A game played from a dealt board runs to completion: nodes drain from
  wherever they were dealt, run out, recover, and the charge draw tops the
  board back up to five.
- The first charge draw of a game favours the sites dealt the most pressure,
  and a site dealt pressure 1 can still be drawn.
- A node dealt at drain 40 runs out sooner than one dealt at drain 0, by
  about the margin the tables imply.
- The same opening seed and the same sequence of actions produce the same
  game every time, with `seededReplay.test.ts`'s expectations regenerated
  against the new draw order.
- The board renders a dealt opening correctly: charged nodes at their dealt
  stage of burn, active sites at their dealt size and warmth.
- `fullGame.test.ts` and `sitePool.test.ts` pass.
