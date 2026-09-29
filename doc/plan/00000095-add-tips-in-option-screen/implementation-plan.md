# Implementation Plan — Story 00000095, Tips on the start screen

## What this story does

Three things, all player-facing:

1. **Tips.** Every option group on the start screen gets a small question
   mark beside its title. Pressing it opens a short explanation of the
   option (and of its choices where they need one), worded exactly as
   `story.md` gives it.
2. **Renames.** Scoring becomes **Node scoring**, Planet resources becomes
   **Planet effects**, and the clock group's "time per move" becomes **time
   per turn** — on the start screen, in the Quick Guide, in `README.md`, in
   the ruleset and in `CLAUDE.md`'s Vocabulary. The ruleset goes from 0.43
   to 0.44 for the wording, with a changelog entry and no tag.
3. **Spelling.** The app chooses American or international spelling from
   the browser's preferred languages: American when the first English entry
   is US English, international (today's spelling) otherwise.

`story.md` in this folder is the owner's statement of the change, and is
the source of every tip's wording. Planning documents say **ply** where the
rules and the UI say **turn**; nothing in this story needs the distinction.

## Where things stand today

- `src/start/StartScreen.tsx` renders each option group as a `<fieldset>`
  whose `<legend>` holds the group's title as plain text; the group's
  accessible name comes from that legend. Seven groups render under the
  continuous, planet and dedicated playstyles; eight under steal, which adds
  Player-matching nodes and shows the Planet resources group (code name
  `planetActivity`) where the others show Planet bonus. The component is
  controlled and holds no state beyond `useId` ids.
- `src/start/StartScreen.test.tsx` finds groups by accessible name
  (`getByRole("group", { name: "Scoring" })`) and checks group order by
  reading each group's `legend` `textContent`.
- `src/guide/guideCopy.ts` holds the Quick Guide's copy as module-level
  string constants; `src/guide/GuideScreen.tsx` renders them. The copy says
  "colour" three times (international) but its refuelling heading reads
  `REFUELING` (American) — the one inconsistency the story calls out. The
  PLANET RESOURCES section's heading and paragraph name the setting.
- In-game text — the board's live-region announcement
  (`src/board/announcements.ts`, rendered through `AccessibleGrid`'s
  `announcement` prop by `src/board/Board.tsx`), square accessible names
  (`src/board/squareLabel.ts`), the HUD, the clock and the game-over
  panel — contains no word with a second spelling today.
- `src/board/planetArt.ts`'s planet `name` fields contain "coloured" and
  "grey", but they are documented as "never shown to a player": `Planet.tsx`
  draws the planet `aria-hidden` and a planet square's accessible name says
  only "planet". They are developer descriptions, not player-facing text,
  and are out of scope (D8).
- `src/rules/rulesVersion.ts` holds `RULES_VERSION = "0.43"`;
  `src/rules/rulesVersion.test.ts` reads the version out of `rules.md` and
  checks that `changelog.md` has a `## <version> ` entry, so it needs no
  edit of its own.
- `src/main.tsx` renders `<App />` inside `StrictMode`, nothing else.

## Decisions

**D1 — The ruleset renames every occurrence, not just the sections the
story lists.** The story names `rules.md` §1, §3.4, §8.4 and §10 and
`steal.md` §9 and §10, but `rules.md` also names "planet resources" in
§3.1, §4.1, §7.1, §8.4 and §8.6 (and §3.4's own heading). A rename that
leaves the old name in five places is not a rename, so Step 1 changes every
occurrence of the setting's player-facing name in `rules.md` and `steal.md`
(and in `tech-notes.md`, if it uses it), in whatever case it appears. The
story's intent — the name changes, nothing else — is unchanged. Historical
`changelog.md` entries are not edited (CONTRIBUTING.md, "Historical planning
documents are not rewritten"); only the new 0.44 entry uses the new names.

**D2 — The tip's group name stays the group's accessible name.** The
question mark sits inside the `<legend>`, beside the title text, so the two
lay out together. Left alone, that would make each group's accessible name
"Node scoring" plus the button's name. Instead the title text gets its own
element with a `useId` id, and the `<fieldset>` takes `aria-labelledby`
pointing at it, so each group's name stays exactly its title. This keeps
every existing `getByRole("group", { name })` query meaningful and costs no
accessible behaviour. Rejected: putting the button outside the legend
(a rendered legend is laid out specially at the fieldset's edge, and
aligning a sibling beside it is fragile); a visually hidden legend with a
second, visible `aria-hidden` title (two copies of every title to keep in
step).

**D3 — The tip is an overlay, opening below the title.** The open tip is
absolutely positioned under its group's title, over the group's own choices
and whatever follows, rather than pushing the screen's layout down. An
inline expansion would move every group below it each time a tip opened and
closed, which on a centred, column-laid screen reads as the whole page
jumping. Rejected: the native Popover API (`popover="auto"` gives the
one-at-a-time and light-dismiss behaviour for free, but positioning a
top-layer popover next to its button needs CSS anchor positioning, which is
not yet available in every browser the app targets, and jsdom implements
neither, so the behaviour could not be tested).

**D4 — Open, close, and one at a time, held as one piece of state.**
`StartScreen` gains one piece of local state: which group's tip is open, or
none. Pressing a question mark opens its tip, or closes it if it is the one
already open; pressing another group's question mark switches to that one.
A single value makes "only one tip open at a time" structural rather than
enforced. While a tip is open, three things close it:

- a **pointer press anywhere except a question mark** (a document-level
  `pointerdown` listener, added only while a tip is open). Question marks are
  excluded so that their own click handler decides between toggle and
  switch, instead of the press closing the tip and the click reopening it.
  **A press inside the open tip itself closes it** — the story says pressing
  "anywhere else" closes it, and the tip holds nothing to interact with;
- **focus moving to anything other than the open tip's own question mark**
  (a document-level `focusin` listener). This is the keyboard's "anywhere
  else", and it also guarantees a keyboard player cannot change the node
  playstyle — which can unmount the Player-matching or Planet effects group —
  while that group's tip is open, since reaching a radio moves focus off the
  question mark;
- **Escape**.

**D5 — A press outside is not swallowed.** A press that closes a tip still
does what it would have done: pressing a radio in another group both closes
the tip and selects that choice. That is the player pressing an option, not
the tip changing one, so "opening or closing a tip never changes an option"
holds. Swallowing the press (a transparent backdrop) was rejected: it would
make every first press after reading a tip do nothing, which reads as the
screen ignoring the player.

**D6 — The tip is always rendered, hidden when closed.** Each group's tip
element is in the DOM whether open or not, carrying the `hidden` attribute
while closed, and its question mark carries `aria-expanded` and
`aria-controls` pointing at it. Keeping the element present keeps
`aria-controls` pointing at something real at all times. Consequence the
CSS must respect: the tip's class must not set `display` in a way that
overrides `[hidden]` (either set the display only on `:not([hidden])` or add
an explicit `[hidden] { display: none }` rule for the class).

**D7 — Tip copy is a plain module, verbatim from the story, with literal
choice names.** The tips' wording lives in a new copy module beside the
start screen (`src/start/optionTips.ts`), like `guideCopy.ts` does for the
guide: per group, an optional introductory sentence and an optional ordered
list of choice lines (a choice name in capitals and its sentence). It knows
nothing about React. The choice names are written as literal capitals
(`"CONTINUOUS"`), not looked up from `StartScreen`'s label maps; a
start-screen test asserts that every choice name a tip mentions is one of
that group's radio labels, which catches drift without coupling the copy
module to the component's private maps. The groups are keyed by the code's
own names (`nodePlaystyle`, `fleetSize`, `chargedNodeCount`,
`playerMatching`, `scoring`, `planetActivity`, `planetBonus`,
`lengthInRounds`, `clockSetting` — or equivalents matching the existing
props), per the story's "code names keep their names".

**D8 — Spelling: one word table, applied where text reaches the player.**

- **How the spelling is chosen.** A pure function takes the browser's
  preferred-language list and returns `"american"` or `"international"`:
  it walks the list in order, skips any entry that is not a valid language
  tag, and stops at the first whose language is English; that entry decides —
  American if its region is US, international otherwise. No English entry,
  or an empty list, gives international. A bare `en` (no region) is not US
  English, so it gives international. Tags are compared case-insensitively
  and parsed with `Intl.Locale` (so `en-Latn-US` counts as US), not by string
  slicing.
- **When.** Once per page load, in `src/main.tsx`, from
  `navigator.languages` (falling back to `[navigator.language]` if the list
  is missing). The app does not react to a mid-session language change; a
  reload picks it up.
- **How it reaches components.** A small React context carries the chosen
  spelling, with **international as its default value**, and `main.tsx`
  wraps `<App />` in its provider. Defaulting to international means every
  existing component test, which renders without a provider, keeps today's
  spelling with no test churn; and keeping the `navigator` read in
  `main.tsx`, rather than in `App`, means `App.test.tsx` (where jsdom
  reports `en-US`) is unaffected too.
- **How text is respelled.** Copy stays written once, in international
  spelling. A word table maps each international form to its American form
  — at least `colour`/`color`, `colours`/`colors`, `coloured`/`colored`,
  `grey`/`gray`, `refuelling`/`refueling`, `refuelled`/`refueled` — and a
  pure transform replaces whole words only, preserving the source word's
  case (lower, Capitalised, ALL CAPS, so `REFUELLING` becomes `REFUELING`).
  Under international spelling the transform returns its input unchanged.
  Rejected: authoring each string twice (every copy string doubles and the
  pairs drift); separate American copy files (the same, at file scale); an
  internationalisation library (the app has one language with two
  spellings, and translation is out of scope — the dependency would be
  almost entirely unused).
- **Where it is applied.** At the points where composed text reaches the
  player: the Quick Guide (title, intro, headings, paragraphs, setting
  lines), the start-screen tips, and, in `Board.tsx`, the live-region
  announcement and every square's accessible name. The HUD, clock,
  start-screen titles and choice labels, and game-over panel are fixed short
  phrases with no word in the table, and are not routed through it; the
  spelling module's header comment states the contract — player-facing text
  containing a word in the table must pass through the transform — so the
  next story adding such text knows to do so.
- **Guarding the source spelling.** A test asserts that no string in the
  guide's copy module or the tips' copy module contains any American form
  from the table as a whole word, so the transform's input is always
  international and a stray "color" in the source is caught.
- **The refuelling heading** becomes `REFUELLING` in the source copy, so it
  reads REFUELLING under international spelling and REFUELING under
  American, as the story requires.
- **Planet art names are out of scope.** `planetArt.ts`'s `name` field is
  never shown or announced (see "Where things stand today"), so its
  "coloured" and "grey" are left alone.

**D9 — Accessibility.** The question marks are real buttons with an
accessible name ("About" plus the group title, e.g. "About Node scoring"),
`aria-expanded` and `aria-controls` — baseline plumbing, cheap to keep. Two
costs are accepted and recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` (Step 3):
opening a tip announces nothing (a screen-reader user reaches its text by
reading on, since the tip follows the legend in document order), and the
tip closes as soon as focus leaves its question mark, so a keyboard user
cannot tab into it (it holds nothing focusable, but its text must be read
with the reading cursor rather than by focus). No accessibility tests are
added (CLAUDE.md); existing tests are updated where the change touches them.

**D10 — Steps.** The ruleset rename is its own commit, ahead of code
(CLAUDE.md, "Rules versioning"). Spelling comes before the tips because the
Player-matching nodes tip says "colour" and must be spelt by the chosen
spelling from the moment it exists. The start-screen renames, the Quick
Guide's section rename and the tips share one step: they all rewrite
`StartScreen.tsx` and its test in sequence, and the tips need the new
titles. The browser-language manual checks sit in that step's owner gate
rather than a gate of their own, since the tips add a second place
"colour" appears and one gate covers both.

## Steps

### Step 1 — Ruleset and vocabulary: Node scoring and Planet effects (0.44)

Status: committed

Notes: Renamed planet resources to planet effects throughout `rules.md`, `steal.md` and `tech-notes.md` (including the steal.md §10 and tech-notes headings), and scoring to node scoring where the setting is named (rules.md §8.4 and §10, steal.md §9 and §10, and one tech-notes line); the version is now 0.44, with a changelog entry and `RULES_VERSION` bumped. The implementing agent left `CLAUDE.md` alone; the orchestrator made the Vocabulary edit, as the owner-approved story specifies.

Documentation only; no code other than the version constant.

- `doc/ruleset/rules.md`: rename the **planet resources** setting to
  **planet effects** everywhere it is named, in whatever case — §1 (twice),
  §3.1, §3.4 (its heading, "Planet bonus and planet effects", and its body),
  §4.1, §7.1 (twice), §8.4, §8.6 and §10. Rename the **scoring** setting to
  **node scoring** where the text names the setting: §8.4's opening
  ("Node scoring is **simple or bonus** …") and §10's list ("how node
  scoring is priced"). Ordinary uses of "scoring" or "score" that do not
  name the setting stay. Bump `**Rules version: 0.43**` to `0.44`.
- `doc/ruleset/steal.md`: the same rename of the planet resources setting
  everywhere it is named (including §9 and §10, and any section heading);
  rename the scoring setting where it is named as a setting.
- `doc/ruleset/tech-notes.md`: if it names either setting by its
  player-facing name, rename it the same way (it is a living document, not a
  historical record).
- `doc/ruleset/changelog.md`: add a new entry at the top,
  `## 0.44 — …` (the version followed by a space and a dash, which the
  version test looks for), saying: a wording change only, not a gameplay
  change, so not a tag candidate (and tagging is on hold regardless); the
  **planet resources** setting is renamed **planet effects** and the
  **scoring** setting **node scoring**, throughout `rules.md` and
  `steal.md` (list the sections touched); nothing about how the game is
  played changes. Do not edit any earlier entry.
- `src/rules/rulesVersion.ts`: `RULES_VERSION` becomes `"0.44"`.
  `rulesVersion.test.ts` needs no edit.
- `CLAUDE.md`, Vocabulary, the **Planet resources** entry: it becomes the
  **Planet effects** entry, saying the player-facing name is "planet
  effects" (used on the start screen, in the Quick Guide, `rules.md`,
  `steal.md` and `README.md`) while code, tests and planning documents keep
  calling it **activity**, and that the split is deliberate. Keep the
  entry's existing substance; only the player-facing name and its
  description change. (The start screen and Quick Guide catch up in Step 3,
  `README.md` in Step 4.)

Commit this step on its own, as the ruleset change.

Depends on: nothing.

Verification (automated): `npm test` passes in full, including
`rulesVersion.test.ts` (version 0.44 agrees with `rules.md` and has a
changelog entry); `npm run typecheck`, `npm run lint` and
`npm run format:check` pass; `grep -niE "planet resources"
doc/ruleset/rules.md doc/ruleset/steal.md doc/ruleset/tech-notes.md` prints
nothing, and `grep -n "Scoring is" doc/ruleset/rules.md` prints nothing.

### Step 2 — Spelling from the browser's preferred languages

Status: pending

Add the spelling choice (D8) and route today's player-facing text through
it.

- New module `src/spelling/spelling.ts` (plain TypeScript, no React): the
  `Spelling` type (`"american" | "international"`); the pure function from a
  preferred-language list to a spelling, exactly as D8 describes; the word
  table; and the pure whole-word, case-preserving transform. Its header
  comment says what the module does and states the contract that
  player-facing text containing a word in the table must pass through the
  transform (no design history — CONTRIBUTING.md, "Comments").
- New `src/spelling/SpellingContext.tsx` (or equivalent): the React context
  with international as its default, its provider, and a hook reading it.
- `src/main.tsx`: compute the spelling once from `navigator.languages`
  (falling back to `[navigator.language]`) and wrap `<App />` in the
  provider. `App` itself does not read `navigator`.
- `src/guide/guideCopy.ts`: the refuelling section's heading becomes
  `REFUELLING`. Nothing else in the copy changes in this step.
- `src/guide/GuideScreen.tsx`: read the spelling from context and pass the
  title, intro paragraph, every heading, paragraph and setting line's label
  and text through the transform.
- `src/board/Board.tsx`: read the spelling from context and pass the
  live-region announcement and each square's accessible name through the
  transform before handing them to `AccessibleGrid` (which must keep
  rendering what it is given verbatim).
- Tests:
  - `src/spelling/spelling.test.ts` (node environment): the language
    function — `["en-US"]` → american; `["en-GB"]` → international;
    `["fr-FR", "en-US"]` → american (only the first English entry
    decides, and non-English entries before it are skipped);
    `["en-GB", "en-US"]` → international; `["en", "en-US"]` →
    international (bare `en` is the first English entry and is not US);
    `["fr", "de"]` → international; `[]` → international; a mixed-case
    `"EN-us"` → american; an invalid tag before `en-US` is skipped. The
    transform — each table word in lower, Capitalised and ALL CAPS form;
    whole words only (a word merely containing a table word, such as
    "colourful" if it is not itself in the table, is unchanged); text with
    no table word unchanged; international returns its input unchanged.
    The source-spelling guard: no string in `guideCopy.ts`'s exports
    contains an American form from the table as a whole word (Step 3
    extends this to the tips' copy).
  - `src/guide/guideCopy.test.ts`: the heading-order expectation now reads
    `REFUELLING`.
  - `src/guide/GuideScreen.test.tsx`: rendered with no provider, the guide
    shows "REFUELLING" and "colour"; rendered inside a provider set to
    American, it shows "REFUELING" and "color" and no "colour". Update any
    existing expectation of `REFUELING`.
  - Search every test file for `REFUELING` and update expectations of the
    default (international) rendering.

Depends on: Step 1 only in that the branch's ruleset is settled; nothing in
this step reads it.

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and the full `npm test` pass, including the new
spelling and guide tests above. The wiring in `main.tsx` is checked by hand
in Step 3's owner gate.

### Step 3 — Start screen: the renames and the tips

Status: pending

- `src/start/StartScreen.tsx`, renames: the group titles "Scoring" →
  "Node scoring", "Planet resources" → "Planet effects", and
  "Clock (time per move)" → "Clock (time per turn)". Update the file header
  and doc comments that name these groups by their titles. Code names
  (`scoring`, `planetActivity`, their props, label maps and ids) do not
  change.
- `src/guide/guideCopy.ts`: the `planetActivity` section's heading becomes
  `PLANET EFFECTS`, and its paragraph's "the planet resources option"
  becomes "the planet effects option". Update the module header comment's
  mention of the PLANET RESOURCES section. The section id stays
  `planetActivity`.
- New `src/start/optionTips.ts` (D7): the nine groups' tips, worded
  verbatim from `story.md`, "The tip text" — Node playstyle (four choice
  lines, no introduction), Ships, Charged nodes (introduction only),
  Player-matching nodes (introduction and two choice lines), Node scoring
  (introduction "How nodes score at the end of each turn:" and two choice
  lines), Planet effects (introduction and two choice lines), Planet bonus,
  Rounds and Clock (time per turn) (introduction only). Written in
  international spelling. A short header comment says what the module is.
- `src/start/StartScreen.tsx`, tips:
  - Each group's `<legend>` holds the title in its own element (with a
    `useId` id) followed by the question-mark button; the `<fieldset>` is
    named by `aria-labelledby` pointing at the title element (D2). The
    button shows `?`, is named "About <group title>" (e.g. "About Node
    scoring"), and carries `aria-expanded` and `aria-controls` (D6, D9).
  - Immediately after the legend, inside the fieldset, the group's tip
    element: always rendered, `hidden` while closed (D6). It shows the
    introduction as a paragraph and the choice lines as a list, each line
    the choice name in capitals and emphasised, a colon, then its sentence.
    All tip text passes through the spelling transform using the spelling
    from context.
  - One piece of local state holds which tip is open (D4); the
    open/switch/close rules are exactly D4's, with outside presses passing
    through (D5). The document listeners are added only while a tip is open
    and removed on close and unmount. A small hook in its own file under
    `src/start/` is a reasonable home for the listeners, but not required.
  - A group hidden under the current playstyle renders nothing at all, so
    its question mark and tip go with it (this already follows from the
    existing conditional rendering).
  - Update the component doc comment: the component now also holds which
    tip is open, and opening or closing a tip never calls an option
    handler.
- `src/start/StartScreen.css`: the legend lays out title and question mark
  in a row, still centred; the question mark is small and round, in the
  legend's dim colour, brightening on hover, with the same focus-visible
  ring the screen's other buttons use; each fieldset is a positioning
  context; the tip is an overlay (D3) centred under the title, above later
  groups and the PLAY button in stacking order, with a readable maximum
  width (around 22rem), the app's body font rather than the arcade font,
  left-aligned text, and the raised-panel background and dim border the
  screen's quiet buttons use. The tip's rule must not override `[hidden]`
  (D6).
- `doc/plan/00000021-accessibility-tech-debt/known-issues.md`: add a
  "From story 95 — tips on the start screen" section, in the ledger's
  existing format (Source line citing this plan's D9 and this step), with
  the two costs D9 lists and "Where: `src/start/StartScreen.tsx`".
- Tests:
  - New `src/start/optionTips.test.ts`: every tip's wording verbatim from
    `story.md`.
  - `src/spelling/spelling.test.ts`: extend the source-spelling guard to
    every string in `optionTips.ts`.
  - `src/start/StartScreen.test.tsx`: the group-order tests read each
    group's title element (or the element its `aria-labelledby` points at)
    instead of the legend's whole `textContent`, and expect the new titles;
    every `name: "Scoring"` / `"Planet resources"` query uses the new
    title. New tests: every rendered group has a question mark, under a
    non-steal playstyle and under steal, and no question mark exists for a
    group that is hidden (no "About Player-matching nodes" or "About Planet
    effects" outside steal, no "About Planet bonus" under steal); pressing
    a question mark shows that group's tip text and sets `aria-expanded`;
    pressing it again hides it; pressing a second question mark hides the
    first and shows the second; pressing elsewhere on the screen (the title,
    or inside the open tip) hides it; Escape hides it; opening and closing
    tips calls no option handler and no `onPlay` / `onOpenGuide`; each tip's
    choice names are among its group's radio labels (D7); rendered inside
    an American provider, the Player-matching nodes tip says "color".
  - `src/guide/guideCopy.test.ts`, `src/guide/GuideScreen.test.tsx`: the
    PLANET EFFECTS heading and reworded paragraph.
  - Search every test file (including `src/App.test.tsx` and
    `src/useAppScreen.test.tsx`) for `Scoring"`, `Planet resources`,
    `PLANET RESOURCES` and `time per move`, and update each to the new
    wording. Any axe check that renders the start screen must still pass.

Depends on: Step 2 (the tips are spelt through the spelling context, and
the Player-matching nodes tip contains "colour"); Step 1 (the titles match
the ruleset's new names).

Verification (manual, after the automated checks): `npm run typecheck`,
`npm run lint`, `npm run format:check` and the full `npm test` pass first.
Then the owner runs `npm run dev` and checks, in a browser:

- The start screen's group titles read NODE SCORING, PLANET EFFECTS (under
  STEAL) and CLOCK (TIME PER TURN); the other titles are unchanged.
- Every group shows a question mark beside its title, sitting neatly on the
  title's line. Under CONTINUOUS, PLANET and DEDICATED there is no
  Player-matching nodes group and no question mark for it, and Planet bonus
  shows one; under STEAL, Player-matching nodes and Planet effects show
  one and Planet bonus is gone.
- Pressing each question mark opens that group's tip just below its title,
  worded as `story.md` gives it, readable, not clipped by the screen's edge
  (check the lowest group, Clock, and resize the window narrow), and drawn
  over, not pushing down, what is below it.
- Pressing the same question mark again closes it; pressing another group's
  question mark switches to that tip; pressing on empty screen, on a title,
  or on the tip itself closes it; only one tip is ever open.
- Opening and closing tips changes no option: every selected choice stays
  selected. Pressing a choice in another group while a tip is open closes
  the tip and selects that choice.
- Spelling: with the browser's preferred languages set so that English
  (United States) is the first English entry, reload — the Quick Guide's
  heading reads REFUELING and its STEALING NODES and PLAYER-MATCHING NODES
  paragraphs say "color", and the STEAL Player-matching nodes tip says
  "color". With English (United Kingdom) first, reload — REFUELLING and
  "colour" throughout. With only non-English languages (for example only
  French), reload — "colour". With French first and English (United
  States) second — "color".
- The Quick Guide's last section is headed PLANET EFFECTS and says "the
  planet effects option".

### Step 4 — README check

Status: pending

Run the `/update-readme` review of the branch diff. Expected changes to
`README.md`, kept in international spelling:

- The start-screen options list: "a choice of how scoring works" names the
  setting as **node scoring**; "a choice of planet resources when steal is
  chosen" becomes **planet effects**.
- "the planet bonus and planet resources" (the Quick Guide sentence) and
  "Steal offers planet resources instead" use **planet effects**.
- A sentence saying each option on the start screen has a question mark
  that opens a short explanation of it, and one saying the app uses
  American spelling when the browser prefers US English and international
  spelling otherwise — each in the README's plain, player-facing voice.

Leave "Simple scoring" / "Bonus scoring" as descriptions of how the choices
pay, and everything else unchanged.

Depends on: Step 3 (the README describes what the app now does).

Verification (automated): `npm run format:check` passes;
`grep -ni "planet resources" README.md` prints nothing; `grep -ni
"node scoring\|planet effects" README.md` shows the renamed passages.
