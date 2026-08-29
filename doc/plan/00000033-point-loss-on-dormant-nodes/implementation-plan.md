# Implementation plan — 00000033 Dormant sites cost energy and shields

## What this story is

Standing on a **dormant** site stops being free. From this story, at the end of
every one of their own turns, a player pays for each of their ships parked on a
site that has burned out:

- **Energy.** The dormant sites that player's ships are standing on are counted
  and priced off the **same rising table** that pays for charged nodes —
  0, 1, 3, 6, 10, 15. The player's total goes **up** for the charged nodes they
  hold and then **down** for the dormant sites they sit on. It is **not** a net
  count: three charged nodes and two dormant sites pay 6 and cost 3, for +3 —
  not the +1 a net "one node" would have paid.
- **A shield.** Each of that player's ships standing on a dormant site loses one
  shield, the mirror of the shield a ship on a charged node gains. It cannot go
  below 0.

A score never falls below zero: where a turn's penalty is larger than the energy
the player has, their total lands on 0.

Nothing else about dormancy changes. A ship may still stand on a dormant site
for as long as its owner likes (§8.5), the site still recovers on schedule
underneath it, and the ship is under no obligation to move. It is now simply a
bad place to be.

**Why.** Story 31 (rules 0.13) let a ship stop anywhere and deleted the
"stranded" obligation, which left camping on a spent site costing nothing at
all. Story 31 named that as an open play-testing question. This is the answer:
camping on an **active** site waiting for the charge draw stays free and is
still a real tactic; camping on a **dormant** one is punished, so a ship whose
node burns out under it now has a reason to leave.

This is a **gameplay change**, so `doc/ruleset/rules.md` goes from version
**0.13** to **0.14**, with a `doc/ruleset/changelog.md` entry and a matching
`RULES_VERSION` bump, in its own commit ahead of any code (step 1). Tagging
stays on hold, per `CLAUDE.md` — no step tags anything.

### Vocabulary reminder for a cold reader (`CLAUDE.md`)

Planning documents and code say **ply**; `rules.md`, the UI and `README.md` say
**turn**. They are the same thing: everything one player does before play
passes, which in this game is one action (`ACTIONS_PER_PLY` is 1). **Site**,
**bay** and **action** are the same word everywhere. **Hub** is the code word
for what player-facing text calls a **node**, and a node is precisely a site
that is charged — but note that `src/rules/energy.ts` already says "node" in its
own function names, and this story follows the names that are already there
rather than renaming anything. A **site** is one of the seventeen fixed
positions; its state is `active`, `charged` or `dormant`.

Throughout this plan, "the penalty" means the energy cost, and "the shield loss"
means the shield cost. "Settlement" means the pair of them at step 2 of the
end-of-turn sequence.

### Settled decisions that are not to be re-opened

Decided by the repository owner before planning began:

1. **The rules edit goes first, in its own commit, ahead of any code** — 0.13 →
   0.14, changelog entry, `RULES_VERSION` bump. No tagging.
2. **The penalty count is capped at five**, so the one table
   `ENERGY_BY_NODES_HELD` is read in both directions and no second table exists.
3. **Only dormant sites cost anything.** An active site pays nothing and costs
   nothing; camping on one to wait for the draw stays free.
4. **Each player pays on their own turn only**, exactly as they collect on their
   own turn only. The opponent's ships on dormant sites cost nothing at the end
   of the moving player's turn.

---

## Where the work lands

| File                          | What happens to it                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `doc/ruleset/rules.md`        | §1, §4.1, §8.1, §8.4, §8.5, §8.6 edited; 0.13 → 0.14 (step 1)                        |
| `doc/ruleset/changelog.md`    | New 0.14 entry at the top (step 1)                                                   |
| `src/rules/rulesVersion.ts`   | `RULES_VERSION` → `"0.14"` (step 1)                                                  |
| `src/rules/energy.ts`         | Gains §8.4's dormant half: the sites occupied and their price (step 2)               |
| `src/rules/endOfTurn.ts`      | Step 1 loses shields (step 3); step 2 pays the penalty (step 4)                      |
| `src/board/announcements.ts`  | A shield-loss clause (step 3); a penalty sentence (step 4); `scoreSentence` (step 7) |
| `src/board/EnergyOverlay.tsx` | Draws a "−N" and pulses for the penalty (step 6)                                     |
| `src/board/EnergyOverlay.css` | A loss variant of the existing float and pulse (step 6)                              |
| `src/hud/ScoreDisplay.tsx`    | A second, separate pip row for dormant sites occupied (step 7)                       |
| `src/hud/ScoreDisplay.css`    | The dormant row's own styling (step 7)                                               |
| `README.md`                   | Dead sites are dangerous ground (step 8)                                             |

Tests touched, and by which step:

| Test file                          | Step(s) | Why                                                                      |
| ---------------------------------- | ------- | ------------------------------------------------------------------------ |
| `src/rules/energy.test.ts`         | 2       | The two new functions, including the clamp at five                       |
| `src/rules/endOfTurn.test.ts`      | 3, 4    | Step 1's shield loss; step 2's penalty, its ordering and its floor       |
| `src/board/announcements.test.ts`  | 3, 4, 7 | The shield-loss clause, the penalty sentence, `scoreSentence`            |
| `src/rules/fullGame.test.ts`       | 4       | Its energy ledger must account for penalties as well as collections      |
| `src/rules/camping.test.ts`        | 5       | The integration cover for a ship that stays put — where the cost belongs |
| `src/board/EnergyOverlay.test.tsx` | 6       | The "−N" and its pulses                                                  |
| `src/hud/ScoreDisplay.test.tsx`    | 7       | The second pip row                                                       |
| `src/hud/Hud.test.tsx`             | 7       | Only if the new row disturbs an existing assertion                       |
| `src/rules/ply.test.ts`            | 4, 5    | Only if an existing expectation now also sees a penalty effect           |

Deliberately **not** touched:

- **`src/rules/shields.ts`.** `ShieldCount`, `MIN_SHIELDS` and `MAX_SHIELDS`
  already say everything the loss needs; no new constant belongs there.
- **`src/rules/chargeDraw.ts`, `src/rules/sites.ts`, `src/rules/vacating.ts`,
  `src/rules/combat.ts`, `src/rules/movement.ts`, `src/rules/bays.ts`,
  `src/rules/gameLength.ts`.** No drain, recovery, pressure, capacity, range,
  bay, charged-node energy or game-length number moves. §8.7 is untouched.
- **`src/rules/seededReplay.test.ts`.** This story draws no randomness and
  removes none, so the seed stream must not move. See **D11**.
- **Site and ship artwork** — `SiteMarker.tsx`, `ShipIcon.tsx`,
  `BoardSquare.tsx` and their CSS. A dormant site already looks dormant and a
  ship already shows its shields. Nothing is redrawn to mark that a ship is
  paying.
- **The rest of the HUD** — `RoundCounter`, `TurnIndicator`, `GameOverPanel`,
  `useCountUp`, `countUp.ts`, `useDisplayedEnergy`. The count-up arithmetic
  already handles a falling target (`countUpValue` returns `to` when it is below
  `from`; `useCountUp` does not animate a fall), so a score that drops needs no
  animation work at all.
- **`CLAUDE.md`.** No vocabulary changes.
- **This story's own `story.md`.** `npm run format:check` reports a
  pre-existing warning on it, exactly as it did for story 31's story file.
  It is unrelated to any step's change and is not this story's to fix — do
  not chase it, and do not let it be mistaken for a failure a step caused.

---

## Design decisions and reasoning

This section is the design record for the story. The code in this repository
does not carry design history (`CONTRIBUTING.md`, "Comments"), so anything a
future reader needs to know about **why** is written here and nowhere else.

### D1 — The rules change lands first, and the code is knowingly behind it for three commits

`CLAUDE.md` and `doc/guidelines/implementation-plan-guide.md` both require it:
`rules.md` is the single source of truth and the code implements it, so the
document is edited, the version bumped and the changelog written before any
behaviour changes. Stories 27, 29 and 31 all did this and it is the house
pattern.

Between step 1 and step 4 the code is knowingly behind the document. The windows
are deliberate; no step should try to paper over the one it sits in:

| After step | The app behaves like this                                                                |
| ---------- | ---------------------------------------------------------------------------------------- |
| 1          | 0.13 in full: a dormant site costs nothing at all                                        |
| 2          | Still 0.13's behaviour; the price of dormancy is computable but nothing calls it         |
| 3          | A ship on a dormant site loses a shield each turn, but the energy penalty is not applied |
| 4          | 0.14 in full, in the rules layer                                                         |
| 5          | 0.14 in full, with the consequences pinned end to end                                    |
| 6, 7       | 0.14 in full, and the player can see what they are paying                                |

### D2 — One table, two functions, and only one of them throws

`ENERGY_BY_NODES_HELD` (`0, 1, 3, 6, 10, 15`) stays a single table and prices
both directions. The reason it can is arithmetic that is worth stating plainly,
because it is the crux of the design:

- The **charged** count cannot exceed five, because the board never charges more
  than five sites at once (§8.1, §8.2). That is why `energyForNodesHeld` treats
  6 as a caller bug and throws a `RangeError`. **That check stays exactly as it
  is.**
- The **dormant** count has no such ceiling: up to twelve sites can be dormant
  at once (seventeen sites, at most five charged), and a side has seven ships.
  Six or seven dormant sites under one side's ships is an ordinary state of the
  game, not a bug. So the penalty function must **not** copy the throw — it
  **clamps** its count to five and prices that. Six and seven dormant sites cost
  the same 15 that five do.

The cap is a deliberate design choice, not an arithmetic accident: the most a
turn can pay is 15, and now the most a turn can cost is 15, so neither side of
§8.4 can outrun the other.

The penalty function still range-checks, but only to catch a genuinely
impossible count: a negative number, a fraction, or a count above the number of
ships a side has (seven). Derive that bound from `STARTING_FLEET` rather than
writing `7` as a literal, so it cannot drift if a later story changes the fleet
size.

**Rejected:** a second table for the penalty. The story is explicit that the two
prices are the same price, and two tables would be two things to keep in step
for no gain.

**Rejected:** clamping inside `energyForNodesHeld` so one function serves both.
That would delete a real invariant — a sixth charged node genuinely is a bug and
the throw is how the code says so — in order to save a five-line function.

### D3 — Two effects, not one settlement effect

The story leaves this to the plan. The end-of-turn sequence raises **two
separate** effects where it needs to report both directions:

- `EnergyCollectedEffect` (`type: "energy-collected"`), unchanged in every
  respect — same fields, same meaning, same consumers.
- a new energy-penalty effect beside it (`type: "energy-penalty"` is the name
  this plan uses; keep it unless something in the code already claims it), with
  the same shape: the paying `side`, the `amount`, the `newTotal` after paying,
  and the `squares` that caused it.

Likewise for shields: `ShieldGainedEffect` is untouched and a new shield-loss
effect (`type: "shield-lost"`) joins it, carrying the same fields — `shipId`,
`side`, `square`, and `shields` as the count **after** the loss.

Both new effects join the `EndOfTurnEffect` union.

Why two rather than one signed "settlement" effect:

- Every existing consumer of `EnergyCollectedEffect` — `announcements.ts`,
  `EnergyOverlay.tsx`, `fullGame.test.ts` — keeps working on collections
  unchanged, so the diff is additive rather than a rewrite of the paying path.
- A signed amount invites sign bugs in exactly the places that matter: the
  overlay's `+N`/`−N`, the announcement's wording, and the running total.
- The two halves have genuinely different squares (charged nodes versus dormant
  sites), so a single effect would have had to carry two square lists anyway.
- The story requires that the two be "distinguishable to the board". A distinct
  `type` is the cheapest possible way to be distinguishable, and it matches how
  every other end-of-turn event in this module is modelled.

**Rejected:** one `energy-settled` effect carrying both directions. It buys
nothing and costs every existing consumer a rewrite.

The **order** is fixed and is part of the rule: within one end-of-turn sequence
the collection effect is pushed **before** the penalty effect, because §8.4
collects and then pays. Every consumer that iterates effects in order — the
announcement clauses especially — inherits the right order from that and must
not re-sort.

Note that `endOfTurnClauses` in `announcements.ts` switches on `effect.type`
without an exhaustiveness assertion, and `EnergyOverlay` filters by type, so
adding a union member will **not** produce a compile error at those sites. The
steps below name explicitly where each new member must be handled; do not rely
on the typechecker to find them.

### D4 — The floor reports what was actually deducted, and a zero deduction raises no effect

A player's total never goes below zero (§8.4). So the amount deducted is the
lesser of the table price and the energy the player has, and **the amount the
effect reports is the amount actually deducted** — not the table price. A player
told they lost 6 while their score fell by 2 has been told something false, and
the announcement, the overlay and the HUD all read that number.

It follows that the effect's `newTotal` is never negative, and that
`newTotal === previousTotal − amount` always holds exactly.

**A deduction of zero raises no effect at all**, matching the existing
convention that a zero collection raises no `energy-collected` effect and a ship
at the shield cap raises no `shield-gained` effect. There are two ways to reach
zero and both are silent:

- the side stands on no dormant site, so the table price is 0; and
- the side stands on dormant sites but already has 0 energy, so nothing can be
  taken.

The second case means a player on 0 energy sitting on dormant sites hears and
sees nothing about the energy penalty that turn. That is the correct reading:
nothing happened to their score. Their ships still lose shields, and that still
speaks. **The owner confirmed this at the plan gate**: silence is wanted, and
no "no energy left to lose" sentence is to be added.

**Rejected:** raising an effect reporting the table price with a smaller actual
change. The story forbids it in as many words.

**Rejected:** raising a zero-amount effect so the player learns they "would
have" paid. It would draw a "−0" on the board and put a sentence in the live
region for a turn in which nothing changed.

### D5 — The shield loss shares step 1's single pass over the ships

§8.6 step 1 becomes: each of the moving player's ships on a charged node gains a
shield, and each on a dormant site loses one. No step is added and no step
moves; steps 3 to 6 are untouched, and §8.6's tail — the reasoning about the
drain, charge and recovery clocks — is unaffected.

In `endOfTurn.ts` this is the existing single `state.ships.map(...)` pass,
extended: for a ship of the moving side, look at the site state under it once
and branch — `charged` grants (unless already at `MAX_SHIELDS`), `dormant` takes
(unless already at `MIN_SHIELDS`), anything else (an active site, a bay, an
ordinary square) does neither. One pass, so the effects come out in fleet order
with gains and losses interleaved exactly as the ships are ordered; the
announcement groups them afterwards.

**A ship already on 0 shields raises no effect**, mirroring the existing rule
that a ship already at the cap of 4 raises no `shield-gained` effect.

The **timing** matters and must not be got wrong. Step 1 reads the site states
as they are _before_ step 3's drain, so:

- a node that reaches capacity in step 3 of turn N still **paid and still
  granted its shield** in steps 1 and 2 of that same turn — there is an existing
  test pinning this for the collection, and the behaviour is unchanged; and
- the ship left standing on it first **loses** a shield and first **pays** at
  the end of its owner's **next** turn.

That is exactly the story's "starts paying from the end of its owner's next
turn".

### D6 — Wording: two grouped shield clauses, then collection, then penalty

`announcements.ts` gains one clause per new effect, each shaped like the clause
it sits beside:

- **Shield losses** are grouped into a single clause exactly as the gains
  already are — one ship names itself and its new count, several name their
  squares and the fact that each lost one. Where the gain clause calls out the
  ships that reached the cap of 4, the loss clause calls out the ships that
  reached 0.
- **The penalty** is one sentence naming the squares, the amount and the
  resulting total, mirroring `energyCollectedClause`: one site names itself,
  several name their count and squares. There is at most one of these per
  sequence, for the same reason there is at most one collection — §8.4 charges
  once for a count of sites, never once per site.

Clause order within an end-of-turn sequence is: **shield gains, shield losses,
then the effects in the order the sequence produced them** — which puts the
collection before the penalty (D3). A turn that both collects and pays therefore
reads as two sentences in that order, which is the rule read aloud.

Shield gains are grouped ahead of losses (rather than interleaved in ship order)
because the existing code already lifts gains out of the loop and groups them,
and because "gained ... lost" reads as the mirror pair §4.1 now describes.

### D7 — The overlay reuses its own mechanism, with a loss variant

`EnergyOverlay.tsx` already draws a collection as a pulse ring on each paying
square plus a "+N" at their centroid, in the collecting side's colour, entirely
as a function of the session's last event. The penalty is drawn the same way: a
pulse on each dormant square that cost something, and a "−N" at their centroid,
in the paying side's colour. No new component, no new animation design.

Three details the implementer must get right:

- **It must find penalties everywhere it already finds collections.** The
  existing `collectionsForEvent` reads a top-level `ply-passed` event's own
  `endOfTurn` effects _and_, for a `moved`/`attacked` event, both the
  `ply-ended` effect's and a nested `ply-passed` effect's — because an action
  that ends a ply can be immediately followed by the other side's pass. The
  penalty must be gathered from all of the same places.
- **React keys must not collide.** The existing key is
  `` `${side}-${plyNumber}` ``. With two settlement kinds for the same side in
  the same ply, the key must include the kind as well.
- **A loss must not read as a gain.** The minus sign carries most of it, but the
  motion should differ too: the gain floats upwards and fades; the loss should
  sink downwards and fade, and its pulse should contract rather than expand.
  Both are small additions to `EnergyOverlay.css` reusing the existing
  keyframes' shape, and both must have a `prefers-reduced-motion` fallback
  alongside the ones already there — the existing reduced-motion block replaces
  the travel with a plain fade, and the new variants need the same treatment so
  no state is carried by motion alone.

The overlay stays `aria-hidden`. The penalty reaches assistive technology
through the live region's sentence (D6) and the HUD's hidden score sentence
(D9), so nothing here is the only channel for anything.

### D8 — The HUD gets a second, separate pip row, with its own class names

`ScoreDisplay` keeps its existing five-pip row counting the charged nodes that
side holds, **unchanged**. Beneath it sits a **separate** row of five counting
the dormant sites that side's ships are standing on. The two rows are never
merged and never netted, for the same reason the two halves of §8.4 are
separate: a player needs to read what they are earning and what they are paying
as two numbers.

Five pips again, because the penalty counts at most five (D2). A side standing
on six or seven dormant sites lights all five, which is the truth about what
they are paying.

**The new row must use its own base class name**, not the existing
`score-display__pip`. This is not cosmetic: `ScoreDisplay.test.tsx` counts
`.score-display__pip` and asserts there are exactly five, and
`.score-display__pip--lit` to count nodes held. Reusing the base class would
break those assertions for no reason and would blur the two rows together in
every future query. Use a distinct pair (for example
`score-display__dormant-pip` and a `--on` modifier, inside a
`score-display__dormant-pips` container).

**How the pips are drawn — decided by the owner at the plan gate, not open.**
Every pip in **both** rows carries a **border in the side's colour**
(`--color-green` / `--color-red`), and its **inside is the colour of the kind of
site it counts**: **gold** for a charged node, **grey** for a dormant site. The
border says whose it is; the fill says what it is. A pip that is not "on" has no
fill — the cell's own background shows through — so a row reads as a count of
filled pips inside a fixed frame of five.

This is a change to the **existing** node row as well: today a lit node pip is
filled with the side's colour and glows (`--color-green` / `--color-red` plus a
`box-shadow`), and an unlit one is `--color-space-raised` with a
`--color-text-dim` border. After this step a lit node pip is **gold inside a
green or red border**, and a dormant pip is **grey inside the same border**.
Record that restyle in the step's Notes; it is a deliberate change, not a
regression.

The two fill colours are the board's own, so the HUD and the artwork agree at a
glance:

| Fill | Colour    | Where it comes from                             |
| ---- | --------- | ----------------------------------------------- |
| Gold | `#DAA520` | `SiteMarker.tsx`'s charged gradient (goldenrod) |
| Grey | `#808080` | `SiteMarker.tsx`'s dormant gradient             |

Add both as tokens in `src/index.css` beside the existing `--color-green` and
`--color-red` — `--color-node-charged` and `--color-node-dormant` are the names
this plan uses — with a comment naming `SiteMarker.tsx` as where the values come
from. **Do not refactor `SiteMarker.tsx` to read them**: its gradient stops are
computed per render in TypeScript, and rewriting that is outside this story's
scope. The small duplication is deliberate, and the comment is what keeps it
honest.

Two constraints survive from the original guidance:

- A side standing on nothing dormant must not have a row that **draws the eye**.
  With no fill on an "off" pip that mostly follows on its own, but if the empty
  dormant row still reads as a second scoreboard, quieten its border rather than
  giving it a fill.
- Do not use `--focus-ring` (the amber `#ffb703`) anywhere in either row. That
  token means keyboard focus everywhere else in the app and must not start
  meaning two things. The charged pip's gold `#DAA520` is a different colour
  serving a different purpose, and the two must stay visually distinct — check
  them side by side.

### D9 — `scoreSentence` names both counts, always

`scoreSentence` currently reads "Green: 24 energy, 3 nodes held." It gains the
dormant count, because both pip rows are `aria-hidden` and this sentence is the
only channel for them.

The dormant count is named **even when it is zero**, so the sentence keeps one
shape and a listener can hear "standing on no dormant sites" as the good news it
is. The existing "no nodes held" wording already sets that precedent for a zero
count.

**Rejected:** omitting the clause when the count is zero. It would make the two
counts read asymmetrically and would hide the "you are paying nothing" state
from the only channel that reports it.

### D10 — `fullGame.test.ts`'s ledger identity survives, and must be extended to keep it honest

`fullGame.test.ts` asserts that each side's final total equals the sum of the
`energy-collected` amounts it saw. Once penalties exist that assertion is false,
and it must be extended rather than deleted: the final total equals the sum of
the collections **minus** the sum of the penalties.

That identity is exact — not approximate — precisely because of D4: the penalty
effect reports the energy actually deducted, so a floored turn still balances
the ledger. If this assertion fails after step 4, the most likely cause is a
penalty effect reporting a table price rather than an actual deduction. Read it
as a signal.

Two other assertions in that file are worth watching but must not be "fixed"
blindly:

- `expect(finalState.energy.green).toBeGreaterThan(0)` for both sides. The
  greedy policy in that test moves a ship every ply and heads for charged or
  active sites, so it should still finish well above zero; but it does leave
  ships on sites that burn out under them, and they now cost. If a side finishes
  on 0, report it rather than lowering the bar — it is a real statement about how
  harsh the penalty is.
- The game-length and refusal assertions are structural and should be unaffected.

### D11 — No randomness moves, so the seeded stream must not move

This story draws no new randomness and removes none. The drain draws, the charge
draw and the recovery draws are untouched, and neither the shield loss nor the
energy penalty consumes a seed step. The number of seed steps a ply consumes is
therefore unchanged.

`seededReplay.test.ts` compares a game against itself rather than against
recorded numbers, so it must pass **unchanged**. If a recorded expectation there
moves, that is a signal that something consumed the seed that should not have —
read it, do not update the number.

### D12 — Accessibility: nothing is expected in the ledger

Per `CLAUDE.md`, pre-release stories do not spend work keeping accessibility
intact, and **no plan step tests accessibility**. Existing automated tests are
updated where the path is straightforward — the axe checks already in
`ScoreDisplay.test.tsx`, `Hud.test.tsx` and `EnergyOverlay.test.tsx` should
simply keep passing, since the new markup is decorative and `aria-hidden` like
the markup beside it.

Nothing is expected for
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`: everything this
story adds visually is mirrored in text (the live region's sentences and the
hidden score sentence). If an implementer finds that a step does cost an
accessible behaviour, record it there as a new section for story 33 and say so
in that step's Notes.

### D13 — What this story deliberately does not do

Out of scope, and no step should drift into any of it: any penalty on an
**active** site; charging the non-moving player; any other cost of dormancy (no
forced move, no obligation, no restriction on ending a move on a dormant site —
§8.5's permission stands); retuning drain, recovery, pressure, capacity, the
charged-node table or game length; any other new HUD element; site or ship
artwork; and §8.7, combat, movement, bays and the charge draw.

---

## Step 1 — Rules 0.14: a dormant site costs energy and a shield

Status: committed

Notes: Edited `rules.md` (§1, §4.1, §8.1, §8.4, §8.5, §8.6) and added the 0.14
changelog entry as specified, bumped `RULES_VERSION` to `"0.14"`, and ran
`prettier --write` on `rules.md` afterwards to satisfy `format:check` (pure
rewrapping of the paragraphs touched; no wording changed). No code under
`src/` other than `rulesVersion.ts` was touched. `git status` shows exactly
the three expected files changed. The orchestrator then made two wording
fixes on top before committing: §4.1's new sentence was rewrapped to the
document's width (Prettier's `proseWrap` is `preserve`, so it does not do
this), and §8.4's table header went from "Charged nodes held" to "Sites
counted", since the table now prices dormant sites too and a dormant site
is stood on rather than held.

Edit `doc/ruleset/rules.md`, add a `doc/ruleset/changelog.md` entry, and bump
`RULES_VERSION` in `src/rules/rulesVersion.ts` to `"0.14"`. **No behaviour
changes in this step** — no file under `src/` other than `rulesVersion.ts` is
touched. See **D1** for why this is its own commit and how far behind the
document the code then runs.

Read the whole of `rules.md` before editing: several of its sections
cross-reference each other, and this change touches five of them plus the
overview.

**No section is renumbered.** §8.4 keeps its number and its title; §8.5 and §8.6
keep theirs. Renumbering would invalidate every `§8.x` citation in the document
and in the rule comments across `src/`, a price stories 27 and 29 already
refused to pay twice.

### The version line

`**Rules version: 0.13**` becomes `**Rules version: 0.14**`.

### §1 Overview

Add **one sentence**, near the existing paragraph about shields being gained by
sitting on a node: a site that has burned out is a bad place to leave a ship —
it costs its owner energy and a shield every turn. Keep the section's voice:
short, plain, no section references.

### §4.1 Shields

Alongside the existing "A ship gains **one shield** at the end of its owner's
turn if it is standing on a node, up to the maximum of 4", state the loss: a
ship **loses one shield** at the end of its owner's turn if it is standing on a
**dormant** site, down to the minimum of 0. An **active** site does neither.

The section's existing point — that shields and speed pull against each other —
is unchanged. What is added is that a spent site actively erodes a ship's
strength while it sits there. Keep the sentence that a ship reduced to 0 shields
is not destroyed.

### §8.1 The three states of a site

Two of the three bullets change; the cycle, the board's aim of five charged, the
opening position and the paragraph about the five spreading apart are all
unchanged.

- **Active** — eligible to be charged, producing nothing, and **costing
  nothing**.
- **Charged** — unchanged.
- **Dormant** — recovering after running out, not eligible to be charged,
  producing nothing, and **costing the player whose ship stands on it**: energy
  (section 8.4) and a shield (section 4.1), at the end of each of that player's
  turns.

### §8.4 Energy

The section keeps its number, its title and its existing table, and gains the
other half. It must end up saying all of this:

- The **collection** is unchanged: at the end of each player's turn that player
  collects for the charged nodes they are standing on, priced 0 → 0, 1 → 1,
  2 → 3, 3 → 6, 4 → 10, 5 → 15.
- The **penalty**: the dormant sites that player's ships are standing on are
  counted and priced off **that same table**. Unlike charged nodes there is no
  limit on how many sites are dormant at once, so the count is **capped at
  five** — six or seven dormant sites cost the same 15 that five do. Say why:
  the most a turn can cost is then exactly the most it can pay.
- The two are applied in that order and are **not netted**. Say plainly why it
  matters, with the worked example: three charged nodes and two dormant sites
  pay 6 and cost 3, for +3 — not the +1 that a net count of one node would have
  paid. Holding nodes and sitting on dead ones are separately priced, and both
  are priced steeply.
- **A score never goes below zero.** If the penalty is larger than the energy
  the player has, their total is 0.
- The existing "standing on at that moment" rule governs **both** halves: a site
  counts only if one of that player's ships is on it when the count is taken, so
  flying across a dormant site costs nothing, exactly as flying across a node
  pays nothing. Reword the existing sentence so it plainly covers both rather
  than leaving the reader to infer it.

Present the table once. Do not add a second table.

### §8.5 Standing on a site that is not charged

The paragraph "It pays nothing: no energy (section 8.4) and no shields (section
4.1) while the site is not charged." is replaced by the two cases, which are now
different:

- An **active** site pays nothing and costs nothing, so waiting on one for the
  charge draw is free.
- A **dormant** site pays nothing and **costs**: an energy penalty (section 8.4)
  and a shield (section 4.1) at the end of each of the owner's turns.

Keep the section's main point, and keep it prominent: none of this obliges
anyone to move. A ship may sit on a dormant site all game if its owner is
willing to pay for it. Keep the paragraph about the site's own cycle carrying on
underneath the ship.

The final paragraph, about a node falling quiet under its holder, should say
what now follows: the node stops paying and **starts costing** — the holder pays
from the end of its owner's next turn unless it leaves. (The "next turn" timing
is a consequence of §8.6's order; see **D5**. Do not write "from that moment".)

### §8.6 End-of-turn order

Steps 1 and 2 take the new work. **No step is added, no step moves**, and steps
3 to 6 are untouched — so is the whole of §8.6's tail, whose reasoning is about
the drain, charge and recovery clocks and is unaffected.

1. Each of the moving player's ships standing on a charged node gains a shield,
   and each standing on a dormant site loses one (section 4.1).
2. The moving player collects for the charged nodes they hold and then pays for
   the dormant sites they occupy (section 8.4).

The paragraph about a passed turn still running the sequence in full stays, and
should now read as covering both directions — a passing player still pays as
well as still collecting.

### Everything else

§2, §3, §5, §6, §7, §8.2, §8.3, §8.7, §9 and both appendices are unchanged.

### The changelog

Add a `## 0.14 — …` entry at the top of `doc/ruleset/changelog.md`, in the shape
the existing entries use: a short title, then bullets for the substantive
changes — the shield loss in §4.1, the energy penalty and its cap in §8.4, the
"not netted" statement and the floor at zero, §8.1's dormant state gaining a
cost, §8.5 no longer saying dormancy is free, and §8.6's steps 1 and 2. Do not
tag anything.

Verification (automated): `npm test` passes — `rulesVersion.test.ts` reads the
version line straight out of `rules.md` and also checks the changelog has an
entry for it, so a mismatch fails there. `npm run typecheck`, `npm run lint` and
`npm run format:check` pass. `git status` shows exactly `doc/ruleset/rules.md`,
`doc/ruleset/changelog.md` and `src/rules/rulesVersion.ts` changed, and nothing
else. A read of §8.4 confirms it states the cap at five, the worked example, the
floor at zero, and that the "standing on at that moment" rule governs both
halves.

---

## Step 2 — `energy.ts` carries both halves of §8.4

Status: committed

Notes: Added `dormantSitesOccupiedBy` (mirroring `chargedNodesHeldBy`) and
`energyForDormantSites` (reading the same `ENERGY_BY_NODES_HELD` table,
clamped to `MAX_DORMANT_SITES_PRICED` and range-checked only up to
`SHIPS_PER_SIDE`, derived from `STARTING_FLEET` rather than a literal 7).
`energyForNodesHeld` is untouched, including its `RangeError` above five.
Rewrote the module comment to describe both directions of §8.4. Extended
`energy.test.ts` with cases for the price table 0–5, the clamp at 6 and 7,
the three throw cases, and the mirrored occupancy cases. No behaviour
changes elsewhere; nothing calls the new functions yet. No deviations from
the plan.

Add the dormant half of §8.4 to `src/rules/energy.ts`. This step is a pure
addition: nothing calls the new functions yet, and no behaviour changes.

Depends on: Step 1 (the document these functions implement).

Add two things, named to read well beside the existing `energyForNodesHeld` and
`chargedNodesHeldBy`:

- **The sites a side is standing on that are dormant** — the mirror of
  `chargedNodesHeldBy`: the sites, in `SITES` order, whose square holds a ship of
  that side and whose state is `dormant`. Everything true of the existing
  function is true of this one: it reads the state at the moment asked, so a
  site a ship merely flew over is invisible to it, and the opponent's ships never
  count. `dormantSitesOccupiedBy` is the name this plan assumes; use it unless a
  better one is obvious in context.
- **The penalty for a count of dormant sites** — `energyForDormantSites` in this
  plan's naming. It reads the **same** `ENERGY_BY_NODES_HELD` table
  (`0, 1, 3, 6, 10, 15`); no second table is introduced.

The two functions' range behaviour differs deliberately, and this is the heart
of the step (**D2**):

- `energyForNodesHeld` keeps its name, its behaviour and its `RangeError`
  outside 0–5. Do not touch it. A sixth charged node is still a caller bug,
  because the board cannot produce one.
- The penalty function must **not** copy that check. Six or seven dormant sites
  under one side's ships is an ordinary state of the game, so the function
  **clamps** its count to five and prices that — six and seven both cost 15. It
  range-checks only what is genuinely impossible: a negative count, a
  non-integer, or a count above the number of ships a side has. Derive that upper
  bound from `STARTING_FLEET` (count the entries for one side) rather than
  writing `7` as a literal, so it cannot drift.

Give the clamp a named constant rather than a bare `5`, and give it a doc
comment saying why the cap exists: the most a turn can pay is 15, so the most it
can cost is 15 too.

The module comment currently reads "§8.4's payout table and what a side is
standing on." Rewrite it to describe what the module now is — §8.4 in both
directions: the table, what a side is standing on, and the price either way.
Keep its second sentence's disclaimer that nothing about the end-of-turn
sequence, effects or running totals lives here.

Verification (automated): extend `src/rules/energy.test.ts` and run `npm test`.
The new cases must include, at minimum: the price of 0 through 5 dormant sites
is 0, 1, 3, 6, 10, 15; **6 and 7 both price at 15 and neither throws**; a
negative, a fractional and an over-fleet-size count each throw a `RangeError`;
`energyForNodesHeld(6)` still throws (unchanged); and, for the occupancy
function, that it finds a ship of the asked side on a dormant site, ignores one
on an active or a charged site, ignores the opponent's ship on a dormant site,
returns the sites in `SITES` order for two ships, and returns nothing for a side
standing on no dormant site. `npm run typecheck` and `npm run lint` pass.

---

## Step 3 — A ship on a dormant site loses a shield (§8.6 step 1, §4.1)

Status: committed

Notes: Extended step 1's single `state.ships.map(...)` pass to branch on
`charged` (grants, unchanged) vs `dormant` (takes, floored at `MIN_SHIELDS`)
vs anything else (does neither), added `ShieldLostEffect` to the
`EndOfTurnEffect` union, and added `shieldLostClause`/grouping in
`announcements.ts` mirroring the gain clause, with the new type handled as a
no-op in `endOfTurnClauses`'s switch per D3's warning. Extended
`endOfTurn.test.ts` and `announcements.test.ts` with the cases the step
calls for. Deviation from the plan: fixing two pre-existing tests whose
expectations this step's behaviour change genuinely falsifies —
`camping.test.ts`'s "a node running out under a ship is quiet" (the camper
now loses its shield, 1 → 0, at the end of its owner's next turn once H8 is
dormant) and `ply.test.ts`'s "advances onto the loser's square when it is a
dormant site" (the winning ship immediately loses the shield it just won,
2 → 1 → 0, because it advances onto an already-dormant site in the same ply
that ends its turn). Both are documented consequences of §4.1/§8.6 step 1
(D5) rather than bugs, and were updated with an explanatory comment rather
than weakened. All four checks (`typecheck`, `lint`, `test`,
`format:check`) pass.

Extend `runEndOfTurn`'s step 1 in `src/rules/endOfTurn.ts` so that each of the
**moving side's** ships standing on a dormant site loses one shield, floored at
0, and raise a new effect for it. Add the matching announcement clause in the
same step.

Depends on: Step 1 (the rule). Independent of step 2 — this half of the story
needs no energy arithmetic.

**The rules layer.** Step 1 today is a single `state.ships.map(...)` pass that
grants a shield to a ship of the moving side standing on a `charged` site,
unless it is already at `MAX_SHIELDS`. Extend that same pass rather than adding
a second one (**D5**): for a ship of the moving side, read the site state under
it once and branch — `charged` grants, `dormant` takes, anything else (active
site, bay, plain square) does neither. Use `MIN_SHIELDS` from
`src/rules/shields.ts` for the floor.

**A ship already on 0 shields raises no effect and is left untouched**,
mirroring the existing convention for a ship already at the cap of 4.

Add a shield-loss effect to the module's exported effect types and to the
`EndOfTurnEffect` union, shaped like `ShieldGainedEffect` — `shipId`, `side`,
`square`, and `shields` as the count **after** the loss (**D3**). Give it the
same style of doc comment, citing §8.6 step 1 and §4.1.

Do not change the order of §8.6's steps, and do not touch steps 2 to 6.

**The wording.** In `src/board/announcements.ts`, add a clause for the new
effect shaped like `shieldGainedClause` (**D6**): all of a sequence's losses
grouped into one clause, one ship naming itself and its new count, several
naming their squares and that each lost one, with the ships that reached **0**
called out the way the gain clause calls out the ships that reached the cap of 4. In `endOfTurnClauses`, group the losses and push their clause **after** the
gains clause and before the loop, and add the new type to the loop's switch as a
no-op case so it is not spoken twice. Note that the switch has no exhaustiveness
assertion, so the typechecker will not remind you (**D3**).

Verification (automated): extend `src/rules/endOfTurn.test.ts` and
`src/board/announcements.test.ts`, then run `npm test`. The rules cases must
cover: a moving-side ship on a dormant site loses exactly one shield and reports
the new count; a ship already on 0 keeps 0 and raises no effect; a ship on an
**active** site loses nothing; the **opponent's** ship on a dormant site is
untouched at the end of the moving side's turn; and a turn in which one ship
gains on a node while another loses on a dormant site reports both. The wording
cases must cover one loss, several losses, and a loss that reaches 0. `npm run
typecheck` and `npm run lint` pass.

---

## Step 4 — The energy penalty (§8.6 step 2, §8.4)

Status: committed

Notes: Extended `runEndOfTurn`'s step 2 in `endOfTurn.ts` to subtract the
dormant-site penalty from the total the collection just raised, floored at
0, reporting the amount actually deducted and pushing a new
`EnergyPenaltyEffect` (added to the `EndOfTurnEffect` union) after the
collection effect; a zero deduction (nothing dormant occupied, or nothing
left to take) raises no effect, per D4. Added `energyPenaltyClause` to
`announcements.ts`, mirroring `energyCollectedClause`, wired into
`endOfTurnClauses`'s switch after the collection case so ordering falls out
of the sequence's own effect order; updated that function's doc comment.
Extended `fullGame.test.ts`'s ledger to collections minus penalties (D10) —
this passed unchanged in both games, and both sides' final totals stayed
above 0, so the "greater than 0" assertions were left as they were, not
weakened. Added new test blocks to `endOfTurn.test.ts` (the price table
through six/seven, not-netted collection-then-penalty, the floor and its
reported amount, the two zero-effect cases, the opponent's-ships case, the
"ends its move on" vs "flown over" case, and a passed-ply penalty case) and
to `announcements.test.ts` (one site, several sites, no clause when nothing
paid, collect-then-pay as two sentences, and a passed turn's own penalty
clause). Checked `ply.test.ts` per the plan's instruction: its exact-match
`endOfTurn` assertions all involve ships on charged sites only, so none
newly see a penalty effect and none needed updating. `npm run typecheck`,
`npm run lint`, `npm test` (740 passed, `seededReplay.test.ts` unchanged)
and `npm run format:check` all pass. No deviation from the plan.

Extend `runEndOfTurn`'s step 2 so the moving side pays for the dormant sites it
occupies, after collecting for the charged nodes it holds, with the total
floored at 0. Add the matching announcement sentence and fix
`fullGame.test.ts`'s ledger in the same step.

Depends on: Step 2 (the price and the occupancy function) and Step 1 (the rule).
Step 3 is independent but will already be in place.

**The rules layer.** After the existing collection — which is unchanged in every
respect — count the dormant sites the moving side is standing on, price them
with step 2's clamping function, and subtract. The order matters: collect first,
then pay, so the penalty is taken from the total the collection has already
raised (**D3**).

The floor and what is reported (**D4**):

- The amount deducted is the lesser of the table price and the energy the side
  has at that moment. The effect reports **the amount actually deducted**, and
  its `newTotal` is the side's total afterwards, which is never negative.
- **A deduction of zero raises no effect at all** — whether because the side
  stands on nothing dormant, or because it already has 0 energy and there is
  nothing to take. This matches the existing convention for a zero collection.

Add an energy-penalty effect to the module's exported effect types and to the
`EndOfTurnEffect` union, shaped like `EnergyCollectedEffect` — `side`, `amount`,
`newTotal`, `squares` — with a doc comment citing §8.6 step 2 and §8.4. Push it
after the collection effect within the same sequence.

**The wording.** In `src/board/announcements.ts`, add a sentence for the new
effect mirroring `energyCollectedClause` (**D6**): the paying side, the amount
lost, the dormant site or sites that caused it, and the resulting total. One
site names itself; several name their count and squares. Add it to
`endOfTurnClauses`'s switch, where — because the effects are iterated in the
order the sequence produced them — it will fall naturally after the collection
sentence. Do not re-sort.

**The ledger.** `src/rules/fullGame.test.ts` asserts that each side's final total
equals the sum of the `energy-collected` amounts it saw. Extend it to gather the
penalty effects the same way and assert the total equals collections **minus**
penalties (**D10**). This identity is exact because the effect reports the
actual deduction; if it fails, suspect the effect is reporting the table price.
Do not weaken the "each side finishes above 0" assertions — if one now fails,
report it as a finding rather than lowering the bar.

Also check `src/rules/ply.test.ts`: any existing assertion that matches an
end-of-turn effect list exactly (rather than with `expect.arrayContaining` /
`objectContaining`) may now also see a penalty effect. Update such assertions to
the truth; do not delete the cases.

Verification (automated): extend `src/rules/endOfTurn.test.ts` and
`src/board/announcements.test.ts`, then run `npm test`. The rules cases must
cover, at minimum:

- one dormant site occupied costs 1; two cost 3; three cost 6; four cost 10;
  five cost 15; **six and seven also cost 15, with no error raised**;
- three charged nodes held while standing on two dormant sites ends the turn
  **+3**, with **both** a collection effect of 6 and a penalty effect of 3
  reported, in that order — not a single net effect of 1;
- a side with 2 energy incurring a table price of 6 ends on **0**, and the
  penalty effect's `amount` is **2**, not 6 (its own test, per the story);
- a side with 0 energy standing on dormant sites ends on 0 and raises **no**
  penalty effect;
- standing on no dormant site raises no penalty effect and leaves both totals
  untouched;
- the **opponent's** ships on dormant sites cost the moving side nothing;
- a ship that ends its move on a dormant site pays for it that same turn, while
  a site merely flown over costs nothing;
- a passed ply (through `applyPassGuard`) settles both directions in full, just
  as it collects today.

The wording cases must cover a turn that only pays, and a turn that collects and
then pays reading as two sentences in that order. `npm run typecheck` and
`npm run lint` pass, and `seededReplay.test.ts` passes **unchanged** (**D11**).

---

## Step 5 — Camping on a dead site, end to end

Status: committed

Notes: Added four new `describe` blocks to `camping.test.ts` — a dormant
site costing a shield and energy on every one of the camper's owner's own
turns and recurring on the next (not firing once); an active site staying
free across two full rounds with non-zero shields and energy in play (so
the silence is not a floor coincidence); leaving a dormant site stopping
the cost the very turn it is left; and flying across a dormant site (a
distance-3 move at 0 shields) costing nothing — all driven through
`applyMove`/`applyPassGuard`-free single moves, per the file's existing
style, with `energy` overridden by spreading `buildState`'s result rather
than adding a parameter to the helper. Also extended two existing tests
rather than leaving them stale: "a node running out under a ship" now
asserts the `shield-lost` and `energy-penalty` effects explicitly (not
just the ship's final shield count) at the end of the camper's owner's
next turn, pinning D5's timing for both halves; and the old "a site that
is not charged pays nothing" test was retitled and commented to make clear
it is now the floor corner case (0 starting shields, 0 starting energy)
rather than a general claim that dormant sites are free, with its
untouched-assertions widened to also check for absent `shield-lost` /
`energy-penalty` effects and for the side's energy staying at 0. Sanity-checked
by temporarily zeroing the penalty deduction in `endOfTurn.ts` and
confirming the two `energy-penalty` assertions in the new "costs and
recurs" test failed, then restored the file exactly (`git diff` on
`endOfTurn.ts` was empty afterwards). No deviation from the plan beyond
the two existing-test edits just described, which the step's own
"Add cases" framing and the file's existing character (proving the rule
end to end, not leaving a now-misleading test behind) both support.

`npm run typecheck`, `npm run lint`, `npm test` (744 passed) and
`npm run format:check` all pass. `git status` shows only
`src/rules/camping.test.ts` changed.

Add integration cover to `src/rules/camping.test.ts` proving the new cost
through the public rules API, not by calling `runEndOfTurn` directly.

Depends on: Steps 3 and 4 (the behaviour being proved).

`camping.test.ts` is this repository's integration cover for a ship that stays
put — it was written for story 31 to prove that camping owed nothing — and it is
where the new cost belongs end to end. It drives everything through `applyMove`,
`moveRefusalReason` and the `EndOfTurnEffect`s that `applyMove` carries, so a
test there proves the same thing a player's turn would. Follow the file's
existing helpers (`ship`, `siteStatuses`, `buildState`) and its style.

Add cases covering the story's end-to-end claims that no unit test states:

- **Camping on a dormant site is allowed and costs.** A ship left standing on a
  dormant site, with the owner spending the turn moving a **different** ship,
  loses a shield and pays energy at the end of that turn — and does so again the
  following turn, so the cost recurs rather than firing once.
- **Camping on an active site is still free.** The same setup with an active
  site under the ship reports neither a shield loss nor a penalty, however many
  turns pass. This is the tactic story 31 created and story 33 must not have
  broken.
- **The node that runs out under its holder.** A ship holding a charged node
  that reaches capacity at the end of turn N still collects and still gains its
  shield that turn, and first pays and first loses a shield at the end of its
  owner's **next** turn (**D5**).
- **Leaving stops the cost.** A ship that moves off a dormant site pays nothing
  at the end of the turn it left, because it is not standing on it when the
  count is taken.
- **Flying across costs nothing.** A move that passes over a dormant site and
  ends elsewhere costs nothing.

Verification (automated): `npm test` passes with the new cases present, and each
new case fails if the corresponding behaviour is reverted (sanity-check at least
the first by temporarily disabling the penalty locally, then restore).
`npm run typecheck` and `npm run lint` pass.

---

## Step 6 — The overlay draws the penalty

Status: committed

Notes: Generalised `collectionsForEvent` into `settlementsForEvent`, which
gathers both `energy-collected` and `energy-penalty` effects from the same
places (top-level `ply-passed`, and a `moved`/`attacked` event's own
`ply-ended` plus a nested `ply-passed`), tagging each as `"positive"` or
`"negative"`. The rendered `+N`/`-N` and pulse elements keep their existing
base class names (`energy-overlay__gain`, `energy-overlay__pulse`) so the
pre-existing collection tests and their `--green`/`--red` class assertions
pass unchanged, and gain a `--negative` modifier for a penalty (a `--positive`
modifier was considered but a bare absence of `--negative` already reads as
the gain case, so only one new modifier was added). React keys now include
the settlement kind and an index, not just side and ply number. Added two
keyframe variants in `EnergyOverlay.css` — a sinking fade for `--negative`
gains (mirroring the floating fade) and a contracting pulse for `--negative`
pulses (mirroring the expanding one) — plus explicit
`prefers-reduced-motion` fallback selectors covering both variants, so
nothing is carried by motion alone. Extended `EnergyOverlay.test.tsx` with
cases for a lone penalty, a turn that both collects and pays, and a
ply-ending action followed by the other side's pass where one side collects
and the other pays; all prior test cases pass unchanged. `npm run
typecheck`, `npm run lint`, `npm test` (747 passed) and `npm run
format:check` all pass. No deviation from the plan beyond the internal
naming choice above (`"positive"`/`"negative"` rather than `"gain"`/`"loss"`
for the settlement kind, to avoid the doubled-up class name
`energy-overlay__gain--loss`).

Extend `src/board/EnergyOverlay.tsx` and `EnergyOverlay.css` so a penalty is
drawn the way a collection is: a pulse on each dormant square that cost
something, and a "−N" at their centroid, in the paying side's colour, visibly a
loss rather than a gain.

Depends on: Step 4 (the effect it draws).

Follow **D7** in full. The three things to get right:

- **Find penalties everywhere collections are already found.** The existing
  gathering function reads a top-level `ply-passed` event's own end-of-turn
  effects, and for a `moved`/`attacked` event both the `ply-ended` effect's and
  a nested `ply-passed` effect's — because an action that ends a ply can be
  immediately followed by the other side's pass, so one event can carry two
  settlements. Generalise it rather than writing a parallel copy of it.
- **Keys must include the settlement kind.** The current key is side plus ply
  number; with a collection and a penalty possible for the same side in the same
  ply, that is no longer unique.
- **A loss must not read as a gain.** Beyond the minus sign, give the loss its
  own motion — sinking and fading where the gain floats and fades, and a pulse
  that contracts where the collection's expands. Add a `prefers-reduced-motion`
  fallback for both new variants alongside the ones already in the file, so
  nothing is carried by motion alone.

Keep the component `aria-hidden` and keep it a pure function of the session's
last event: no timers, no state of its own.

Verification (automated): extend `src/board/EnergyOverlay.test.tsx` and run
`npm test`. Cases: a penalty effect draws one "−N" carrying the right amount and
one pulse per dormant square, in the paying side's colour; a turn that both
collects and pays draws both a "+N" and a "−N" with the right pulse counts for
each; a ply-ending action followed by the other side's pass draws both sides'
settlements; an event with neither draws nothing; and the existing collection
cases pass unchanged. `npm run typecheck` and `npm run lint` pass. The visual
result is confirmed by eye in step 9.

---

## Step 7 — The HUD shows what a side is paying

Status: pending

Give `ScoreDisplay` a second, separate pip row counting the dormant sites that
side's ships are standing on, and add the dormant count to `scoreSentence`.

Depends on: Step 2 (the occupancy function both the row and the sentence read).

**The pip row.** Follow **D8** in full:

- The existing row counting charged nodes held is **unchanged** — same class
  names, same behaviour.
- The new row sits beneath it, has **five** pips (the penalty counts at most
  five, so a side on six or seven lights all five), and uses its **own base
  class name**, not `score-display__pip` — reusing it would break the existing
  tests that count exactly five pips, and would blur the two rows in every
  future query.
- Both rows are restyled to the owner's decision in **D8**: every pip gets a
  **border in the side's colour**, and an "on" pip is **filled with the colour
  of the kind of site it counts** — gold for a charged node, grey for a dormant
  one — while an "off" pip has no fill. This changes the **existing**
  `.score-display__pip--lit` rule too: a lit node pip becomes gold inside a
  green or red border rather than a filled, glowing disc of the side's own
  colour. Record that restyle in the step's Notes.
- Add `--color-node-charged` (`#DAA520`) and `--color-node-dormant` (`#808080`)
  to `src/index.css`, commented as coming from `SiteMarker.tsx`'s gradients. Do
  not refactor `SiteMarker.tsx`.
- An empty dormant row must not draw the eye; quieten its border rather than
  giving its "off" pips a fill.
- Do not use the `--focus-ring` token in either row; that amber means keyboard
  focus everywhere else in the app, and it must stay visually distinct from the
  charged pip's gold.
- The row is decorative and `aria-hidden`, like the row above it.

**The sentence.** `scoreSentence` in `src/board/announcements.ts` currently reads
"Green: 24 energy, 3 nodes held." Add the dormant count, named **even when it is
zero** (**D9**), in a phrase helper beside the existing `nodesHeldPhrase`.
Something of the shape "Green: 24 energy, 3 nodes held, standing on 2 dormant
sites." — the exact wording is the implementer's, but it must be a complete,
plain sentence a listener can parse, must never be ambiguous about which count
is which, and must handle the singular ("1 dormant site") and the zero case.

Check `src/hud/Hud.test.tsx` for assertions the new row disturbs and update them
to the truth; the axe checks in both files should keep passing untouched
(**D12**).

Verification (automated): extend `src/hud/ScoreDisplay.test.tsx` and
`src/board/announcements.test.ts`, then run `npm test`. Cases: the dormant row
renders five pips with none "on" for a side standing on nothing dormant; one
"on" pip per dormant site occupied; **all five on** for a side standing on six
dormant sites; the opponent's ships on dormant sites light none of this side's
row; the node row's five pips and its lit **count** are unaffected by any of it (its
colours change; its structure, class names and counts do not); and
`scoreSentence` names both counts, with the singular and the zero case covered.
`npm run typecheck` and `npm run lint` pass. The visual result is confirmed by
eye in step 9.

---

## Step 8 — `README.md`

Status: pending

Bring `README.md` in line with 0.14.

Depends on: Steps 1 to 7 (the README describes the finished behaviour).

The README is written for a **player**, not a developer, and its status
blockquote is one flowing paragraph rather than a list. Keep that voice.

What must change:

- **The opening paragraphs.** The second paragraph explains what shields are
  for; the first and third explain scoring and that nodes do not last. A player
  who reads only the top of the file should learn that **dead sites are
  dangerous ground**: a ship parked on a site that has burned out costs its
  owner energy and a shield every turn.
- **The status blockquote.** The sentence "A ship left standing on a node that
  has just run out simply stays there — it is never forced to move, and its
  owner is free to spend their next turn however they like" is still true and
  **stays**. It is no longer the whole story, so follow it with what now
  follows: sitting on a dark site costs energy and eats a shield every turn, so
  leaving is usually worth an action. Make sure the paragraph's existing
  statement that a lit node pays a shield and energy reads as the mirror of it.
- The sentence about the HUD showing "how many nodes each player holds" should
  now also mention that it shows how many dead sites each player is sitting on.

Run `/update-readme` for the rest of the branch diff and take what it suggests.
If the command is not available in the session, do the equivalent by hand:
review the whole branch diff against the README and change what has gone stale.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` pass; `git status` shows `README.md` as the only changed
file; and a read of the README's first three paragraphs and its status
blockquote confirms a player learns, without reading the rules document, that a
burned-out site costs energy and a shield every turn and that they are never
forced to leave it.

---

## Step 9 — Owner play-through

Status: pending

The owner runs the app and confirms the story's headline experience. This is the
pipeline's manual gate; nothing is committed for it beyond any fixes it turns
up.

Depends on: Steps 1 to 8.

Run `npm run dev` and open the app. Confirm, in roughly this order:

0. **The minus sign.** The penalty is drawn with an ASCII hyphen (`-3`), not a
   typographic minus (`−3`), because a U+2212 may not exist in the arcade font
   stack and would render as a fallback glyph. If the hyphen reads thin or
   broken beside the collection's `+`, say so and it can be changed.
1. **A dormant site costs.** Move a ship onto a spent (dark) site and leave it
   there. At the end of that player's turn the announcement says the ship lost a
   shield and that the player lost energy naming that square, the score digits
   roll **down**, and a "−N" appears over the square with a pulse on it.
2. **It keeps costing.** Leave the ship there for several turns. It pays every
   turn, and the ship's shields fall by one a turn until it is on none, after
   which the shield sentence stops but the energy penalty continues.
3. **An active site is still free.** Park a ship on a waiting (unlit, growing)
   site instead. Nothing is announced, nothing is drawn, the score does not
   fall, and the ship keeps its shields for as many turns as it stays. This is
   the tactic story 31 created and it must be untouched.
4. **Collect and pay in one turn.** With one ship on a lit node and another on a
   dark site, end a turn: the announcement reads as **two** sentences,
   collection first and penalty second, and the board shows a "+N" and a "−N"
   at the same time in the same side's colour, distinguishable at a glance.
5. **The floor holds.** Early in a game, with a small score, sit on enough dark
   sites to cost more than the player has. The score lands on **0**, never
   below, and the number the announcement says was lost matches the drop the
   digits actually make.
6. **Each side pays on its own turn.** With both sides sitting on dark sites,
   confirm the green penalty lands at the end of green's turn and the red one at
   the end of red's — never both at once.
7. **A node running out under a ship.** Hold a lit node until it runs out. That
   turn still pays and still grants a shield; the cost starts at the end of that
   player's **next** turn. Move the ship off and the cost stops immediately.
8. **The HUD reads as two counts.** Each side's cell shows the charged nodes it
   holds and the dark sites it is sitting on as two separate rows, both correct
   as ships move on and off sites, neither netted against the other. A side
   sitting on nothing dark has a quiet row that does not draw the eye, and a
   dormant pip is not mistakable for a lit node pip.
9. **A game plays through.** Play or fast-forward far enough to be satisfied the
   penalty has not made the game unreadable or unplayable — and note, without
   fixing it here, whether it feels too harsh. Retuning is explicitly a later
   story.

Verification (manual): the owner confirms each of the nine observations above in
the running app, and reports anything that reads wrongly — wording, a missing or
mis-ordered announcement, a number that does not match the score's movement, or
a pip row that is hard to read.
