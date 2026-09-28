# Story 00000109 — Planet resources: a stable variant, and new defaults

## Summary

Story 105 made planet bonuses a race under steal. Two bonuses stand on the
board, and when one is claimed the one left behind changes kind at once. That
re-roll is what makes it a race: a bonus is only worth heading for while
nobody takes the other one first.

This story adds a calmer variant. Under **STABLE**, a claimed bonus is still
replaced by a new one elsewhere, but the bonus left behind **keeps its kind**.
A player heading for a Large points bonus arrives to find Large points still
there, unless someone lands on that planet first. There is still competition
for each bonus, but no race against the other one.

Steal and the other playstyles now offer **different planet choices**, so the
start screen shows a different group for each:

- **Under steal**, the Planet bonus group is gone. In its place is a new
  group, **Planet resources**, offering **OFF**, **STABLE** and **RACE**, in
  that order. RACE is today's ADVANCED, renamed.
- **Under continuous, planet and dedicated**, the Planet bonus group stays
  as it is, minus ADVANCED, which it never offered there anyway: **OFF**,
  **2 POINTS**, **3 POINTS**.

This means the classic 2- and 3-point bonuses are **no longer offered under
steal**.

The story also changes three of the app's defaults. A player who presses
PLAY without touching anything now gets **steal**, with player-matching
**REQUIRED** and planet resources **RACE**. Five ships and four charged nodes
stay the defaults.

## What changes

### The rules

**Two settings, one per playstyle family.** rules.md §3.4 now describes two
separate pre-play settings. Each is the same for both players and fixed for
the whole game, and the ruleset names no default for either:

- **Planet bonus** — **off, 2 points or 3 points** — offered under the
  continuous, planet and dedicated playstyles. Its rules are unchanged.
- **Planet resources** — **off, stable or race** — offered only under steal.
  Its rules are in steal.md §10.

Neither setting is offered under the other's playstyles. A steal game never
has classic per-player bonus planets.

**Race** is exactly today's advanced setting, renamed. The two bonuses, the
six kinds and their weights, the opening deal, claiming, fights, the point
table, Fuel, Additional nodes and Node scramble all stay as steal.md §10
states them now.

**Stable** is race with one step removed. When a bonus is claimed:

1. **The bonus takes effect** for the claiming side, as under race.
2. **The other bonus stays on its planet and keeps its kind.** Nothing is
   redrawn for it. (Under race, this is the step where it changes kind.)
3. **A new bonus appears** on a planet drawn at random from the planets that
   are empty and do not carry the other bonus, exactly as under race. Its
   kind is drawn by weight from the kinds available, excluding the other
   bonus's kind, so the two bonuses are still always of different kinds.

Everything else follows race without change: the opening deal, what each
kind does, the point amounts, fights (the attacker's claim resolves in full
before the defender's planet is drawn), and every draw coming from the
seeded stream. Under stable, a claim makes one fewer draw than under race.

A bonus that is kept never becomes unavailable while it stands. The only
kind that can become unavailable is Additional nodes, and only claiming
Additional nodes makes it so. Since the two bonuses are always of different
kinds, the bonus left standing when Additional nodes is claimed is never
Additional nodes itself.

**Off** under planet resources means no planet bonuses at all, exactly as off
does today.

### The ruleset

This is a gameplay change. `rules.md` goes from **0.41** to **0.42**, with a
changelog entry, in its own commit ahead of the code. Tagging stays on hold
(`CLAUDE.md`).

- **rules.md §3.4** is retitled to cover both settings. It says which
  playstyles offer which, keeps its existing text as the description of 2
  points and 3 points, and points to steal.md §10 for planet resources.
- **steal.md §10** becomes **Planet resources**. It states the three values,
  renames advanced to race throughout, and adds stable as described above.
  Its claim order says which step stable skips.
- **Every other mention of "the advanced planet bonus setting"** in both
  files is updated. That includes rules.md §1, §4.1, §7.1 and §8.6 and
  steal.md §§2, 3, 4 and 9. Where the text says "planet bonus" and means
  both settings, it names both.
- **steal.md §9**, which notes that planet bonuses are unaffected by
  player-matching, is reworded for planet resources. Its note that the
  player-matching choice sizes the point amounts applies to both stable and
  race.

### What the player sees

- **The start screen.** Under STEAL, a **Planet resources** group appears in
  place of the Planet bonus group, in the same position, offering OFF,
  STABLE and RACE. Under every other playstyle, the Planet bonus group
  offers OFF, 2 POINTS and 3 POINTS. The two groups keep **their own
  choices**. Switching playstyle shows the other group with whatever it was
  last set to, and switching back finds the first group as it was left. The
  reset from ADVANCED to OFF when leaving steal goes away, because there is
  nothing left to reset.
- **The defaults.** Node playstyle **STEAL** (was PLANET), Player-matching
  nodes **REQUIRED** (was OFF), and Planet resources **RACE**. Planet bonus,
  seen under the other playstyles, stays **OFF**. Ships 5, Charged nodes 4,
  Scoring BONUS, Combat OFF, Rounds 30 and Clock UNLIMITED do not change.
- **In the game**, stable and race look the same: the same bonus panel, the
  same symbols and captions, the same hover glow, the same claim
  announcement. The only difference a player sees is that under stable, the
  planet that was not claimed keeps its symbol when the other one is taken.
- **The Quick Guide.** The ADVANCED PLANET BONUSES section becomes **PLANET
  RESOURCES** and describes both variants: a bonus is always replaced when
  it is taken, and under RACE the bonus left standing also changes. Its
  diagram does not change, since the panel looks the same under both. The
  PLANET BONUS section says it applies to the other playstyles.
- **`README.md`.** The status blurb shows the new defaults (steal, required,
  race) and the two planet groups. The paragraph on the advanced option
  describes planet resources, with stable and race. The stale "eighteen
  starting squares" becomes fourteen, since that sentence is being edited
  anyway.

## What does not change

- **The rules of race**, under its new name. The same seed and the same
  moves give the same game as advanced did.
- **The planet bonus under continuous, planet and dedicated.** It keeps the
  same three values, rules and panel.
- **The point table.** It was measured under race, and stable uses it as it
  is (see _Out of scope_).
- **The bonus panel, its symbols, the hover glow and the announcements.**
- **The steal node rules**, combat, the clock, game length, the fleet sizes
  and the node counts.

## Effect on the game

Under race, much of the decision is about timing. A bonus is worth heading
for only if the opponent does not claim the other one first. Under stable, a
bonus stays what it is until someone lands on it, so a player can plan a
route several turns ahead and trust the prize to still be there. The contest
becomes about who reaches each planet first, not about which bonus changes
next. Stable should reward planning more and luck less.

## Out of scope

- **Retuning** the point table or the weights for stable. If stable plays
  noticeably richer or poorer than race, that becomes a later story.
- **Planet resources under the continuous, planet or dedicated playstyles**,
  and the classic 2/3-point bonuses under steal.
- **Any new visual** that tells stable from race during play.

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.42**, and the changelog has
  one entry for it.
- Opening the app preselects STEAL, with Player-matching nodes REQUIRED and
  Planet resources RACE. Ships show 5 and Charged nodes 4.
- Under STEAL, there is no Planet bonus group. Planet resources offers OFF,
  STABLE and RACE, in that order. Under any other playstyle, there is no
  Planet resources group, and Planet bonus offers OFF, 2 POINTS and 3 POINTS.
- Choosing STABLE, switching to PLANET, choosing 3 POINTS, and switching back
  to STEAL shows STABLE. Switching to PLANET again shows 3 POINTS.
- Under RACE, a claim works exactly as ADVANCED does today: the planet that
  was not claimed changes to a different kind, and a new bonus appears.
- Under STABLE, a claim takes effect and a new bonus appears on another
  empty planet, but the planet that was not claimed keeps its kind. The two
  kinds on the panel are always different.
- Under planet resources OFF, the panel shows no bonus planets and no bonus
  is ever paid.
- The same seed and the same moves give the same game, under stable and
  under race.
- The Quick Guide has a PLANET RESOURCES section covering both variants.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- There is **one** rules-version bump on this branch, however many later
  rules edits it needs.
- The defaults change is an app change, not a rules change. rules.md names
  no default (see story 99).
