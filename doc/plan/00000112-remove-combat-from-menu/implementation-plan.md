# Implementation Plan — Story 00000112, Remove Combat from the start screen

## What this story does

Removes the Combat option group from the start screen, under every node
playstyle, and makes every game the app starts a game with combat off.
Combat stays in the rules layer and the game session untouched: only the
menu choice goes.

`story.md` in this folder is the owner's statement of the change.

## Process

This story is small enough that the owner asked for it to be implemented
inline in the main session rather than through the `/implement-story`
agent pipeline. The deliverables are unchanged: this plan, per-step
Status and Notes, one commit per step, and a peer review by the
`peer-review` agent in its own context.

## Decisions

- **Remove the choice all the way up to `useAppScreen`, not just the
  fieldset.** Hiding only the fieldset would leave `useAppScreen` holding a
  `combatEnabled` state and setter that nothing can ever change, and
  `StartScreen` taking two props it never uses. With the choice gone,
  `useAppScreen` holds no combat state and `handlePlay` dispatches
  `combatEnabled: false` directly.
- **Dispatch a literal `false`, not `DEFAULT_COMBAT_ENABLED`.** The story
  says every game the app starts has combat off; that is a fixed product
  decision, not a default that could be changed in one place. Using the
  default constant would silently turn combat on for every game, with no
  way to turn it off, if the default were ever flipped.
- **Leave the rules layer and session alone.** `combatSetting.ts`,
  `gameState.ts`, `session.ts` and the `new-game` intent keep
  `combatEnabled` exactly as they are, so combat-on games remain
  constructible (the rules and board tests rely on this) and restoring the
  menu choice later is a start-screen change only. The only edit in
  `combatSetting.ts` is to the doc comment on `COMBAT_SETTINGS`, which
  describes the start screen's render order and would otherwise be stale.
- **No ruleset change.** `rules.md` §7 describes combat as a pre-play
  choice; which choices the app offers is the app's concern, in the same way
  a default is (the ruleset names none). No version bump, no changelog
  entry.
- **The Quick Guide drops its combat aside.** Its Planet playstyle line
  said the rings rotate on every planet arrival "(including post-combat, if
  combat is enabled)". That was still true of the game, but the owner chose
  to keep the interface consistent: no player-facing text refers to a
  choice the player cannot make. This was decided at sign-off, after the
  peer review, and is Step 3.
- **Accessibility**: removing a whole option group costs no accessible
  behaviour, so nothing is recorded in the accessibility ledger.

## Steps

### Step 1 — Remove the Combat group from the start screen

Status: committed

Notes: Implemented as planned. The new start-screen test loops over every
node playstyle; the new `useAppScreen` test does the same, resetting the
address between iterations. Typecheck, lint, format check and the full suite
(90 files, 1993 tests) pass.

- `src/start/StartScreen.tsx`: remove the Combat fieldset, its labels map,
  the `combatSettingValue` helper, the group id, the `combatEnabled` and
  `onCombatEnabledChange` props and the `COMBAT_SETTINGS` import; update the
  file-header count of option groups (now seven, eight under steal).
- `src/App.tsx`: stop passing the two combat props and stop destructuring
  them from `useAppScreen`.
- `src/useAppScreen.ts`: remove the `combatEnabled` state, its setter and
  both from `AppScreen`; `handlePlay` dispatches `combatEnabled: false`.
  Reword the doc comment so it says the combat setting is always off rather
  than chosen.
- `src/rules/combatSetting.ts`: reword the `COMBAT_SETTINGS` doc comment so
  it no longer claims the start screen renders it.
- Tests: in `src/start/StartScreen.test.tsx`, drop the combat props and
  handler from the render helper and the "not called" assertions, drop the
  Combat-group tests, and update the option-group order tests to omit
  Combat; add an assertion that no Combat group renders under either a
  steal or a non-steal playstyle. In `src/App.test.tsx`, drop the Combat
  group from the defaults test, the group-order test and the guide
  round-trip test. In `src/useAppScreen.test.tsx`, replace the "carries a
  chosen combat setting of on" test with one asserting `handlePlay` always
  dispatches `combatEnabled: false`, and drop `combatEnabled` from any
  other expectation that reads it off the hook.

Depends on: nothing.

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and the full `npm test` all pass, including the new
assertions that no Combat group renders and that `handlePlay` dispatches
combat off.

### Step 2 — README check

Status: committed

Notes: The README review was done inline in the main session, not through
the `/update-readme` command, since the two changes were already known. It
made exactly the two expected edits; the rest of the opening paragraph was
rewrapped only to keep its lines within 80 columns.

Run the `/update-readme` review of the branch diff. Expected changes:
remove "a choice of whether combat is on or off (off to start)" from the
start-screen options list, and reword the opening paragraph's "Fighting is
a choice you make before play begins: the app starts with combat off" so it
says the app plays every game with combat off, while keeping the
description of how combat works. Other README passages that describe
combat conditionally ("when combat is on") stay.

Depends on: Step 1 (the README describes what the app now does).

Verification (automated): `npm run format:check` passes, and
`grep -n -i combat README.md` shows no remaining claim that the start
screen offers a combat choice.

### Step 3 — Quick Guide: drop the combat aside

Status: committed

Remove "(including post-combat, if combat is enabled)" from the Quick
Guide's Planet playstyle line in `src/guide/guideCopy.ts`, and update the
matching expectation in `src/guide/guideCopy.test.ts`.

Depends on: Step 1 (the combat choice is gone from the start screen).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and the full `npm test` all pass.

Notes: Added at the owner's sign-off, after the peer review, so the review
does not cover it; it is a one-sentence copy change.
