# Story 00000099 — Update the start screen's default options

## Summary

The start screen offers eight choices, and each one arrives with a option
already selected. Those preselected options were never chosen as a set: each
was fixed by the story that introduced its group, and most were set to
whatever kept that story's change invisible — the game a player got without
touching anything stayed the game they got the day before. Eight stories
later, the set they add up to is a historical accident rather than a
description of the game.

This story reselects all eight, together, so that a player who opens the app
and presses PLAY gets the game the owner currently believes this game is
becoming. The reason is reviewers: someone sent the link should see the
intended game, not the accumulated defaults of eight separate stories.

**Nothing else changes.** No option is added, removed, renamed or reordered.
No group's list of offered values changes. No rule changes, so there is no
ruleset version bump and no changelog entry.

## The new defaults

In start-screen order, with the changing ones marked:

| Group                  | Today      | New        |             |
| ---------------------- | ---------- | ---------- | ----------- |
| Ships                  | 6          | **5**      | changes     |
| Charged nodes          | 5          | **4**      | changes     |
| Scoring                | SIMPLE     | **BONUS**  | changes     |
| Planet bonus           | OFF        | OFF        | unchanged   |
| Inactive node rotation | CONTINUOUS | **PLANET** | changes     |
| Combat                 | OFF        | OFF        | unchanged   |
| Rounds                 | 30         | 30         | unchanged   |
| Clock                  | UNLIMITED  | UNLIMITED  | unchanged   |

Four of the eight move; four are already where this story wants them.

## What changes

- **Four constants**, one line each: `DEFAULT_FLEET_SIZE` (`src/rules/fleet.ts`)
  6 → 5; `DEFAULT_CHARGED_NODE_COUNT` (`src/rules/nodes.ts`) 5 → 4;
  `DEFAULT_SCORING` (`src/rules/scoring.ts`) `"simple"` → `"bonus"`;
  `DEFAULT_NODE_ROTATION` (`src/rules/nodeRotation.ts`) `"continuous"` →
  `"planet"`.

  These four constants are the single source of the preselection: the start
  screen's checked radio, `useAppScreen`'s initial state and
  `startingGameState`'s parameter defaults all read from them, so there is no
  second place to change.

- **The tests that lean on a default instead of pinning what they mean.**
  Changing the four constants fails 26 tests across 11 files. Every one of
  them is an assertion about the old value, not a rule that broke — the
  rule logic is untouched by this story. They fall into three kinds:

  - **Tests that assert the default itself** — `nodes.test.ts`,
    `scoring.test.ts`, `nodeRotation.test.ts`, four in `gameState.test.ts`,
    three in `StartScreen.test.tsx`, three in `useAppScreen.test.tsx`, six in
    `App.test.tsx`, one in `Board.test.tsx`. These are the point of the
    story: update the expected value, and the test name and prose along with
    it, so a test called "defaults to continuous rotation" does not survive
    saying something else.

  - **Tests that exercise continuous rotation without naming it** — three in
    `nodePool.test.ts` ("rotation actually cycles"), two in `ply.test.ts`.
    These were written when continuous was the default and so never pinned
    it; under planet rotation they now measure something they were not
    written to measure. Pin them to `nodeRotation: "continuous"`, which is
    the setting they were always about.

  - **One test about the default itself, in a seeded-replay context** —
    `seededReplay.test.ts`'s "leaves the pre-0.36 seeded stream untouched at
    continuous", whose comment reads "The default is continuous, so naming it
    explicitly changes nothing". Its point — that naming a rotation
    explicitly consumes the same seeded stream as leaving it unnamed — still
    holds, but it must now be written against planet as the unnamed one.

- **`README.md`'s status blurb**, which states all eight preselected options
  in prose ("six to start", "five to start", "simple to start", "continuous
  to start") and would otherwise be four times wrong. A later paragraph also
  frames continuous as "today's game and the one the app starts on"; with
  planet preselected that sentence's two claims come apart, and the
  "starts on" half moves to planet.

## What does not change

- **`doc/ruleset/rules.md`.** The ruleset names no default and calls no
  option a standard game — a deliberate position, established when the
  "standard game" language was removed from sections 2, 4, 8.1, 9 and 10.
  Which option the app preselects is a property of the app, not of the game,
  and this story does not put it back into the rules.
- **`RULES_VERSION` and `doc/ruleset/changelog.md`.** No rule changes, so
  neither moves.
- **The in-app Quick Guide**, which describes what each setting does and
  never says which is preselected.
- **Every group's offered values, order, and labels**, and the order of the
  eight groups themselves.

## Acceptance

- Opening the app shows Ships 5, Charged nodes 4, Scoring BONUS, Planet bonus
  OFF, Inactive node rotation PLANET, Combat OFF, Rounds 30, Clock UNLIMITED
  — in that order, with the same labels as today.
- Pressing PLAY without touching anything deals a five-a-side, four-charged,
  thirty-round game that scores at the bonus rate and rotates on planets.
- Returning from the Quick Guide leaves all eight as they were left.
- `rules.md` is byte-for-byte unchanged, and `RULES_VERSION` is unchanged.
- Typecheck, lint and the full test suite pass.
