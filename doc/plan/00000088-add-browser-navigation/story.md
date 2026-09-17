# Story 00000088 — Back goes back

## Summary

The game is one page that swaps three screens in and out — the main menu,
the Quick Guide, a game in progress — and the browser knows nothing about
any of it. Pressing **Back** on the Quick Guide does not return to the menu;
it leaves the game entirely, to whatever page came before. Pressing Back
during a game does the same, silently, mid-turn, with no chance to say no.

This story teaches the browser the three screens. **Back** and **Forward**
move between them the way a player already expects them to, the address bar
says which screen is showing, and backing out of a game asks first.

Nothing about how the game is played changes. No rule moves, no number
moves, `rules.md` is untouched and the version is not bumped.

## Background & references

Facts established while writing this story, so they are not rediscovered:

- **The screen is one piece of React state.** `useAppScreen` holds
  `screen: "start" | "game" | "guide"` and three actions that set it —
  `handlePlay`, `handleOpenGuide`, `handleReturnToStart`. Nothing else
  decides what is on screen.
- **There is no router and no history use at all.** No `pushState`, no
  `popstate`, no `hashchange`, no `location` read anywhere in `src/`.
- **Builds are handed out from per-version subfolders** and Vite's `base`
  is `"./"` (story 51), so nothing may assume it is served from the site
  root. A hash costs no host configuration at any depth, which is why this
  story uses one rather than a path.
- **Nothing is persisted** — no `localStorage`, `sessionStorage`, cookie or
  IndexedDB anywhere — so a reload starts from nothing, and that is the
  condition this story has to be honest about rather than the one it has to
  fix.
- **There is no way out of a game today except finishing it.** The game
  screen has no quit button; only the game-over panel offers a return to the
  menu. Back becomes the first way to abandon a game mid-play, which is
  exactly why it is the one navigation that asks first.
- **Pressing PLAY dispatches `new-game` with a fresh seed**, so a game left
  behind is gone the moment a new one starts; there is no second session
  kept anywhere.

## What changes

### Each screen gets an address

| Screen         | URL                     |
| -------------- | ----------------------- |
| Main menu      | the page's own URL       |
| Quick Guide    | that URL + `#how-to-play` |
| Game in progress | that URL + `#game`     |

The hash is the **one** answer to what is on screen: the screen shown is
whatever the hash asks for, not a second copy of that decision kept
alongside it. In-app navigation moves the browser and lets the screen follow
— opening the Quick Guide adds a history entry, the guide's own Back button
goes back through the browser, PLAY adds an entry — so the address bar and
the screen cannot disagree, whichever of the two the player used.

A link to `#how-to-play` therefore works: it can be handed to a play-tester,
bookmarked, and reloaded, and it opens the Quick Guide.

### Back leaves the Quick Guide, Forward returns to it

From the Quick Guide, **Back** shows the main menu with every option still
set as it was. **Forward** from there opens the Quick Guide again. The
guide's own Back button does the same thing as the browser's, because it _is_
the browser's.

### Back leaves a game, once it has asked

**Back** during a game asks the player to confirm, and only then shows the
main menu. Cancel and the game is still there, on the same turn, with
nothing moved and the clock where it was.

Confirming **abandons the game**. There is no second copy of it and no route
back into it: pressing **Forward** returns the player to the main menu they
are already looking at, and the only way back into play is PLAY, which starts
a new game. This is the same rule that covers a reload — `#game` shows a game
only while there is a game to show, and otherwise quietly means the main
menu, correcting the address bar on its way.

Closing the tab or reloading during a game asks the same question, in the
browser's own words, through the standard "leave this page" prompt. The two
prompts do not read identically — only the in-app one can be worded by the
game — and that is accepted: what matters is that neither way out of a live
game is silent.

It asks **once**. Once the player has confirmed, the game is no longer in
progress, so nothing prompts again — not Forward, not a close, not a reload.

### A finished game does not ask

The game-over panel has nothing left to lose, so Back from it, and its own
return-to-menu button, both go straight to the main menu, and closing the tab
on it prompts for nothing. The prompt guards a game **in progress**, not the
`#game` address.

## What does not change

- **No rule changes.** `rules.md` is not edited and `RULES_VERSION` is not
  bumped.
- **Every screen looks exactly as it does now.** No new visible control, no
  banner, no styled dialog — the confirmation is a plain browser prompt.
- **The options survive the trip.** Fleet size, charged nodes, combat,
  scoring, length and the clock are still held across a visit to the guide
  and across a finished game, exactly as today.
- **Nothing is persisted.** A reload still starts from nothing; this story
  adds no storage.
- **`npm run dev` still serves at the root**, and a built copy still runs
  from a subfolder at any depth. A hash is chosen so that stays true.

## Done when

- On the Quick Guide, Back shows the main menu; Forward from the menu shows
  the Quick Guide again.
- The guide's own Back button leaves the menu in the same state a browser
  Back does, with no extra history entry left behind to press Back through
  twice.
- Loading the page at `#how-to-play` opens the Quick Guide.
- Pressing Back during a game prompts; cancelling leaves the game untouched
  on the same turn; confirming shows the main menu.
- After confirming, Forward does not resume the abandoned game, and no
  further prompt appears.
- Reloading, or loading cold, at `#game` shows the main menu and corrects the
  URL.
- Closing or reloading the tab during a game prompts; doing either on the
  main menu, the Quick Guide, or the game-over panel does not.
- The address bar matches the screen after every one of those, whether the
  player used the app's buttons or the browser's.
- The full suite, typecheck and lint are green.

## Notes

- Planning documents say **ply** for the UI's **turn** (`CLAUDE.md`,
  Vocabulary). No ply logic is touched here.
- The browser will not let a page word the close/reload prompt, and will not
  show one at all unless the player has interacted with the page. Both are
  the platform's rules, not this story's, and a game in progress has been
  interacted with by definition.
- Focus and announcement on a screen change driven by Back or Forward are
  **not** handled by this story; per `CLAUDE.md` that cost is accepted and
  recorded in `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.
- Worth a manual check once it runs: a build served from a subfolder, so the
  hash is confirmed to carry no assumption about the path above it.
