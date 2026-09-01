# Story 00000027 — Reduce to three node states

## Summary

A site has **three** states instead of four, and ships no longer have
anything to do with which state it is in.

- **Active** — eligible to be charged, but producing nothing. A ship may not
  end a move here.
- **Charged** — producing energy. A ship may end a move here, collect from it
  and gain shields on it, exactly as today.
- **Dormant** — cooling down after running out. Not eligible to be charged. A
  ship may not end a move here.

The cycle is active → charged → dormant → active, and it turns entirely on
the clock. Today a site becomes charged the moment any ship touches it
(rules.md §8.2); after this story a site becomes charged because the board
picked it, at the end of a turn, whether or not a ship is anywhere near it.

This collapses today's four states into three: today's **dormant** ("not in
play") and **active** ("in play, but nothing has reached it yet") are the
same thing once waking-on-touch is gone, and they merge into the new
**Active**. Today's **depleted** is renamed **Dormant**. **Charged** keeps
its name and its meaning.

The invariant changes with it. Today exactly five sites are active or
charged. After this story the board **tries** to keep five sites **charged**:
at the end of every turn it charges as many active sites as it takes to get
back to five. If there are not enough active sites, it charges what it can
and the board simply runs short until the next turn — and charged nodes
still run out on schedule whether or not the board is at its five.

### A note on words

Planning documents say **ply** for the rules' and the UI's **turn**
(CLAUDE.md, Vocabulary). **Site** is the same word everywhere.

This story renames two states, and the rename is a **rotation**: "dormant"
means one thing before it and a different thing after it, and the word that
"depleted" becomes is a word already in use. A blind search-and-replace over
either word will produce a plausible-looking, wrong result. Every rename must
be done as a deliberate mapping:

| Today      | After                                   |
| ---------- | --------------------------------------- |
| `dormant`  | `active` (merged; the state disappears) |
| `active`   | `active` (unchanged name, new meaning)  |
| `charged`  | `charged`                               |
| `depleted` | `dormant`                               |

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.10**.
This story takes it to **0.11** — a gameplay change, so it earns a changelog
entry and a version bump (tagging remains on hold, per CLAUDE.md).

What exists today:

- **`src/rules/sites.ts`** — `SiteState` (the four states), `SITES`,
  `STARTING_ACTIVE_SITES`, `startingSiteState`, `CHARGED_LIFE_PLIES`,
  `DEPLETED_COOLDOWN_PLIES`, `hasChargedNodeFinished`,
  `hasDepletedSiteFinishedCooling`, `siteCyclePosition`.
- **`src/rules/nodes.ts`** — `wakeTouchedSites` (§8.2, waking on touch) and
  `drawReplacements` (§8.6, the replacement draw), plus the empty-pool safety
  net `cooldownLongestDepletedSite`.
- **`src/rules/endOfTurn.ts`** — §8.7's five steps.
- **`src/rules/ply.ts`** — calls `wakeTouchedSites` for a move's path and for
  a winning attacker's advance.
- **`src/rules/moveLegality.ts`** — the `destination-dormant-site` and
  `destination-depleted-site` refusal reasons.
- **`src/rules/stranded.ts`** — `STRANDING_SITE_STATES`.
- **`src/board/SiteMarker.tsx`** — one artwork per state, transcribed from
  [`doc/plan/00000023-update-node-visual/node-artwork.md`](../00000023-update-node-visual/node-artwork.md).
- **`src/board/squareLabel.ts`**, **`src/board/announcements.ts`** — the
  state words in accessible names and announcements.
- **`src/rules/random.ts`** — `drawIndex(seed, count)` and the
  `randomSeed`-in-state threading the replacement draw already uses.

## In scope

### 1. The rules edit, first and on its own

Version 0.10 → 0.11, with a changelog entry, in its own commit ahead of the
code.

**§8.1 — three states.** The list of four becomes the list of three above,
and the cycle becomes active → charged → dormant → active. "Exactly five
sites are active or charged at any moment" becomes the board's target of
**five charged**, stated as an aim rather than an invariant: the board
charges up to five, and falls short when it has to.

**§8.2 — waking a node — is deleted outright.** Nothing a ship does changes a
site's state. Every cross-reference to it goes with it, including §7's
sentence about the squares a winning attacker crosses counting as touched,
and §3.1's and §6's flying-over language where it exists only to say what a
fly-over wakes.

**§8.3 — how long a node lives — is rewritten around the new clock start.** A
site charged at the end of turn N is charged for turns **N+1 to N+9**: nine
turns during which a ship can stand on it. Its whole rationale changes with
it — nobody wakes a node any more, so the clock belongs to nobody, and the
paragraph about the waker collecting five times and the note that "the clock
belongs to whoever woke the node" both go. What replaces them is the plainer
fact: a node appears, both players are the same distance from it in time, and
a player who reaches it on the first of its nine turns and holds it collects
from it five times.

**§8.5 — depleted and dormant sites — becomes "active and dormant sites"**
and keeps its shape: a ship may not end a move on either, may fly over both,
and a ship left standing on a site that ran out underneath it is stranded on
the same terms. Two things change. The states named are now active and
dormant. And the final paragraph — a site that wakes underneath a ship
becomes charged immediately — is **deleted**: charging no longer needs a
waker, so an occupied active site is charged like any other, and a stranded
ship that finds its site charged under it is simply lucky.

**§8.6 — waking a replacement — becomes "charging a site"**, and describes
step 3 of the new end-of-turn sequence: as many **active** sites as it takes
to bring the charged count back to five are chosen at random, one at a time,
each equally likely. If fewer than that are active, fewer are charged and the
board runs below five. The "genuinely random, and neither player can see it
coming" assurance carries over unchanged. The dormant cooldown of nine turns
stays, now described as ending in the site going active.

**The empty-pool safety net is deleted.** §8.7's rule that "the site that has
been depleted longest goes back to dormant first" exists so a replacement is
always available; the new rule tolerates running short, so the safety net has
nothing left to protect. Appendix B's reference to it goes too.

**§8.7 — end-of-turn order — is reordered.** Five steps:

1. Each of the moving player's ships standing on a charged node gains a
   shield.
2. The moving player collects energy.
3. Charged nodes that have finished their nine turns become **dormant**,
   stranding any ship left on them.
4. As many active sites as it takes to bring the board back to five charged
   are charged (§8.6).
5. Dormant sites that have finished cooling down become **active**.

Step 5 is last **deliberately**, and the section says so: it is what makes a
site spend at least one whole turn as active before it can be charged. A site
that finishes cooling at the end of turn N goes active after that turn's
charge draw, is active for the whole of turn N+1, and is first eligible in
turn N+1's draw. Putting it anywhere before step 4 — first, as the ordering
in the story brief had it, or between steps 3 and 4 — lets a site go dormant
→ active → charged inside one end-of-turn sequence, never visibly active at
all. Today's §8.7 puts cooling before the draw for exactly the opposite
reason, to guarantee the pool is never empty; that guarantee is no longer
wanted.

**§8.4 — energy — is untouched.** The table still runs 0 to 5 charged nodes
held.

**§2** — the definition of **node** becomes "a site that is charged: the one
a ship stands on to collect energy", and "exactly five sites are active or
charged" becomes the five-charged target.

**§1** — "which node site wakes up next is random" becomes which site is
charged next.

**§3.2 — the spacing property loses its reason.** "No single legal move may
touch two sites" exists so that one move cannot wake two nodes, and nothing
wakes on touch any more. The seventeen positions do not change in this story.
The paragraphs that derive the property, and the 3-and-2 numeric note derived
from §6, are replaced by a short note recording that the constraint was tied
to waking-on-touch and no longer binds — so a future story that revisits the
layout knows the current positions satisfy a requirement that has been
withdrawn, rather than finding an unexplained rule.

**§6 and §7** — "a dormant or depleted site" becomes "a site that is not
charged" wherever it appears: §6's restriction on ending a move, §7's note
that a stranded ship can still be attacked, and §7's list of what a winning
attacker may not advance onto.

**Appendix B** is refreshed. The arithmetic is unchanged in substance — nine
turns charged plus nine dormant is eighteen turns unavailable, five charged
sustained means a charge roughly every 1.8 turns, so about five sites sit
dormant and about seven active at any moment — but it is restated for the new
states, and its conclusion changes: running short is now a legal outcome
rather than a failure, so what the seven-active margin protects is the
randomness of the draw, not its availability.

### 2. The opening position

The board opens with **five sites charged** — H8, E5, K5, E11 and K11, the
same five that are active today — and the other twelve **active**. Nothing is
dormant at the start.

Their clocks are **staggered**, and this is the one deliberately artificial
thing in the story. Five sites charged on the same turn all run out on the
same turn, are all replaced on that turn, and the whole board then pulses in
lockstep for the rest of the game; nothing in the cycle would ever break it
up. Staggering the opening five spreads the expiries once, and because each
replacement's clock starts when its predecessor runs out, the stagger then
holds for the whole game without any further rule.

Five expiries spread as evenly as nine turns allow fall at the ends of turns
2, 4, 5, 7 and 9:

| Site | Runs out at the end of turn |
| ---- | --------------------------- |
| K5   | 2                           |
| E11  | 4                           |
| K11  | 5                           |
| E5   | 7                           |
| H8   | 9                           |

H8 starts at the beginning of its cycle with all nine turns ahead of it —
it is the hardest square on the board to reach, so it is the one that should
not be part-spent when the game starts. The other four are assigned so that
each 180°-rotation pair (E5 with K11, K5 with E11) holds the two closest
figures available, which keeps the opening near the board's own symmetry
without giving up the even spread. It is not perfectly symmetric, and cannot
be: five distinct expiry turns cannot be laid symmetrically over four
symmetric squares and a centre.

This is expected to be temporary — a later story may change how the cycle is
seeded — so it should be written as one obvious table in the rules and one
obvious table in `sites.ts`, easy to find and easy to replace.

### 3. Ships stop changing site states

`wakeTouchedSites` and everything that exists only to serve it — the
`SiteChargedEffect` it raises today, `SiteReach`, `WakeResult` — are deleted,
along with both call sites in `ply.ts` (a move's path, and a winning
attacker's advance) and the announcement wording for a ship waking a node.
Delete what becomes unused rather than leaving it in place unreferenced.

The end-of-turn charge draw raises an effect of its own, and the state going
dormant → active raises one too (today's `site-cooled`, renamed for what it
now does). Both are board events with no ship attached, and the announcement
wording follows: today `site-cooled` produces no clause at all, and the new
pair should be judged the same way rather than inherited by default.

### 4. The draw

The charge draw uses the game's existing seeded generator
(`src/rules/random.ts`, `drawIndex`) and the same `randomSeed` on the state
that the replacement draw uses today, threaded the same way. Charging more
than one site in a turn draws one at a time without replacement — each drawn
site leaves the pool and the seed advances before the next draw — exactly as
`drawReplacements` does now. Occupied active sites are in the pool like any
other. `Math.random` is banned in game code (CLAUDE.md), and this is not the
exception.

A game recorded with its opening seed still replays exactly.

### 5. Movement, stranding and the rest of the rule code

- **`moveLegality.ts`** — the two refusal reasons become
  `destination-active-site` and `destination-dormant-site`, and the wording
  for them in `src/board/announcements.ts` follows. They stay two reasons,
  not one: "nothing has charged here yet" and "this one has run out" are
  different things for a player to be told.
- **`stranded.ts`** — `STRANDING_SITE_STATES` becomes active and dormant.
  Nothing else about §8.5's obligation changes.
- **`sites.ts`** — `SiteState` becomes the three; `DEPLETED_COOLDOWN_PLIES`
  and `hasDepletedSiteFinishedCooling` are renamed for dormant;
  `siteCyclePosition`'s two clocked states become charged and dormant, and
  active is the one state without a clock. `STARTING_ACTIVE_SITES` becomes
  the staggered charged five of section 2. The five-charged target gets a
  named constant next to `CHARGED_LIFE_PLIES`.
- **`gameState.ts`** — `startingGameState` builds the new opening position.
  A site charged before turn 1 has an `enteredOnPly` at or below zero, which
  is arithmetically fine everywhere it is read; if that reads badly, the
  alternative is to store the turn a clock **ends** rather than the one it
  began, which is a larger change and should only be made if the plan finds a
  reason beyond taste.
- **`energy.ts`** and **`src/hud/ScoreDisplay.tsx`** carry comments asserting
  "exactly five sites are ever active or charged". The bound they rely on
  still holds — a side can never hold more than five charged nodes — but the
  reason has changed and the comments must say the new one.

### 6. Artwork

Three states, three artworks:

| State   | Artwork                                                           |
| ------- | ----------------------------------------------------------------- |
| Active  | today's **active** artwork — the radius-24 gold disc, unchanged   |
| Charged | unchanged, including its start-to-end travel over the nine turns  |
| Dormant | today's **depleted** artwork — the grey radius-70 fill, unchanged |

Today's **dormant** artwork — the small radius-12 pale disc — has no state
left to draw and comes out of `SiteMarker.tsx`. It is not lost: it is
recorded in full, as SVG, in
[`doc/plan/00000023-update-node-visual/node-artwork.md`](../00000023-update-node-visual/node-artwork.md),
which is where the current code came from, so the future story that wants it
back has it. Keeping a dead artwork in the switch would leave an unreachable
branch that lint and the exhaustive-switch check both have opinions about,
for no gain over the reference document.

`SiteMarker.tsx`'s exhaustive switch over `SiteState` has no default, so
narrowing the type is a compile error until every arm is dealt with — which
is the intended way to find them all.

### 7. `README.md` and `CLAUDE.md`

`README.md` describes waking on touch directly: "A node wakes the moment a
ship touches it, landing on it or flying over it", and "five of them already
nodes in play". Both are wrong after this story and must be rewritten for the
new cycle — nodes light up on their own, and the board keeps five lit.
Run `/update-readme` for the rest of the diff.

`CLAUDE.md`'s **Hub** vocabulary entry defines a hub as "a site that is
currently in play"; that now means precisely "a site that is charged", and
the entry should say so.

## Out of scope

- **Balance.** Charged nodes now appear on their own, five at a time, and can
  no longer be claimed by touching them early; whether that makes the game
  better, and what the nine-turn figures and the target of five should be
  under it, is for games played under 0.11 and for follow-up stories.
- **The site layout.** §3.2's spacing property loses its justification in
  this story, but the seventeen positions do not move. Choosing positions
  under the new cycle is a separate story.
- **The shelved artwork.** The small pale disc is preserved in the artwork
  reference and comes back with whatever state a future story gives it. This
  story adds no state for it and draws it nowhere.
- **How the opening five are seeded.** The staggered table is fixed and
  written out; it is not made configurable, randomised, or derived.
- **Combat, movement ranges, bays, energy values, game length** — all
  untouched except where the words for site states appear in them.
- **Game recording and replay.** The property that a seeded game replays
  exactly is kept, not extended.
- **Accessibility work**, per the accessibility section of `CLAUDE.md`. The
  state words in accessible names and announcements change with the states
  themselves; existing automated tests are updated where the path is
  straightforward, and no plan step is added for testing accessibility. Any
  accessible behaviour knowingly given up goes in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.11, and the changelog has an
  entry.
- `SiteState` has three members, and no code path can produce a fourth.
- A ship that lands on or flies over an active site leaves it active. No ship
  action of any kind changes any site's state.
- A ship may end a move on a charged site, and on no other site.
- At the end of a turn in which nothing ran out, nothing is charged: the
  board is already at five.
- A charged node that runs out is replaced the same turn, so the board is
  back to five before the opponent moves.
- A site that finishes cooling at the end of turn N is active for turn N+1
  and is first eligible for the charge draw at the end of turn N+1 — never
  charged in the same end-of-turn sequence in which it went active.
- With every site either charged or dormant, the draw charges nothing, the
  board runs below five, and the game continues without error. When actives
  become available again the board climbs back to five.
- Charged nodes still run out on schedule while the board is below five.
- A site charged at the end of turn N is charged for turns N+1 to N+9, and a
  player who reaches it on turn N+1 and holds it collects from it five times.
- The opening five are charged, run out at the ends of turns 2, 4, 5, 7 and 9,
  and the board does not fall into lockstep: over a long game, expiries stay
  spread across turns rather than arriving five at a time.
- A stranded ship whose site is charged underneath it is on a charged node
  and collects from it; a stranded ship whose dormant site goes active is
  still stranded.
- The same opening seed and the same sequence of actions produce the same
  charged sites every time; a different seed produces a different game.
- Sites appear on the board with the three artworks above, and the charged
  and dormant clocks still show their progress.
- The full-game test from story 12 still runs to completion, and the site-pool
  test's premise is rewritten for a board that is allowed to run short.
