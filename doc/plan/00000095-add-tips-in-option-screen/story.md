# Story 00000095 — Tips on the start screen

## Summary

Each option group on the start screen gets a small **question mark** beside
its title. Pressing it opens a short explanation of what the option does, and
of each choice where the choices need one, so a player can learn what they
are choosing without leaving for the Quick Guide.

Two groups are renamed at the same time: **Scoring** becomes **Node
scoring**, and **Planet resources** becomes **Planet effects**.

Separately, the app starts choosing its **spelling** from the player's
browser language: American spelling for a player whose browser prefers US
English, and international spelling otherwise.

## What changes

### The tips

- **Every option group** on the start screen shows a question mark beside
  its title. Pressing it shows that group's tip, close to the title;
  pressing it again, or anywhere else, closes it. Only one tip is open at a
  time.
- A tip is **explanation only**: opening or closing one never changes an
  option.
- A group that the start screen hides under the current playstyle hides its
  question mark with it.

### The tip text

Choice names are shown in capitals, as on the buttons themselves.

**Node playstyle**

- **CONTINUOUS:** The next node to charge rotates at the end of every turn.
- **PLANET:** The next node to charge rotates each time a ship lands on a
  planet.
- **DEDICATED:** Special squares on the board rotate the next node to
  charge, when a ship lands on one.
- **STEAL:** Nodes never run out, but each one has a matching square where
  a ship can land to steal it.

**Ships**

The number of ships each player has.

**Charged nodes**

The number of charged nodes on the board at any time.

**Player-matching nodes**

When on, each player has a node in their own colour, with a special effect:

- **DOUBLE:** Your own node counts as two nodes while you hold it.
- **REQUIRED:** You score no points for any node unless you hold your own.

**Node scoring**

How nodes score at the end of each turn:

- **SIMPLE:** One point for each node you hold.
- **BONUS:** Each extra node you hold is worth one more than the last: 1, 3,
  6, 10 or 15 points for one to five nodes.

**Planet effects**

When on, two planets each carry a bonus for the first ship to land there,
of either player. Each time a bonus is claimed, a new one appears on another
planet.

- **STABLE:** When a bonus is claimed, the other one stays as it is.
- **RACE:** When a bonus is claimed, the other one changes to a different
  bonus.

**Planet bonus**

When on, each player is given three planets that pay them the chosen points
the first time one of their ships lands there.

**Rounds**

The number of turns each player has in the game.

**Clock (time per turn)**

When on, each player has a total time for the whole game: the chosen time
per turn, multiplied by the number of rounds.

### The renames

- **Scoring → Node scoring.** The start screen group title, and wherever
  player-facing text names the setting: `README.md` and `rules.md` §8.4 and
  §10.
- **Planet resources → Planet effects.** The start screen group title, the
  Quick Guide's section heading and paragraph, `README.md`, `rules.md` §1,
  §3.4 and §10, and `steal.md` §9 and §10. `CLAUDE.md`'s Vocabulary entry
  is updated to the new player-facing name; the code, tests and planning
  documents keep calling the setting **activity**, as they do today.
- **Clock (time per move) → Clock (time per turn).** The group title says
  "move" where it means a turn, which the project's vocabulary rules out.

The renames reword the ruleset without changing how the game is played:
`rules.md` goes from **0.43** to **0.44**, with a changelog entry, and is
not tagged (`CLAUDE.md`).

### Spelling

The app's player-facing text — the start screen, its tips, the Quick
Guide, and everything shown or announced during a game — is spelt in one of
two ways:

- **American** spelling, when the first English language in the browser's
  preferred languages is US English.
- **International** spelling — the app's current spelling — when the first
  English language is any other variety, or when no English language is in
  the list at all.

Only the first English entry decides it: a browser preferring French, then
US English, gets American spelling.

The words affected today are **colour** / **color**, **grey** / **gray**
and **refuelling** / **refueling** (the Quick Guide's REFUELING heading is
American today, and becomes REFUELLING under international spelling), along
with any word the new tips add.

The ruleset, `README.md` and the other documents stay in international
spelling.

## What does not change

- **Every option, its choices and their order.** No choice is added,
  removed or renamed; only the three group titles above change.
- **The rules.** No rule changes; the version bump is for wording only.
- **The Quick Guide**, apart from the renamed section and the spelling.
- **Code names.** `planetActivity`, `scoring` and their kin keep their
  names.

## Out of scope

- **Spellings other than American and international**, such as Canadian
  English's mix of the two.
- **Translation** into any other language.
- **Tips anywhere but the start screen.**

## Verification

- Every option group on the start screen shows a question mark, and
  pressing it shows that group's tip, as worded above.
- Opening and closing a tip never changes an option.
- A group hidden under the current playstyle shows no question mark.
- The start screen, Quick Guide and `README.md` say **Node scoring** and
  **Planet effects**; the clock group says **time per turn**.
- `RULES_VERSION` agrees with `rules.md` at **0.44**, with one changelog
  entry.
- With the browser preferring US English, the app says **color**; with it
  preferring British English, or no English at all, it says **colour**.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- There is **one** rules-version bump on this branch, however many later
  rules edits it needs.
