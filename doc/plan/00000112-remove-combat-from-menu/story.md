# Story 00000112 — Remove Combat from the start screen

## Summary

The start screen stops offering the **Combat** choice, under every node
playstyle. Every game the app starts is played with combat **off**.

Combat itself stays in the game: the rules for it, and the app's support
for it, are unchanged. Only the choice is taken off the menu.

## What changes

- **The start screen** no longer shows the Combat group. Under steal it
  shows eight groups, and under the other playstyles seven.
- **Every new game** starts with combat off, whatever else is chosen.
- **`README.md`** no longer lists a combat choice among the start-screen
  options, and its opening description says the app plays every game with
  combat off, while still describing how combat works.

## What does not change

- **The ruleset.** `rules.md` §7 still describes combat as a choice made
  before play begins, off or on. The app offering only one of the two is
  the app's choice, like a default, and is not a rule (the ruleset names no
  defaults). No rules-version bump and no changelog entry.
- **Combat in the game.** Attacks, fights, their announcements and their
  board markings all stay, and still work in a game started with combat on.
- **The Quick Guide.**
- **Every other start-screen option.**

## Verification

- The start screen shows no Combat group under any node playstyle.
- A game started from the start screen has combat off: no ship can attack.
- The remaining option groups keep their order.
