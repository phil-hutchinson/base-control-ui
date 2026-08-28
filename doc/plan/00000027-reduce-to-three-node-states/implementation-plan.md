# Implementation plan — 00000027 Reduce to three node states

## What this story is

A site has **three** states instead of four, and **nothing a ship does changes
any site's state**. The cycle turns entirely on the clock:

- **Active** — eligible to be charged, producing nothing. A ship may not end a
  move here.
- **Charged** — producing energy. A ship may end a move here, collect from it
  and gain shields on it, exactly as today.
- **Dormant** — cooling down after running out. Not eligible to be charged. A
  ship may not end a move here.

Today a site becomes charged the moment any ship touches it (rules.md §8.2).
After this story a site becomes charged because the **board** picked it, at the
end of a turn, whether or not a ship is anywhere near it. At the end of every
turn the board charges as many active sites as it takes to bring the charged
count back to **five**; if there are not enough active sites it charges what it
can and runs short until the next turn.

This is a **gameplay change**, so `doc/ruleset/rules.md` goes from version
**0.10** to **0.11**, with a `doc/ruleset/changelog.md` entry and a matching
`RULES_VERSION` bump, in its own commit ahead of the code (step 1). Tagging
stays on hold, per `CLAUDE.md`.

### The rename is a rotation — read this before touching anything

Two state words change meaning. A search-and-replace over either one produces a
plausible-looking, wrong result. Every rename in this plan is a **deliberate
mapping**:

| Today (0.10) | After (0.11)                            |
| ------------ | --------------------------------------- |
| `dormant`    | `active` (merged; the state disappears) |
| `active`     | `active` (same name, new meaning)       |
| `charged`    | `charged` (unchanged)                   |
| `depleted`   | `dormant`                               |

Two consequences worth holding on to:

- The word **`dormant` appears in the code before and after this story and
  means different things either side of it.** A line that reads
  `state === "dormant"` today means "not in play"; the same line after step 3
  means "cooling down". Every such line must be re-decided from the mapping
  above, never left alone because it still compiles.
- Today's **`STARTING_ACTIVE_SITES`** and the new **starting charged five** are
  the _same five squares_ (H8, E5, K5, E11, K11) in a _different state_. Do not
  read the constant's survival as evidence that nothing changed there.

### Vocabulary reminder for a cold reader (`CLAUDE.md`)

Planning documents and code say **ply**; `rules.md`, the UI and `README.md` say
**turn**. They are the same thing: one player's single action, after which play
passes. **Site**, **bay** and **action** are the same word everywhere. **Hub**
is the code word for what player-facing text calls a **node** — and after this
story a node is precisely _a site that is charged_.

## Where the work lands

| File                                                        | What happens to it                                                                                                          |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `doc/ruleset/rules.md`                                      | §1, §2, §3.2, §6, §7, all of §8, Appendix B rewritten; §8.2 deleted and the section numbers closed up; 0.10 → 0.11 (step 1) |
| `doc/ruleset/changelog.md`                                  | New 0.11 entry at the top (step 1)                                                                                          |
| `src/rules/rulesVersion.ts`                                 | `RULES_VERSION` → `"0.11"` (step 1)                                                                                         |
| `src/rules/nodes.ts`                                        | Loses `wakeTouchedSites`, `SiteReach`, `WakeResult`, `SiteChargedEffect` (step 2); deleted outright (step 3)                |
| `src/rules/ply.ts`                                          | Both wake call sites and the site-charged effects go; the fight invariant's site check tightens (step 2)                    |
| `src/rules/siteSpacing.test.ts`                             | Deleted — the property it pins is withdrawn in 0.11 (step 2)                                                                |
| `src/rules/sites.ts`                                        | `SiteState` narrows to three; both clocks re-based; the staggered opening table; `TARGET_CHARGED_SITES` (step 3)            |
| `src/rules/gameState.ts`                                    | `startingGameState` builds the new opening; `SiteStatus`'s `enteredOnPly` gets its new meaning (step 3)                     |
| `src/rules/endOfTurn.ts`                                    | Run-out goes to dormant; cooling goes to active and moves last (step 3); the charge draw is inserted (step 4)               |
| `src/rules/moveLegality.ts`                                 | The two refusal reasons become `destination-active-site` and `destination-dormant-site` (step 3)                            |
| `src/rules/stranded.ts`                                     | `STRANDING_SITE_STATES` becomes active and dormant (step 3)                                                                 |
| `src/rules/combat.ts`                                       | `winnerAdvance`'s two forbidden states (step 3)                                                                             |
| `src/rules/energy.ts`, `src/hud/ScoreDisplay.tsx`           | The "exactly five active or charged" comments get the new reason (step 3)                                                   |
| `src/board/SiteMarker.tsx`                                  | Three arms, one artwork each; the radius-12 pale disc comes out (step 3)                                                    |
| `src/board/announcements.ts`                                | Refusal wording (step 3); the new end-of-turn clauses (steps 3 and 4)                                                       |
| `src/rules/sitePool.test.ts`                                | Deleted with the guarantee it guarded (step 3); rewritten around the randomness margin (step 5)                             |
| `src/rules/chargeDraw.ts` (new)                             | §8.2's draw: the active pool, the shortfall to five, the seed (step 4)                                                      |
| `src/rules/seededReplay.test.ts`                            | Extended to cover the charge draw (step 5)                                                                                  |
| `src/rules/fullGame.test.ts`                                | Scoring assertions suspended (step 2), policy updated (step 3), assertions restored (step 5)                                |
| `README.md`, `CLAUDE.md`                                    | The waking-on-touch wording and the **Hub** entry (step 6)                                                                  |
| `doc/plan/00000021-accessibility-tech-debt/known-issues.md` | Existing entries' state names refreshed (step 3)                                                                            |

Deliberately **not** touched:

- **The seventeen site positions** (`SITES` in `src/rules/sites.ts`). §3.2's
  spacing property loses its justification, but no site moves in this story.
- **`src/rules/random.ts` and `src/game/seed.ts`.** The generator and the
  opening seed are unchanged; this story swaps one consumer of the stream for
  another.
- **`src/board/squareLabel.ts`.** It builds `"<state> site"` from the state word
  itself, so it produces "active site", "charged site" and "dormant site"
  correctly with no edit. Its tests change; the module does not.
- **§8.4's energy table** (0 to 5 charged nodes held) and everything about
  combat, movement ranges, bays and game length.
- **`doc/plan/00000023-update-node-visual/node-artwork.md`.** See **D14**.

---

## Design decisions and reasoning

This section is the design record for the story. The code in this repository
does not carry design history (`CONTRIBUTING.md`, "Comments"), so anything a
future reader needs to know about **why** is written here and nowhere else.

### D1 — The rules change lands first, and the code is knowingly behind it for three commits

`CLAUDE.md` and `doc/guidelines/implementation-plan-guide.md` both require it:
`rules.md` is the single source of truth and the code implements it, so the
document is edited, the version bumped and the changelog written before any
behaviour changes.

Between step 1 and step 4 the code is knowingly behind the document, in a
different way at each stage. The windows are deliberate, and no step should try
to paper over the one it sits in:

| After step | The board behaves like this                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 1          | 0.10 in full: five active sites, charged on touch                                                   |
| 2          | Inert: five active sites, nothing can ever charge, no energy is ever collected                      |
| 3          | The 0.11 cycle without the draw: five charged at the start, running out on schedule, never replaced |
| 4          | 0.11 in full                                                                                        |

### D2 — §8.2 is deleted, and the section numbers close up with minimum churn

Deleting §8.2 (waking a node) outright would leave §8 reading 8.1, 8.3, 8.4 — a
hole in a player-facing rulebook, which reads as an error rather than as a
decision. Renumbering everything below it (8.3→8.2, 8.4→8.3, …) would be
correct but would invalidate every `§8.3`/`§8.4`/`§8.5` citation in the
document and in roughly twenty source and test files.

Instead the **new "Charging a site"** (today's §8.6, rewritten) moves up into
the vacated §8.2 slot, and §8.7 moves down into the vacated §8.6 slot:

| 0.10                       | 0.11                                 |
| -------------------------- | ------------------------------------ |
| §8.1 The four states       | §8.1 The three states                |
| §8.2 Waking a node         | §8.2 Charging a site (from old §8.6) |
| §8.3 How long a node lives | §8.3 How long a node lives           |
| §8.4 Energy                | §8.4 Energy                          |
| §8.5 Depleted and dormant  | §8.5 Active and dormant sites        |
| §8.6 Waking a replacement  | — (moved to §8.2)                    |
| §8.7 End-of-turn order     | §8.6 End-of-turn order               |

This keeps §8.3, §8.4 and §8.5 where they are — the three most-cited sections
in the code — and it is also the right _reading_ order: §8.1 lists the states
and the cycle, and §8.2 immediately answers "so how does a site become
charged?", which is exactly the question the old §8.2 answered before the
answer changed.

The consequence to carry through the whole plan: **every `§8.6` citation in the
code now means the end-of-turn sequence, and the charge draw is `§8.2`.** Each
step updates the citations in the files it touches; step 6 sweeps for
stragglers.

### D3 — Both clocks now measure plies since the end of the ply the state was entered on

Today the two clocks disagree with each other. `hasChargedNodeFinished` counts
the ply the site was woken on (`ply - entered + 1 >= 9`), because a ship woke it
_during_ that ply and it was charged for the rest of it.
`hasDepletedSiteFinishedCooling` does not (`ply - entered >= 9`), because a site
depletes at the _end_ of a ply.

Under 0.11 both transitions happen at the end of a ply, so both clocks take the
second shape:

- `enteredOnPly` means **the ply at whose end the site entered this state**.
- A site charged at the end of ply N is charged for plies **N+1 … N+9** and
  runs out at the end of ply N+9 — which is `ply - entered >= CHARGED_LIFE_PLIES`.
- A site that went dormant at the end of ply M is dormant for plies M+1 … M+9
  and goes active at the end of ply M+9 — unchanged arithmetic, unchanged name
  shape.

`siteCyclePosition` follows: the charged branch becomes the same expression the
depleted branch already used (`elapsed = ply - entered - 1`, denominator
`CHARGED_LIFE_PLIES - 1`), so the two clocked states now share one computation
with a per-state denominator. That is a simplification, not a coincidence: both
clocks are now the same clock.

**Rejected:** storing the ply a clock _ends_ rather than the one it began, as
the story raises. Nothing in the code needs it — the arithmetic above works
unchanged for the negative `enteredOnPly` values the staggered opening produces
(**D4**) — and it would touch every construction of a `SiteStatus` in the
codebase for a gain the story itself describes as taste.

### D4 — The staggered opening is one table, transcribed as run-out plies

Five sites charged on the same turn all run out on the same turn, are all
replaced together, and the board then pulses in lockstep for the rest of the
game — nothing in the cycle would ever break it up. The opening five therefore
have **staggered clocks**, and because each replacement's clock starts when its
predecessor runs out, one stagger at the start holds for the whole game with no
further rule. This is the one deliberately artificial thing in the story.

| Site | Runs out at the end of turn | `enteredOnPly` |
| ---- | --------------------------- | -------------- |
| K5   | 2                           | −7             |
| E11  | 4                           | −5             |
| K11  | 5                           | −4             |
| E5   | 7                           | −2             |
| H8   | 9                           | 0              |

`sites.ts` transcribes the **run-out turn** column, exactly as `rules.md` states
it, and derives `enteredOnPly = runsOutAtEndOfPly - CHARGED_LIFE_PLIES`. That
way the table in the code and the table in the document are the same numbers,
and only one line of arithmetic connects them.

Four of the five values are **negative**, meaning "this clock started before the
game did". Every reader of `enteredOnPly` is a subtraction, so negatives are
arithmetically fine, and `siteCyclePosition` clamps to [0, 1] anyway. K5 shows
as seven-ninths spent on ply 1, which is exactly what "staggered" should look
like.

H8 gets the full nine turns because it is the hardest square on the board to
reach; the other four pair up by 180° rotation (E5 with K11, K5 with E11) so the
opening stays near the board's own symmetry. Perfect symmetry is impossible —
five distinct expiry turns cannot be laid symmetrically over four symmetric
squares and a centre.

The story expects this to be temporary, so it is written as one obvious table in
`rules.md` and one obvious table in `sites.ts`, and is **not** made
configurable, randomised or derived.

### D5 — `sites.ts` owns the whole opening position, and returns it structurally

`startingSiteState(square)` becomes `startingSiteStatus(square)`, returning both
the state and the `enteredOnPly` the stagger implies (and `undefined` for a
square that is not a site). `gameState.ts` then simply writes what it is given.

The return type is declared **structurally** in `sites.ts` (state plus
`enteredOnPly`), not as `SiteStatus`: `SiteStatus` lives in `gameState.ts`,
which imports `sites.ts`, so naming it would create an import cycle. TypeScript's
structural typing makes the value assignable to `SiteStatus` with no cast.

**Rejected:** moving `SiteStatus` into `sites.ts`. `gameState.ts` declares every
part of the game state's shape (`Ship`, `EnergyTotals`, `SiteStatus`) and should
keep doing so. **Rejected:** exporting the raw table and doing the arithmetic in
`gameState.ts` — that would put clock arithmetic in the module that is meant to
be plain data assembly.

### D6 — Why the three code steps must run in this order

**The wake deletion (step 2) must come before the rotation (step 3).** If the
states were merged first while `wakeTouchedSites` still existed, every one of
the twelve non-charged sites would be `active`, and a ship touching any of them
would charge it. The board could then hold far more than five charged nodes, and
`energyForNodesHeld` in `src/rules/energy.ts` throws a `RangeError` above five —
so the intermediate commit would not merely be wrong, it could crash a game.

**The rotation (step 3) must come before the draw (step 4).** The draw picks
from the _active_ pool, which does not exist in its new meaning until the
states are merged.

The cost is step 2's window: for one commit the board is inert, because nothing
can charge a site any more and nothing charges one yet. That is visible in
`src/rules/fullGame.test.ts` and is handled by **D18**.

### D7 — Step 3 cannot usefully be split further

Narrowing `SiteState` from four members to three is a single compile event.
`SiteMarker.tsx`'s switch is exhaustive with no `default`, `moveLegality.ts` and
`combat.ts` compare against the literal `"depleted"`, and `endOfTurn.ts` calls a
function whose name contains it — none of them can be left for a later step
without breaking the build, and the minimal fix for each _is_ its final form.
The story says as much: the exhaustive switch "is the intended way to find them
all".

So step 3 is deliberately the largest step in the plan. What defends it against
the rotation trap is not smallness but explicitness: the step carries a mapping
table for every consumer, and the implementer is told to re-decide each site
comparison from the table rather than edit the word in place.

One consumer will **not** produce a compile error and must be found by reading:
`STRANDING_SITE_STATES` in `src/rules/stranded.ts` is a `Set<string>`, so
`new Set(["dormant", "depleted"])` still typechecks after the narrowing while
meaning something wrong. It is called out explicitly in step 3.

### D8 — `nodes.ts` is deleted, and the draw arrives as a new module

After step 2, `src/rules/nodes.ts` holds only the replacement draw and its
empty-pool safety net. 0.11 retires both: the pool is now the active sites, the
count is a shortfall against a target rather than one per run-out, and the
safety net protects a guarantee the ruleset no longer makes. Nothing of the old
draw survives into the new one — different pool, different count, different
effect — so step 3 deletes the module and step 4 adds
**`src/rules/chargeDraw.ts`** in its place, named for the one thing it does.

This is also a defence against the rotation trap: the old draw took its pool
from sites in the state called `dormant`, and the new draw takes it from sites
in the state called `active`. Editing one into the other invites exactly the
wrong-but-plausible result the story warns about. Writing it fresh does not.

**Rejected:** keeping the name `nodes.ts` and rewriting its contents in place —
it would read in the diff as an edit of the old draw. **Rejected:** putting the
draw inline in `endOfTurn.ts` — that module sequences §8.6's steps and delegates
each rule to the module that owns it, which is why the draw was not there
before.

### D9 — The draw computes its own shortfall; it is not handed a count

Today `drawReplacements(state, count)` is called with the number of nodes that
just ran out, because the invariant guaranteed those two numbers were equal.
They are no longer equal: if the board was short last turn because no active
site was available, this turn it must charge more sites than ran out this turn
to climb back. The draw therefore takes the state, counts the charged sites,
compares against `TARGET_CHARGED_SITES` (5, declared in `sites.ts` next to
`CHARGED_LIFE_PLIES`), and draws that many — or as many as the pool holds.

### D10 — The pool, the order and the seed

- **The pool** is every site currently in state `active`, collected by walking
  `SITES` in its declared order. Occupied active sites are in the pool like any
  other; the ship standing there is simply lucky.
- **The order does not affect fairness** — a uniform index over a set is uniform
  whichever order the set is written in — but it must be **fixed and stable**,
  because a recorded game replays by re-running the same draws against the same
  pools. `SITES` order is the order `rules.md` §3.2 tabulates, and is what the
  old draw used.
- **Charging several sites in one turn draws one at a time without
  replacement**: each drawn site leaves the pool and the seed advances before
  the next draw, exactly as `drawReplacements` did.
- **The seed advances once per site charged, and not at all when nothing is
  charged.** `drawIndex` throws a `RangeError` on a count of zero by design, so
  the draw must check for an empty pool and return the state untouched rather
  than call it — running short is a legal outcome now, not an error.
- `Math.random` is banned by lint in game code (`CLAUDE.md`,
  `eslint.config.js`), and this is not the exception.

### D11 — "Cooled dormant sites become active" is last, and that is the whole mechanism

§8.6's five steps end:

3. Charged nodes that have finished their nine turns become **dormant**,
   stranding any ship left on them.
4. As many active sites as it takes to bring the board back to five charged are
   charged (§8.2).
5. Dormant sites that have finished cooling down become **active**.

Step 5 sits after step 4 **deliberately**, and the rules document says so. It is
what makes a site spend at least one whole turn visibly active before it can be
charged: a site that finishes cooling at the end of turn N goes active _after_
that turn's charge draw, is active for the whole of turn N+1, and is first
eligible in turn N+1's draw.

Putting it anywhere earlier — first, or between steps 3 and 4 — would let a site
go dormant → active → charged inside one end-of-turn sequence, never visibly
active at all, and would make the "active" state unobservable in exactly the
case a player would most want to see it coming.

Note that today's §8.7 puts cooling **before** the draw for precisely the
opposite reason: to guarantee the dormant pool is never empty. That guarantee is
withdrawn in 0.11, so the reason for the old order is gone and the new order can
have the opposite rationale.

This is the story's most easily-broken decision, and step 4 carries a named
test for it.

### D12 — The two board events, their effect names, and what gets announced

Three site transitions exist after this story, and all three are board events
with no ship attached:

| Transition        | Effect             | Declared in                | Announced?                      |
| ----------------- | ------------------ | -------------------------- | ------------------------------- |
| charged → dormant | `node-ran-out`     | `endOfTurn.ts` (unchanged) | Yes — "The node at H8 ran out." |
| active → charged  | `site-charged`     | `chargeDraw.ts` (step 4)   | Yes — a new node has appeared   |
| dormant → active  | `site-went-active` | `endOfTurn.ts` (step 3)    | No                              |

The story asks for both new effects to be judged on their merits rather than
inheriting today's treatment. The judgements:

- **`site-charged` speaks.** A node appearing is now the _only_ way a node ever
  appears, it is the thing both players are racing towards, and today's
  equivalent (`site-woken`) already spoke. Recommended wording:
  `A new node charged at ${square}.` The old variant "already charged because a
  ship was standing there" goes with §8.5's final paragraph — an occupied site
  is charged like any other now, so there is nothing special to say.
- **`site-went-active` is silent**, like today's `site-cooled`. An active site
  produces nothing, cannot be stopped on, and is not a node (§2's new
  definition); it is only the pool the draw picks from. Announcing roughly one
  of these per turn would be noise around the clause that matters.

The name `site-charged` is **reused**: step 2 deletes today's ship-caused
`SiteChargedEffect` (which carried a ship id, a side and a `SiteReach`), and
step 4 declares a new one carrying only a square. Reuse is safe because the two
never coexist and because the payload differs, so no surviving call site could
compile against the wrong one — the old filters live on `MoveEffect` and
`AttackEffect`, which no longer contain the member at all. It is called out here
so a reviewer reading the diff does not mistake the new type for the old one
returning.

### D13 — Two refusal reasons, not one

`moveLegality.ts`'s `destination-dormant-site` and `destination-depleted-site`
become `destination-active-site` and `destination-dormant-site` — note the
rotation: today's _dormant_ reason becomes the _active_ one, and today's
_depleted_ reason becomes the _dormant_ one.

They stay two reasons rather than collapsing into one "not charged" reason,
because "nothing has charged here yet" and "this one has run out and is cooling"
are different facts for a player to be told, and the second one carries an
expectation about when the square becomes useful again. Recommended wording in
`src/board/announcements.ts`:

- `destination-active-site` — `${square} is an active site — nothing has charged there yet, so a ship cannot stop there.`
- `destination-dormant-site` — `${square} is a dormant site — it has run out and is cooling down, so a ship cannot stop there.`

Both name the state in the same word the square's accessible name uses
(`squareLabel.ts` builds `"<state> site"` from the state itself), so a player
hearing "dormant site" and then this sentence hears one vocabulary, not two.

### D14 — Three artworks, and the fourth is not lost

| State   | Artwork after this story                                                                  |
| ------- | ----------------------------------------------------------------------------------------- |
| Active  | today's **active** artwork — the radius-24 gold disc, unchanged                           |
| Charged | unchanged, including its start-to-end travel over the nine turns                          |
| Dormant | today's **depleted** artwork — the radius-70 grey-to-white fill, unchanged, clock and all |

Today's **dormant** artwork — the small radius-12 pale disc — has no state left
to draw and comes out of `SiteMarker.tsx`. It is preserved in full, as SVG, in
`doc/plan/00000023-update-node-visual/node-artwork.md` (the document the current
code was transcribed from), so a future story that wants it back has it. Keeping
a dead artwork in the switch would leave an unreachable branch that both lint
and the exhaustive-switch check have opinions about, for no gain over the
reference document.

**That reference document is not edited.** It is story 23's record and its
headings use the 0.10 state names, so after this story its "Dormant" section is
the shelved disc and its "Depleted" section is what 0.11 calls dormant.
`SiteMarker.tsx`'s comment must therefore say _which section of that document_
each surviving artwork came from, in that document's own words, so a cold reader
comparing the two is not caught by the rotation.

### D15 — A fight can no longer change a site at all

`assertFightInvariants` in `src/rules/ply.ts` today permits exactly one kind of
site change during a fight — a square the winner travelled over going from
`active` to `charged` — because §8.2 let an advance wake a node. With §8.2 gone,
**no** site may change state during a fight, so the check simplifies to that:
any difference in `siteStates` between before and after is a bug, and the
message says so. This is a strengthening, and it is free.

### D16 — `siteSpacing.test.ts` is deleted outright

The file holds two tests, and 0.11 removes the justification for both:

- "no legal move touches two or more sites" pins §3.2's spacing property, which
  existed so that one move could not wake two nodes. Nothing wakes on touch any
  more. 0.11 keeps the seventeen positions but records the constraint as
  withdrawn, so a test asserting it would be the code carrying a rule the
  document does not state — which `CLAUDE.md` forbids — and would block the
  future story that revisits the layout.
- `noMoveBothChargesAndEndsInABay` guards an ordering assumption inside
  `moveSentence` in `src/board/announcements.ts`. Step 2 deletes the clause it
  guarded, so it guards nothing.

### D17 — `sitePool.test.ts`: deleted with its guarantee, rewritten around what is left

The current file is the guard Appendix B explicitly asks for: it drives
adversarial waking patterns and asserts the dormant pool never runs dry. Under
0.11 the board is **allowed** to run short, so there is no such guarantee left
to guard, and the test's whole premise (hand-charging sites to drive the
economy) describes a mechanism players no longer have.

It is deleted in step 3, with the safety net it guarded, and a file of the same
name is written in step 5 around the property Appendix B still cares about: the
**randomness margin**. What seventeen sites buy is that several sites are always
active when the draw happens, so the draw is never forced and never predictable.

### D18 — `fullGame.test.ts`'s scoring assertions are suspended for three commits

`fullGame.test.ts` asserts `energy.green > 0` and `energy.red > 0` — "the policy
should actually score, not merely reach the end". Under **D6**'s ordering the
board cannot charge anything between steps 2 and 4, so those two assertions
cannot hold. Step 2 removes them with a comment naming the step that restores
them; step 5 restores them.

This is a knowingly weakened assertion across three commits, recorded here so
the peer review reads it as planned rather than as drift. The alternative —
reordering the steps so no window exists — is ruled out by **D6**'s crash
argument.

The test's policy also needs a look in step 3: its heuristic heads for the
nearest "charged or active" site, which under 0.11 means "a node, or a square
where a node might one day appear". That is still a sane thing for a dumb greedy
policy to do (it cannot _stop_ on an active site, and it only ever plays moves
`legalDestinations` returned), so the policy is kept and only its comment and
helper name are corrected.

### D19 — Accessibility

Per the "Accessibility during pre-release" section of `CLAUDE.md` and the
story's own out-of-scope list: **no step and no test in this plan is about
accessibility.** Existing automated tests that happen to assert an accessible
name are updated where the path is straightforward — which here is every one of
them, since the state word in a square's name simply changes with the state.

`doc/plan/00000021-accessibility-tech-debt/known-issues.md` gets a **wording
refresh only**, in step 3: its entries 1 and 2 describe charged and _depleted_
sharing one shape and differing by colour alone, and that pair is now charged
and _dormant_. The problem is unchanged; only the word for it is. Entry 1 also
mentions the dormant/active size distinction, which no longer describes anything
— that clause goes.

No new entry is expected. Removing the fourth state's artwork is a removal of a
thing, not a regression of a behaviour, and that ledger records only knowingly
accepted losses. If the implementer of step 3 finds a real accessible behaviour
being given up, they add an entry then; they do not add one for the sake of it.

### D20 — Balance is out of scope

Nine turns charged, nine dormant, five charged sites and the 0–5 energy table
all keep their current values. Whether those are the right numbers under a board
that lights its own nodes is for games played under 0.11 and for follow-up
stories, not for this one.

---

## Step 1 — Rules 0.11: three states, and the board charges its own nodes

Status: committed

Notes: Edited `doc/ruleset/rules.md` per D2's renumbering (the rewritten
"Charging a site" now sits at §8.2, old §8.7 is §8.6, §8.3–§8.5 unchanged),
added the 0.11 changelog entry, and bumped `RULES_VERSION` to `"0.11"`. No
`src/` behaviour changed. `grep` confirms no `depleted` or `§8.7` remains
anywhere in `rules.md`, and no sentence says a ship wakes, charges, or
otherwise changes a site. `npm test` (673 tests, unchanged count),
`npm run typecheck`, `npm run lint` and `npm run format:check` all pass.

Edit `doc/ruleset/rules.md`, add a `doc/ruleset/changelog.md` entry and bump
`RULES_VERSION` in `src/rules/rulesVersion.ts`. **No behaviour changes in this
step** — no other file under `src/` is touched. See **D1** for why this is its
own commit and how far behind the document the code then runs.

Read the whole of `rules.md` before editing: this story touches nine of its
sections and an appendix, and several of them cross-reference each other.

### The section renumbering

Apply **D2**'s table. §8.2 (Waking a node) is deleted; the rewritten "Charging a
site" (today's §8.6) takes the §8.2 slot; today's §8.7 (End-of-turn order)
becomes §8.6. §8.1, §8.3, §8.4 and §8.5 keep their numbers. Every
cross-reference in the document to the old §8.6 or §8.7 must be repointed, and
every reference to §8.2 must be deleted along with the sentence that made it.

### Section by section

- **The version line** near the top: `**Rules version: 0.10**` becomes
  `**Rules version: 0.11**`.
- **§1 Overview.** "which node site wakes up next" becomes which site is
  **charged** next. The other random element (which bay a beaten ship is pushed
  back to) is unchanged.
- **§2 Words used in these rules.** **Node** becomes "a site that is charged:
  the one a ship stands on to collect energy". "Exactly five sites are active or
  charged at any moment" becomes the board's **target of five charged**, stated
  as an aim.
- **§3.2 Sites.** The seventeen positions and the diagram do not change. The
  **Spacing** paragraphs do: the property ("no single legal move may touch two
  sites") existed so that one move could not wake two nodes, and its derivation
  leans on §8.5's now-deleted final paragraph. Replace the derivation _and_ the
  3-and-2 numeric note with a short note recording that the constraint was tied
  to waking on touch, that waking on touch is gone as of 0.11, and that the
  seventeen positions still satisfy it but are no longer required to — so a
  future story that revisits the layout knows it is looking at a withdrawn
  requirement rather than an unexplained rule.
- **§6 Movement.** "A ship may not **end** a move on a dormant or depleted site
  (section 8.5)" becomes "on a site that is **not charged**". "It may fly over
  one freely" stays.
- **§7 Combat.** Three edits: "a ship stranded on a depleted site" becomes a
  ship stranded on a site that is not charged; the winner's advance may not end
  on "a dormant site, not a depleted site" becomes may not end on a site that is
  not charged; and the sentence "The squares the winner crosses along the way
  count as touched for section 8.2, exactly as they would for a move" is
  **deleted** — there is nothing left for a crossed square to be counted for.
  §7.1's "the same assurance section 8.6 gives for the replacement site" is
  repointed to §8.2 and to the charge draw.
- **§8.1** becomes **The three states of a site**: active, charged, dormant, as
  worded at the top of this plan, with the cycle **active → charged → dormant →
  active**. "Exactly five sites are active or charged" becomes the board's aim
  to keep **five charged**: it charges up to five at the end of every turn, and
  falls short when it has to. The opening position is stated here: **five sites
  charged — H8, E5, K5, E11 and K11 — and the other twelve active; nothing is
  dormant at the start.** Include **D4**'s stagger table (site, runs out at the
  end of turn) as its own obvious table, with a sentence saying why the opening
  clocks are staggered — five nodes charged together would run out together and
  the board would pulse in lockstep forever — and a sentence saying this is
  expected to be revisited.
- **§8.2 becomes Charging a site** (today's §8.6, rewritten and moved): at the
  end of every turn, as many **active** sites as it takes to bring the charged
  count back to five are chosen at random, one at a time, each equally likely.
  If fewer than that are active, fewer are charged and the board runs below five
  until the next turn. Charged nodes still run out on schedule whether or not
  the board is at its five. The "genuinely random, and neither player can see it
  coming" assurance carries over unchanged. The dormant cooldown of **nine
  turns** stays, now described as ending in the site going **active**.
- **§8.3 How long a node lives** is rewritten around the new clock start: a site
  charged at the end of turn N is charged for turns **N+1 to N+9** — nine turns
  during which a ship can stand on it. Its rationale changes with it: the
  paragraph about the waker collecting five times and the note that "the clock
  belongs to whoever woke the node" both **go**, because nobody wakes a node any
  more. What replaces them is the plainer fact — a node appears, both players
  are the same distance from it in time, and a player who reaches it on the
  first of its nine turns and holds it collects from it five times. Keep "a node
  runs its clock down whether or not any ship is standing on it".
- **§8.4 Energy** is untouched, table and all.
- **§8.5** becomes **Active and dormant sites** and keeps its shape: a ship may
  not end a move on either, may fly over both, and a ship left standing on a
  site that ran out underneath it is stranded on the same terms, including the
  waiver when it has no legal move. Two changes: the states named are now active
  and dormant, and the **final paragraph is deleted** — a site no longer wakes
  underneath a ship, because charging needs no waker; an occupied active site is
  charged like any other, and a stranded ship that finds its site charged under
  it is simply lucky.
- **§8.6 End-of-turn order** (today's §8.7), reordered to **D11**'s five steps.
  Keep the paragraph about a passed turn still running the sequence in full.
  Replace the note about steps 3 and 5 with a note explaining why the new step 5
  is **last**: it is what makes a site spend at least one whole turn active
  before it can be charged. **Delete the empty-pool safety net paragraph**
  entirely — the rule that "the site that has been depleted longest goes back to
  dormant first" existed so a replacement was always available, and the new rule
  tolerates running short.
- **Appendix B — Sizing the site pool** is refreshed. The arithmetic is
  unchanged in substance — nine turns charged plus nine dormant is eighteen
  turns unavailable, five charged sustained means a charge roughly every 1.8
  turns, so about five sites sit dormant and about seven are active at any
  moment — but restate it in the new states. Its **conclusion changes**: running
  short is a legal outcome now rather than a failure, so what the seven-active
  margin protects is the **randomness** of the draw, not its availability. The
  closing "the app must guard this" sentence should ask for the guard the app
  will actually carry: a test that the active pool stays comfortably above one
  over a long run, not that it never empties.
- **Appendix A** stays as it is unless the rewrite leaves something genuinely
  open.

In `changelog.md`, add a `## 0.11 — three node states` entry **above** the 0.10
entry, in the house style already there (bolded lead sentences, one bullet per
change, a closing paragraph on tagging). It should record: four states becoming
three and the mapping (**depleted** renamed **dormant**, the old **dormant**
merged into **active**); waking on touch deleted outright, so nothing a ship
does changes a site's state; the board charging up to five sites at the end of
every turn, at random, from the active sites; the invariant of five becoming a
target that may fall short; the new clock start and the loss of the "clock
belongs to the waker" consequence; the staggered opening five; §8.5's
wakes-underneath-a-ship paragraph and §8.7's empty-pool safety net both deleted;
§3.2's spacing property recorded as withdrawn; and the section renumbering of
**D2**. Close by noting that this changes how the game is played and would
ordinarily be a tagging candidate, but tagging is on hold until the game plays —
matching the wording the 0.10 entry uses.

In `src/rules/rulesVersion.ts`, set `RULES_VERSION` to `"0.11"`. It is a string
precisely so this cannot collapse to `0.1`.

Depends on: nothing.

Verification (automated): `npm test` passes with the test count unchanged (673
before this story), in particular `src/rules/rulesVersion.test.ts`, which reads
the version out of `rules.md`, compares it to `RULES_VERSION`, and requires a
`## 0.11 ` heading in `changelog.md`. Also run `npm run typecheck`,
`npm run lint` and `npm run format:check`. Nothing else changes, so nothing else
may fail.

Additionally, re-read the finished §8 end to end and confirm three things by
eye, since no test can: there is no §8.7 and no gap in the numbering; no
sentence anywhere in the document still says a ship wakes, charges or otherwise
changes a site; and the word "depleted" does not appear in the document at all.

---

## Step 2 — Ships stop changing site states

Status: pending

Delete waking on touch and everything that exists only to serve it. **The four
states stay for this step** — the state rotation is step 3. After this commit
the board is inert: nothing can charge a site, so nothing ever does (**D1**,
**D6**). That is expected, is closed by step 4, and no part of this step should
try to compensate for it.

In `src/rules/nodes.ts`:

- Delete `wakeTouchedSites`, the `SiteReach` type, the `WakeResult` interface
  and the `SiteChargedEffect` interface, together with any import left unused
  (`ReachEntry`, `Ship`, `Side`, `ShipId` are the likely candidates).
- Keep `drawReplacements`, `drawOneReplacement`, `cooldownLongestDepletedSite`,
  `SiteWokenEffect` and `SiteCooledEffect` — step 3 disposes of them.
- Rewrite the module header comment, which currently describes two transitions
  and now describes one. Repoint its §8.6/§8.7 citations per **D2** (the
  replacement draw it still holds is described by 0.10 and no longer exists in
  0.11 at all; say so in one sentence rather than pretending otherwise).

In `src/rules/ply.ts`:

- Remove both `wakeTouchedSites` call sites: the one in `applyMove` (which also
  makes the `reachFrom` lookup of `path` unnecessary — delete it and its
  `RangeError` guard, and drop the import if it is then unused) and the one in
  `applyAttack` (the advance itself still happens; only the wake goes, along
  with the `siteChargedEffects` local).
- Remove `SiteChargedEffect` from the `MoveEffect` and `AttackEffect` unions and
  from the imports. `MoveEffect` becomes the shields-reset effect plus
  `EndOfActionEffect`; `AttackEffect` becomes `FightResolvedEffect` plus
  `EndOfActionEffect`.
- Tighten `assertFightInvariants` per **D15**: the loop over site names now
  treats **any** state or `enteredOnPly` difference between `before` and `after`
  as a violation, with a message saying a fight never changes a site's state.
  `travelledSquareNames` is still needed for the crossing check, so
  `AdvancingWinner` keeps both of its square sets.
- Update the module header comment and the doc comments on `applyMove`,
  `applyAttack` and `assertFightInvariants`, all of which currently narrate
  waking.

In `src/board/announcements.ts`:

- `moveSentence` loses its `site-charged` lookup and both charging variants, and
  keeps the bay sentence and the plain move sentence. Its doc comment loses the
  paragraph about the bay case being checked first (and with it the reference to
  `noMoveBothChargesAndEndsInABay`).
- `winnerAdvanceClause` loses its `site-charged` lookup and both charging
  variants, keeping "It advanced to X and took it." and "It held its ground."
- Nothing else in this file changes in this step.

Delete `src/rules/siteSpacing.test.ts` outright (**D16**).

Tests to update in this step:

- `src/rules/nodes.test.ts` — remove every `wakeTouchedSites` test. The
  replacement-draw tests stay for now.
- `src/rules/ply.test.ts` — remove the tests that assert a move or an advance
  charges a site, and any assertion of a `site-charged` effect. Where a test
  needed a charged site as a _setup_, build it into the state directly rather
  than reaching it with a ship.
- `src/board/announcements.test.ts` — remove the charging variants of the move
  and advance sentences.
- `src/rules/fullGame.test.ts` — remove the two "the policy should actually
  score" assertions (`energy.green > 0`, `energy.red > 0`) with a comment saying
  the board cannot charge a site until the end-of-turn charge draw arrives, and
  that they are restored then (**D18**). Everything else in that test — the
  totals being consistent, the game ending, the refusals — must still pass.
- Any other test that gets a charged site by moving a ship onto a site must
  build the charged state directly instead. Search the suite for
  `wakeTouchedSites` and `site-charged` to find them all.

Add one new test, which is this step's verification: in
`src/rules/ply.test.ts`, from a state with an active site on a ship's path,
**landing on** the active site leaves it active, and **flying over** it leaves
it active; the same for a winning attacker's advance across an active site. And
a broader one: over a sequence of ordinary moves and at least one won fight, no
site's `siteStates` entry changes at all.

Depends on: Step 1 (the rules document already says nothing a ship does changes
a site's state).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass. The new tests demonstrate the story's
requirement directly — "a ship that lands on or flies over an active site leaves
it active; no ship action of any kind changes any site's state". The test count
will fall in this step (the wake tests and `siteSpacing.test.ts` go); that is
expected.

---

## Step 3 — The three states, the two clocks and the staggered opening

Status: pending

Narrow `SiteState` to three members and carry the consequences through every
consumer. This is the largest step in the plan, and **D7** explains why it
cannot usefully be split: the type narrowing is one compile event and the
minimal fix at each site is its final form.

**Before editing anything, re-read the rotation table at the top of this plan.**
Every comparison against a site state below is given as an explicit mapping. Do
not edit these words in place.

After this commit the board opens with five charged sites which run out on
schedule at the ends of turns 2, 4, 5, 7 and 9 and then cool for nine turns
each — but nothing is ever charged again, because the charge draw arrives in
step 4 (**D1**). That window is expected.

### `src/rules/sites.ts`

- `SiteState` becomes `"active" | "charged" | "dormant"`.
- `DEPLETED_COOLDOWN_PLIES` → `DORMANT_COOLDOWN_PLIES` (value 9, unchanged).
- `hasDepletedSiteFinishedCooling` → `hasDormantSiteFinishedCooling`, same
  arithmetic, doc comment repointed to §8.2 per **D2**.
- `hasChargedNodeFinished` keeps its name and changes its arithmetic per
  **D3**: a site charged at the end of ply N has finished as of ply N+9, i.e.
  `ply - enteredOnPly >= CHARGED_LIFE_PLIES`. Its doc comment must state the new
  meaning of `enteredOnPly` explicitly, because the old and new formulas differ
  by exactly one and nothing else in the code will catch a mistake here.
- `siteCyclePosition`'s clocked states become **charged** and **dormant**, with
  active the one state that has no clock and reports `undefined`. Both branches
  now compute `elapsed = plyNumber - enteredOnPly - 1` over a denominator of
  `CLOCK - 1`, so express them as one shared computation with the denominator
  chosen per state (**D3**).
- Add `TARGET_CHARGED_SITES = 5` next to `CHARGED_LIFE_PLIES`, with a comment
  citing §8.1/§8.2 and saying it is an aim, not an invariant.
- Replace `STARTING_ACTIVE_SITES` with the staggered opening table of **D4**:
  the five squares in the document's order, each with the turn at whose end it
  runs out. Transcribe the run-out turns literally from `rules.md` §8.1.
- Replace `startingSiteState` with `startingSiteStatus(square)` per **D5**,
  returning `{ state, enteredOnPly }` for a site and `undefined` otherwise:
  a site in the table is `charged` with
  `enteredOnPly = runsOutAtEndOfPly - CHARGED_LIFE_PLIES` (negative for four of
  the five, which is correct — say so in the comment); every other site is
  `active` with `enteredOnPly` 0, a value nothing reads.
- Rewrite the module header comment: four states become three, and the two
  clocks now govern how long a site stays charged (§8.3) and how long it stays
  dormant (§8.2).

### `src/rules/gameState.ts`

- `startingGameState` builds `siteStates` from `startingSiteStatus`, taking both
  the state and the `enteredOnPly` from it instead of hard-coding 0.
- `SiteStatus`'s doc comment gets `enteredOnPly`'s new meaning — **the ply at
  whose end the site entered this state**, which may be zero or negative for the
  opening five — and its "only the charged and depleted derivations consult it"
  sentence becomes charged and dormant.
- `startingGameState`'s own doc comment currently says "none entered during a
  ply, so `enteredOnPly` is 0"; that is no longer true.

### `src/rules/endOfTurn.ts`

The sequence becomes four steps in this step (the charge draw is step 4 of this
plan):

1. Shield gains — unchanged.
2. Energy — unchanged.
3. Charged nodes that have finished their nine turns become **dormant**
   (today's step 4, with `"depleted"` → `"dormant"`), stranding any ship left on
   them. `NodeRanOutEffect` and `ShipStrandedEffect` keep their names.
4. **Dormant** sites that have finished cooling become **active** (today's step
   3, with `"depleted" → "dormant"` as the state being left and
   `"dormant" → "active"` as the state being entered), and it now runs **last**.

Declare a new `SiteWentActiveEffect` (`type: "site-went-active"`, carrying the
square) in this module, replacing the `SiteCooledEffect` imported from
`nodes.ts`, and update the `EndOfTurnEffect` union. Delete the call to
`drawReplacements` and the `ranOutCount` bookkeeping that fed it. Repoint every
§8.6/§8.7 citation per **D2**, and leave a one-line comment noting that §8.6's
step 4, the charge draw, is not implemented yet — it arrives in the next step.

### `src/rules/moveLegality.ts`

`MoveRefusalReason` per **D13**: `destination-dormant-site` →
`destination-active-site`, `destination-depleted-site` →
`destination-dormant-site`. In `sixOnlyMoveRefusalReason` the test
`siteState === "dormant"` (meaning "not in play") becomes
`siteState === "active"` returning `destination-active-site`, and
`siteState === "depleted"` becomes `siteState === "dormant"` returning
`destination-dormant-site`. **This is the rotation at its most dangerous: both
lines survive with one word changed each, and swapping them would compile,
run, and be wrong.**

### `src/rules/stranded.ts`

`STRANDING_SITE_STATES` becomes active and dormant. **This is a `Set<string>`,
so the compiler will not flag the stale value** (**D7**) — it must be changed by
hand. Update the module header comment and `strandedShipIds`'s doc comment,
which name the two states.

### `src/rules/combat.ts`

`winnerAdvance`'s `siteState === "dormant" || siteState === "depleted"` becomes
`siteState === "active" || siteState === "dormant"`, and its doc comment follows.

### `src/rules/energy.ts` and `src/hud/ScoreDisplay.tsx`

Both carry a comment asserting "exactly five sites are ever active or charged"
as the reason a side can never hold more than five charged nodes. The bound
still holds — the board never charges above five — but the reason has changed
from an invariant over active-or-charged to a **ceiling on the charge draw**
(§8.1, §8.2). Say the new reason. `chargedNodesHeldBy`'s doc comment also lists
the states that pay nothing; that list is now active and dormant.

### `src/board/SiteMarker.tsx`

Three arms, per **D14**'s table: `active` keeps the radius-24 gold disc,
`charged` is unchanged, `dormant` takes the radius-70 grey-to-white fill and its
clock travel. The radius-12 pale disc is deleted. Rename
`DEPLETED_START_OFFSET_PERCENT` / `DEPLETED_END_OFFSET_PERCENT` to `DORMANT_…`.
Update the module header comment: it describes four states and which pairs share
a shape, and must now describe three. Name the source sections of
`doc/plan/00000023-update-node-visual/node-artwork.md` in that document's own
(0.10) headings, per **D14**, so the two can be compared without falling into
the rotation.

### `src/board/announcements.ts`

- The two refusal sentences, per **D13**'s wording.
- `site-cooled` becomes `site-went-active` in the end-of-turn switch, still
  producing **no** clause (**D12**), and the doc comment above
  `endOfTurnClauses` is rewritten to say why: an active site is not a node and
  produces nothing, so a site quietly becoming eligible is a board change, not a
  player event.
- The `site-woken` case goes with `SiteWokenEffect` (deleted below).

### Deletions

- `src/rules/nodes.ts` and `src/rules/nodes.test.ts` — deleted outright
  (**D8**). This removes `drawReplacements`, `drawOneReplacement`,
  `cooldownLongestDepletedSite` (the empty-pool safety net, which 0.11 deletes),
  `SiteWokenEffect` and `SiteCooledEffect`.
- `src/rules/sitePool.test.ts` — deleted (**D17**); a new one is written in
  step 5.

### The accessibility ledger

Refresh the wording of the existing entries in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` per **D19**: the
colour-alone pair is now charged and dormant, and the sentence about dormant and
active differing in size no longer describes anything. Add no new entry unless a
real accessible behaviour is being given up.

### Tests

Every test that names a site state, builds a `SiteStatus`, or asserts a square's
accessible name needs the mapping applied — `sites.test.ts`, `gameState.test.ts`,
`endOfTurn.test.ts`, `stranded.test.ts`, `movement.test.ts`, `ply.test.ts`,
`energy.test.ts`, `combat.test.ts`, `announcements.test.ts`,
`squareLabel.test.ts`, `Board.test.tsx`, `BoardSquare.test.tsx`,
`SiteMarker.test.tsx`, `fullGame.test.ts`. Apply the rotation table to each,
one at a time; do not run a global replace.

`fullGame.test.ts` additionally needs its policy comment and the helper name
`distanceToNearestChargedOrActive` reviewed per **D18** — the heuristic itself
is kept.

New tests this step must add:

1. **The opening position.** `startingGameState` gives H8, E5, K5, E11 and K11
   as `charged`, the other twelve as `active`, and nothing as `dormant`.
2. **The stagger.** Driving `runEndOfTurn` ply by ply from the starting state,
   the five run out at the ends of plies 2, 4, 5, 7 and 9 — one per ply, never
   two in the same ply.
3. **The charged clock.** A site charged at the end of ply N is charged for
   plies N+1 to N+9 and runs out at the end of ply N+9; a ship of the side to
   move standing on it from ply N+1 collects from it on five of those plies
   (its owner moves on every other ply).
4. **The dormant cooldown.** A site that went dormant at the end of ply M
   becomes active at the end of ply M+9, and not before.
5. **Movement.** A ship may end a move on a charged site and on no other site;
   it may fly over an active or a dormant site freely; the two refusals are the
   two distinct reasons of **D13**.
6. **Stranding.** A ship on an active site and a ship on a dormant site each owe
   their owner an action.
7. **Artwork.** `SiteMarker` renders the three artworks of **D14**, and the
   charged and dormant clocks still travel from their start offset to their end
   offset.

Depends on: Step 2 (nothing charges sites on touch any more, so merging the two
non-charged states cannot let a ship charge the board at will — see **D6**).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass, with the seven new checks above green. The
compiler is doing real work in this step: after `SiteState` narrows, a clean
`npm run typecheck` means every arm of every exhaustive switch has been dealt
with. Grep the whole of `src/` for the word `depleted` afterwards and confirm it
appears nowhere.

---

## Step 4 — The end-of-turn charge draw, and why cooling comes last

Status: pending

Add §8.2's charge draw and slot it into §8.6's sequence as step 4, ahead of the
cooling step. After this commit the game plays 0.11 in full.

### `src/rules/chargeDraw.ts` (new)

A new module (**D8**) holding §8.2's draw, with a header comment explaining what
it does and citing §8.2 and §8.6 step 4. It exports:

- A `SiteChargedEffect` (`type: "site-charged"`, carrying only the square). This
  reuses a type name step 2 deleted; **D12** explains why that is safe and
  deliberate.
- One function taking a `GameState` and returning the new state plus the effects
  it produced. Its behaviour, per **D9** and **D10**:
  - Count the sites currently `charged`; the shortfall is
    `TARGET_CHARGED_SITES` minus that count. Do not take a count from the
    caller — the shortfall can exceed the number of nodes that ran out this ply
    if the board was short earlier.
  - Build the pool of `active` sites by walking `SITES` in order. Occupied sites
    are in the pool.
  - Draw one at a time with `drawIndex(state.randomSeed, pool.length)`, charging
    the drawn site with `enteredOnPly` set to the ply just played (**D3**:
    the site is charged _at the end of_ that ply and is charged for the nine
    plies after it), removing it from the pool and carrying the advanced seed
    into the next draw.
  - Stop when the shortfall is met **or the pool is empty**. An empty pool is a
    legal outcome, not an error: return what has been done so far and leave the
    seed where it is. `drawIndex` throws on a count of zero, so this check must
    come first.
- No safety net, no cooldown fallback, no exception path for a board that cannot
  reach five.

### `src/rules/endOfTurn.ts`

Insert the draw as step 4 of the sequence, **between** the run-out step and the
cooling step, and add `SiteChargedEffect` to the `EndOfTurnEffect` union.
Replace the placeholder comment left by step 3 with the real thing: a note that
the cooling step is last deliberately, in the words of **D11**, because that is
what makes a site spend a whole turn active before it can be charged.

### `src/board/announcements.ts`

Add the `site-charged` clause per **D12** — recommended wording
`A new node charged at ${square}.` — and leave `site-went-active` silent. The
doc comment above `endOfTurnClauses` should state both judgements and why they
differ.

### Tests

In a new `src/rules/chargeDraw.test.ts` and in `src/rules/endOfTurn.test.ts`:

1. **The shortfall.** With four charged sites the draw charges one; with two, it
   charges three; with five, it charges nothing and the seed does not move.
2. **Without replacement.** When several are charged in one ply, they are
   distinct sites and the seed advances once per site charged.
3. **Determinism.** The same state and seed produce the same drawn sites every
   time; a different seed produces a different set (over a handful of seeds).
4. **The pool.** Only `active` sites are ever drawn; a `dormant` site is never
   drawn; an **occupied** active site is drawn like any other, and the ship
   standing on it is then on a charged node and no longer owes an action under
   §8.5.
5. **Running short.** From a state in which every site is charged or dormant,
   the sequence charges nothing, throws nothing, leaves the board below five and
   leaves the seed untouched; and when active sites become available again the
   board climbs back to five, charging more than one site in a ply if it must.
6. **Nothing to do.** At the end of a turn in which nothing ran out and the
   board is at five, nothing is charged.
7. **Replacement in the same turn.** A charged node that runs out is replaced in
   the same end-of-turn sequence, so the board is back at five before the
   opponent moves.
8. **The ordering — this step's headline check, and its own named test.** A site
   that finishes cooling at the end of ply N goes active in that sequence and is
   **not** charged in it, even when the board is short and the draw ran in the
   same sequence; it is active for the whole of ply N+1 and is first eligible in
   ply N+1's draw. Construct this deliberately: a state at ply N with a dormant
   site whose cooldown ends at N, a board one node short, and no other active
   site — so a wrongly ordered sequence would charge that very site and the test
   would fail loudly rather than incidentally.

Depends on: Step 3 (`SiteState`'s three members, `TARGET_CHARGED_SITES`, and the
end-of-turn sequence with cooling already in last place, so this step only
inserts).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass, with checks 1–8 green. Check 8 is the one that
must not be quietly dropped or weakened: it is the only thing pinning **D11**,
and the story's whole "a site must spend a turn active" property rests on it.

---

## Step 5 — The long-run economy, and replay

Status: pending

With the cycle complete, add the integration-level tests the story asks for and
restore what step 2 suspended.

### `src/rules/sitePool.test.ts` (rewritten, **D17**)

The premise is no longer "the pool never runs dry" but "the draw is never
forced". Drive `runEndOfTurn` from `startingGameState` for a few hundred plies
over a handful of seeds, with no ship activity (the economy no longer depends on
players), and assert:

- The board is at five charged at the end of every ply from the first onwards —
  under 0.11 nothing a player does can make it fall short, so in ordinary play
  it never does.
- The number of **active** sites never falls below a floor of two, which is the
  margin Appendix B says keeps the draw genuinely random. Appendix B's own
  arithmetic predicts about seven.
- Roughly five sites are dormant and roughly seven active in the steady state,
  asserted as loose bounds rather than exact figures.
- **No lockstep**: at most one node runs out in any single ply, for the whole
  run. The staggered opening gives five distinct expiry plies and each
  replacement inherits its predecessor's ply, so this holds forever — and it is
  the property that would silently break if the stagger were ever removed.

### `src/rules/seededReplay.test.ts` (extended)

The file already proves that the same opening seed and the same sequence of
actions produce the same game, fights and bay draws included. Extend it to the
charge draw: record the sequence of `site-charged` squares across a whole game
and assert two replays from the same seed produce identical sequences, and that
a different seed produces a different one. This is the property the seeded
generator exists for, now that the board's own draws are the main consumer of
the stream.

### `src/rules/fullGame.test.ts` (restored)

Put back the two "the policy should actually score" assertions removed in step 2
(**D18**), and confirm the hundred-round game still runs to completion with
consistent totals.

Depends on: Step 4 (the board must sustain itself before any of this can be
asserted).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass. The rewritten `sitePool.test.ts` and the
extended `seededReplay.test.ts` are green, and `fullGame.test.ts` scores again.

---

## Step 6 — `README.md`, `CLAUDE.md`, and a sweep for stale citations

Status: pending

`README.md` describes the old cycle directly and is wrong in at least three
places after this story:

- The intro paragraph: "Each one runs down after a few turns and goes dark, and
  another wakes somewhere else on the board".
- The status blockquote: "the seventeen sites marked, five of them already nodes
  in play" — they are now five charged nodes out of seventeen sites.
- The status blockquote: "A node wakes the moment a ship touches it, landing on
  it or flying over it" — deleted outright and replaced with the new cycle:
  nodes light up on their own at the end of a turn, the board keeps five lit,
  and a node you cannot yet stand on is one that has not charged.

Rewrite those for a non-technical player (`CLAUDE.md`, "Intended audience") and
then run `/update-readme` for the rest of the branch diff.

`CLAUDE.md`'s **Hub** vocabulary entry defines a hub as "a site that is
currently in play". Under 0.11 that means precisely "a site that is charged";
say so, keeping the rest of the entry (the code/player word split and the
search-tree rationale) as it is.

Finally, sweep the repository for stale rules citations left by **D2**: grep
`src/` for `§8.7`, `§8.2` and `section 8.7` and confirm every remaining
citation points at the right section under the new numbering. `§8.2` should now
appear only where the charge draw is meant, and `§8.7` should not appear at all.

Depends on: Step 5 (the branch diff `/update-readme` reviews should be the whole
story).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass, and the grep sweep returns nothing pointing at
a section that no longer exists. Then read the changed `README.md` paragraphs
end to end and confirm they describe the game as it now plays, in a player's
words, with no mention of waking on touch.

---

## Step 7 — Owner play-through

Status: pending

The story's eyeball checks, gathered into one pass. The owner runs `npm run dev`
in the dev container, opens the app and confirms:

1. **The opening board.** Five nodes are lit — H8, E5, K5, E11 and K11 — drawn
   with the wide gold artwork; the other twelve sites are small gold discs; no
   site is grey.
2. **The stagger is visible.** K5's glow already looks close to the end of its
   cycle and H8's looks fresh, because their clocks are staggered.
3. **Ships change nothing.** Moving a ship onto or over one of the small gold
   discs leaves it exactly as it was — no node appears, and nothing is announced
   about charging.
4. **The clock runs on its own.** At the end of turn 2, K5 goes grey and a new
   node lights somewhere else in that same turn, announced in the live region;
   the same happens at the ends of turns 4, 5, 7 and 9 — one at a time, never
   several together.
5. **Cooling returns.** Nine turns after a site goes grey it becomes a small
   gold disc again, and the grey artwork's glow visibly travels while it cools.
6. **The two refusals read differently.** Trying to end a move on a small gold
   disc says nothing has charged there yet; trying to end a move on a grey site
   says it has run out and is cooling down.
7. **Everything else still works.** Standing on a lit node still pays energy and
   shields at the end of your turn, the score and node pips still update, a ship
   left on a node that runs out is still told to move clear, and a fight still
   resolves normally.

Depends on: Step 6 (the whole story is in place, including the README the owner
reads alongside the app).

Verification (manual): the owner performs the seven checks above and confirms
them. This is a pipeline gate — the story is not finished until the owner has
said so.
