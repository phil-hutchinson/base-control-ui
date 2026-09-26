# Story 00000101 — Steal: a fourth node playstyle

## Summary

The start screen's **Inactive node rotation** group offers three settings
(rules.md §8.2), and all three answer the same narrow question: how the
three waiting nodes' priorities rotate. That name has become too small for
what the group is about to hold.

This story renames the group to **Node playstyle** and adds a fourth
setting, **STEAL**, which is not a fourth way to rotate anything. It is a
different game of nodes, and it replaces most of section 8:

- **A node is a colour, and it moves rather than ends.** Each node carries
  exactly **two squares** — either one **charged** node and one
  **prospective** node, or, when nobody holds it, two prospective nodes. A
  prospective node is drawn in its node's colour and always shows three
  rings.
- **A ship claims a node by landing on one of its prospective nodes.** That
  square becomes the charged node with the ship aboard; whatever square the
  node occupied before simply vanishes; and a fresh prospective node is
  drawn for the colour. Landing on a prospective node is the only way into a
  node — and it works whether the node is unheld, held by the opponent, or
  held by you.
- **A node can be held for as long as its holder can keep it.** No
  countdown, no depletion beneath its holder, no trap. The pressure comes
  entirely from the opponent walking to a prospective square, which both
  players can see, in the node's own colour, for the whole time it sits
  there.
- **Walking off a node gives it up.** The square becomes ordinary board
  again on the spot, and the colour draws a second prospective node — so an
  abandoned node returns to the two-prospective state it started in, waiting
  for whoever reaches it first.
- **There are no depleted nodes at all.** Under steal a node is charged or
  prospective and nothing else, so no ship is ever trapped and no square is
  ever closed to landing.
- **Nothing charges at the end of a turn.** There is no priority, no
  rotation, no queue and no refill. Charging is something a ship does by
  arriving somewhere.

As with every other choice, `rules.md` names no default; the app's default
stays **PLANET**, so a player who touches nothing gets the game they get
today.

## What changes

### The option group is renamed

**Inactive node rotation** becomes **Node playstyle**, in the same place in
the start screen's order, with a fourth choice **STEAL** rightmost. The three
existing choices keep their labels and their behaviour exactly.

### Under STEAL, a node is a colour with two squares

The **Charged nodes** choice — five, four or three — still sets how many
nodes the game has; under STEAL it no longer describes how many are charged
at any moment, because that number rises and falls as players take and lose
them. Each node is dealt a colour of its own, and its prospective nodes are
drawn in that colour, which is the only thing tying a prospective square to
the node it belongs to.

A node is always in exactly one of two configurations:

| | Charged | Prospective |
| --- | --- | --- |
| **Open** — how every node is dealt | 0 | 2 |
| **Held** | 1 | 1 |

**The opening board carries no charged node at all**: at four nodes, eight
prospective squares and nothing else. Neither player scores until a ship
reaches one.

### Two events, and only two, move a node

**A ship lands on a prospective node** — of any node, held by anyone or by
nobody:

1. That square becomes the node's **charged** node, with the ship on it.
2. If the node had a charged node, that square **becomes ordinary board on
   the spot**. A ship standing there, of either side, is left on an ordinary
   square, free to move next turn like any other.
3. The node's other square, whichever it was, is discarded, and **one fresh
   prospective node is drawn** anchored on the square just charged.

The node is now Held, wherever it was before. This one rule covers claiming
an unheld node, taking one from the opponent, and a holder relocating their
own node out of reach — which costs a whole turn and a move, and leaves the
node's new prospective square drawn afresh.

**A ship moves off a charged node**, without landing on that node's own
prospective:

1. The vacated square becomes ordinary board, leaving nothing behind.
2. The node draws **a second prospective node**, anchored on the prospective
   it already has.

The node is now Open, and the next ship to reach either prospective square
takes it.

### Where a prospective node is drawn

Legality is rules.md §3.2's, with constraints 3 and 4 **both lifted** — the
same widened pool the third square of a refill uses today. A prospective
node may therefore appear anywhere that holds no node, holds no ship, is not
adjacent to a node and is not a planet or beside one, the outer edge and the
corners included.

The draw is weighted. For a candidate square `s`, with `a` the node's
**anchor** — its charged node when it has one, and its remaining prospective
node when it does not:

    w(s) = d(s, a) + min over x in S of d(s, x)

where `d` is Chebyshev distance and `S` is every square belonging to any
**other** node, charged or prospective alike. When `S` is empty — only the
first node of the deal — the second term is 0.

**A square on the outer edge has its weight halved**: row 1 or 15, column A
or O. `d(s, a)` is never below 2, because an adjacent square is illegal, so
`w` is always positive and needs no positivity floor of the kind §3.2's
formula carries.

The first term is the control and ranges up to 14: it pushes a node's
prospective square a long way from the node itself, so a steal is a real
relocation rather than a shuffle. The second term ranges about 2 to 5 and is
deliberately the smaller of the two — it is a prop-up for a square in an
empty region, and is expected to be irrelevant most of the time.

**The opening deal** places each node's first prospective square the way
today's deal places a charged node: drawn uniformly from the **strict**
pool, one at a time, each seeing the squares already placed. Once all of
them are down, each node's second prospective is drawn by the weighted rule
above. The order is fixed and must not change, because a recorded game
replays by replaying the seed.

Measured over 20,000 simulated deals against the real board — twelve
planets, their neighbours, and seven ships in the way:

| | 3 nodes | 4 nodes | 5 nodes |
| --- | --- | --- | --- |
| Deals needing §3.2's spacing fallback | 0 | 0 | 0 |
| Mean distance between a node's two squares | 6.8 | 6.9 | 7.0 |
| Second square on the outer edge | 29% | 31% | 33% |

Without the outer-edge halving those last figures are 43%, 44% and 45%, so
the penalty is doing real work: the rim stays available, and stops being the
likeliest place for a node to end up.

### The five colours

Nodes are told apart by colour and by nothing else, so the game needs five
that survive being small, side by side, on a dark board:

**gold**, **silver** — bright and polished, not the dark grey the depleted
artwork uses today — **mid blue**, **purple**, and **off white**.

The list is ordered, so a four-node game takes the first four and a
three-node game the first three. Silver and off white are the pair most at
risk of reading alike, and the exact values are settled by looking at them
on the board rather than by choosing them here: the implementation carries a
step whose whole purpose is that back-and-forth with the owner.

Under STEAL the charged node's ball is also **smaller** than it is today —
mid-range and leaning small, about 48 against today's 70 in the marker's own
100-unit square — so that five coloured balls on one board read as marks
rather than as a wash of colour. That figure is a starting value for the
owner's eye and is settled in the same step as the colours. The other three
playstyles keep today's ball exactly.

### What STEAL switches off

- **Priorities, rotation and the queue** (§8.2). There is no priority 1, 2
  or 3, nothing rotates, and no refill of three ever happens. Planets and
  rotators rotate nothing, and **no rotators are laid down**.
- **The countdown on a charged node** (§8.3). A held node has no countdown,
  shows no number, and never depletes beneath its holder.
- **The depleted state entirely** (§8.1, §8.3, §8.5). No node is ever
  depleted, so no ship is ever trapped, nothing needs relieving (§8.6 step
  7), and there is no square on the board a move may not end on.
- **End-of-turn charging** (§8.6 steps 4 and 5). Nothing charges at a turn
  end, and there is no shortfall to fill. Of the end-of-turn sequence, only
  step 1, power, and step 2, energy, run at all.

## What does not change

- **The other three playstyles.** Continuous, planet and dedicated play
  exactly as they do today, rotators, countdowns, depletion and all.
  Nothing in §8.1–§8.6 changes for them beyond the pointers that say STEAL
  is different, and nothing about how they look on the board changes.
- **Movement**, its costs and its shapes, and the freedom to fly over any
  node. The one change is that a **prospective** node becomes a legal place
  to land — under STEAL only.
- **Combat**, including the rule that a ship on a charged node can neither
  attack nor be attacked, which is what makes landing on a prospective the
  only way to dislodge a holder.
- **Planets**: power, returning to a planet after a fight, returning by
  choice, and the planet bonus.
- **Energy** (§8.4): simple or bonus, priced by the charged nodes a player
  stands on when their turn ends.
- **Rounds, the clock, the end of the game**, and seeded replay — every
  draw STEAL makes comes from the same seeded stream.

## Effect on the game

A node under the other three playstyles is a timer. You reach it, you hold
it for six of your turns, it dies under you and traps you, and the board
hands out a fresh one somewhere else. What a player competes for is arrival
— the queue tells you where the next node is coming, and the game is a race
to be standing there.

A node under STEAL is a **position**. It pays for as long as you keep it,
and the only thing that can take it away is an opponent's ship reaching a
square you can both see from the moment it is drawn. The game stops being a
race to arrive and becomes a question of what you leave uncovered: every
held node on the board advertises exactly one square that loses it, and with
four nodes there are four such squares at any moment, scattered a mean of
seven squares from the nodes they threaten.

**Holding is cheap and therefore contested.** Nothing expires, so a player
who takes two nodes early and defends them collects every turn for the rest
of the game. The counterweight is that defending means standing near a
prospective square rather than on the node, and a ship standing off the node
is a ship that can be attacked — so with combat on, the two halves of the
game pull against each other in a way they never have.

**Leaving is a coin flip you hand the board.** Walk off a node and it does
not merely stop paying: it reverts to two prospective squares, so the
opponent gets two chances at it instead of one — and so do you. A holder who
wants to be somewhere else is giving up a certainty for a race.

**The opening is a land grab.** Nothing is charged, nobody scores, and eight
or ten prospective squares sit on an empty board. The first few rounds are
about which of them a fleet can reach, and a player who spends the opening
refuelling has conceded the early economy entirely.

**Relocating your own node is a real option and probably an expensive one.**
It costs a move, it puts your ship on a square the opponent has had no time
to approach, and it redraws the prospective square — but it also gives up
whatever position you had, seven squares away on average. Whether that trade
is ever worth taking is exactly the kind of thing that wants playing rather
than reasoning about.

**Colour is load-bearing.** With four nodes there are eight coloured squares
on the board and the only thing saying which prospective threatens which
node is that they match. This is knowingly accepted and recorded as
accessibility debt (`CLAUDE.md`, Accessibility during pre-release).

## In scope

### 1. The rules edit, first and on its own

`doc/ruleset/rules.md` goes from **0.38** to **0.39**, with a changelog
entry, in its own commit ahead of the code. This is a gameplay change and
would be a tag candidate; tagging stays on hold (`CLAUDE.md`).

- **Section 8.2's choice is renamed and widened.** "How the priorities
  rotate is chosen before play begins" becomes the **node playstyle**:
  continuous, planet, dedicated or steal. The three rotation settings keep
  their text word for word; a sentence says that steal is a different game
  of nodes and points at the new section 8.7.
- **A new section 8.7, `Steal`**, after 8.6, holds the whole variant: the
  node as a colour with two squares, Open and Held, the claim rule, the exit
  rule, the anchored weighted draw with its outer-edge halving, the opening
  deal, and an explicit list of what 8.1–8.6 no longer apply. Putting it in
  one section rather than threading conditions through six keeps the other
  three playstyles' text readable, the way section 3.3 keeps rotators out of
  section 3.1.
- **Sections 8.1, 8.2, 8.3, 8.5 and 8.6** each gain a pointer saying which
  of their contents section 8.7 replaces. Section 8.1's "three states"
  becomes two under steal; section 8.6 gains the statement that under steal
  only steps 1 and 2 run.
- **Section 3.2** gains a paragraph for the steal draw, alongside the
  existing refill draw: the widened pool, the two-term weight and the
  outer-edge halving.
- **Section 3.3** says rotators do not exist under steal.
- **Section 6** says that under steal a **prospective** node is a legal
  place to land and that landing on one is the claim, and that no other
  square on the board is closed, there being no depleted node to close one.
- **Section 2** gains **prospective node** as a word, defined as the steal
  variant's waiting square — distinct from an **inactive node**, which keeps
  its meaning under the other three playstyles.
- **Sections 9 and 10**, and section 1's overview, are checked: the list of
  what is chosen before play says node playstyle, and the overview no longer
  implies a node always ends.

### 2. The rename, on its own and with no behaviour change

Every name in the code and the tests that says node rotation comes to say
node playstyle, the start screen's legend included. This lands as its own
commit; the fourth setting does not exist yet and nothing behaves
differently.

### 3. The setting and the game it plays

STEAL joins the playstyle choice, last; PLANET stays the default. A STEAL
game is dealt as described above, takes and loses nodes by the two events
above, draws its prospective squares by the weighted rule above, and runs an
end of turn that does nothing but pay power and energy.

### 4. What the player sees

- **Colour**, as set out above: the five, in order, a node's charged ball
  and its prospective rings in the same one.
- **Prospective nodes always show three rings**; there are no priorities to
  distinguish.
- **A smaller charged ball** under STEAL, and today's ball everywhere else.
- **The board**, the accessible grid's square labels, and the live region
  carry the steal: a sentence naming the square taken, the square given up
  and, where there was one, the ship left standing.
- **The Quick Guide** gains a headed section of its own, **STEALING
  NODES**, with a diagram, and the existing NODE LIFECYCLE and NEW CHARGED
  NODE SELECTION sections gain a clause saying they describe the other three
  playstyles. The latter's closing sentence says **Node playstyle** rather
  than Inactive node rotation.
- **`README.md`** is reviewed against the branch and updated if warranted.

### 5. The colour and size gate

One step exists purely to settle the palette and the ball size with the
owner, looking at a running board rather than at a document. It is expected
to take more than one pass, and it is where silver against off white is
judged.

### 6. The accessibility note

`doc/plan/00000021-accessibility-tech-debt/known-issues.md` gains an entry
for story 101: which prospective square belongs to which node is carried by
colour alone, with no non-colour distinction on the board and nothing in the
accessible grid's labels tying a prospective square to its node.

## Out of scope

- **Any non-colour distinction between nodes** — no shapes, no numbers, no
  letters on a prospective square. Colour is the whole of it, and the
  accessibility note records what that costs.
- **A highlight that pairs a prospective with its node** on hover or on
  selection. A later story may want one; this one does not build it.
- **Changing the other three playstyles** in any way, including their
  artwork and including tuning them against steal.
- **Retuning anything against steal's economy.** Scoring, game lengths and
  the clock all stand as they are, even though a held node now pays
  indefinitely.
- **More than one prospective node per node while Held.** Two squares per
  node is the whole structure.
- **Making steal the default.** PLANET stays.
- **A distance cap on the draw.** The weight is the whole of the placement
  rule; nothing forbids a short pair or a very long one.
- **An engine, or any evaluation of whether steal is balanced.** It is being
  built to be played.

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.39**, and the changelog has
  one entry for it.
- The start screen's fifth group reads **Node playstyle** and offers
  CONTINUOUS, PLANET, DEDICATED, STEAL, with PLANET checked.
- A game started on CONTINUOUS, PLANET or DEDICATED plays and looks exactly
  as it does on `main`.
- A STEAL game opens with no charged node, and with twice the chosen node
  count in prospective squares, each node's two squares in one colour and
  each showing three rings.
- Moving a ship onto a prospective square charges it, colours it, leaves the
  node's other square gone, and puts a fresh prospective of that colour
  elsewhere on the board.
- A ship holding a node collects every turn and never depletes, over a full
  game length.
- Moving the opponent's ship onto that node's prospective square takes the
  node: the old square is bare, and the ship that held it is standing on an
  ordinary square and can move next turn.
- Walking a holder off its node leaves the square bare and puts a second
  prospective of that colour on the board.
- Moving a holder onto its own node's prospective relocates the node, and
  the node is still Held afterwards.
- No node is ever depleted in a STEAL game, no ship is ever trapped, and no
  countdown number is ever drawn.
- No rotators appear in a STEAL game, and landing on a planet rotates
  nothing.
- A STEAL game plays to its last round and ends normally, and a recorded
  STEAL game replays exactly.
- At five nodes, the five colours are tellable apart at board scale, and a
  prospective square is tellable from a charged one at a glance.
- The Quick Guide has six headed sections, STEALING NODES among them with
  its diagram.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary). They also say **node** for a position on the
  board; **prospective node** is new in this story and is a rules word, not
  a planning-only one.
- The rules edit is one commit, ahead of the code, and there is **one**
  version bump on this branch however many later rules edits it needs.
- The rename in section 2 is its own commit and touches a lot of files for
  no behaviour change; keeping it separate is what makes the steal commits
  readable.
- The placement figures above were measured over 20,000 simulated deals
  against the real board geometry. They belong in
  `doc/ruleset/tech-notes.md` once the draw is implemented, alongside the
  existing refill figures.
- Manual checks worth making once it runs: whether a held node paying
  indefinitely makes a 90-round STEAL game a foregone conclusion by round
  20, and whether the opening land grab leaves a fleet that refuels first
  too far behind to recover.
