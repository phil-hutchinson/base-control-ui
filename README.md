# Base Control — Play in Your Browser

Base Control is a game for two players. Each of you commands a fleet of five,
six or seven ships — you choose the size before play begins — on a 15 x 15
board, competing for the handful of contested nodes that light up across it.
Hold a node and it pays you energy every turn. The player with the most
energy at the end wins.

Your ships carry shields, but a shield does nothing good for the ship
carrying it — every one it carries only slows it down. Sitting on a node
builds shields up, so the longer a ship holds one, the harder it becomes to
move, and to leave. A ship holding a node cannot be attacked while it holds
it. A fight has no winner: both ships involved are pushed back to a bay on
the edge of the board, stripped of their shields, and fly again from there.
Ships are never destroyed.

Nodes do not last. Standing on one burns it down faster than leaving it
alone, but walking away costs it nothing — a node someone abandons stays lit
and keeps burning at its slower pace, there for either player to reach.
Either way it eventually goes dark, and the board lights up a new one
somewhere else on its own, at the end of a turn, so you will not know where
until it happens. A dead site is dangerous ground: a ship left sitting on one
costs its owner energy and a shield every turn it stays, so it usually pays to
move on.

This is the game's web app. It runs entirely in your browser — nothing to
install, no account, no server.

> **Status:** early development. The app now plays a whole game, from the
> opening position to the final score. Opening it shows a start screen, not the
> board: the game's name, a choice of how many ships a side (five, six or seven,
> seven to start), a choice of how many rounds the game lasts (thirty, fifty,
> seventy-five or a hundred, thirty to start) and a PLAY button. Changing either
> choice starts nothing — the board only appears once PLAY is pressed, dealt
> with the choices you made. A smaller fleet starts from fewer of the board's
> fourteen bays, leaving the rest empty; an empty bay plays no differently from
> any other. Green goes first, and each player takes one action a turn — a move
> or an attack — by mouse or by keyboard. Nodes light up on their own: at the
> end of every turn the board tops itself back up to five charged sites among
> the seventeen, picking the new ones at random as older ones run out — and a
> site that has been waiting longer is more likely to be picked next, which
> shows in how it looks: a site that is waiting to be lit grows and brightens
> the longer it waits. A ship may stop anywhere it can reach, including a site
> that is not yet lit, and can camp there for as long as its owner likes while
> it waits to light. A lit node pays a shield to the player sitting on it at the
> end of each of their own turns. A node's glow shifts as it burns down, so you
> can see roughly how much life it has left, and it runs out at a random pace —
> faster while a ship is sitting on it than while it stands empty. Once it runs
> out it stays dark for a while before the board can light it again. A ship left
> standing on a node that has just run out simply stays there — it is never
> forced to move, and its owner is free to spend their next turn however they
> like. Staying is no longer free, though: once a site goes dark it costs its
> owner a shield and some energy at the end of every one of their turns, so
> leaving is usually worth an action, even though nothing forces it. A fight has
> no winner: both ships involved — the attacker and the ship it attacked — are
> sent to bays chosen at random from whichever bays are standing empty, stripped
> of every shield they carried, so neither of you can know in advance where
> either will end up. A ship attacks exactly as far as it moves, and a ship
> holding a node can neither attack nor be attacked while it stands there. A
> node also pays energy at the end of each turn to the player sitting on it, and
> holding several at once pays far more than holding them one at a time would —
> and sitting on several dead sites at once costs far more in the same way. The
> two are counted separately rather than against each other, so a turn can pay
> you and charge you at once. The app keeps score and shows it, along with how
> many nodes each player holds, how many dead sites they are sitting on, and
> which round the game is in. Once the game reaches the number of rounds you
> chose, it ends: the player with the most energy wins, an equal score is a
> draw, and the "New Game" button returns you to the start screen with the same choices
> still set, ready to play again. There is still no way to save or record a game and
> no computer opponent to play against. The project is being built up story by
> story.

## The rules

The full rulebook is [doc/ruleset/rules.md](doc/ruleset/rules.md), with a
[change log](doc/ruleset/changelog.md) recording how it has changed. The game
is in active pre-release development and the rules are still moving, so it is
worth a fresh look now and again.

## Development

The app is a TypeScript/React single-page application with no backend — it can
be served from any static file host. All development happens inside the VS Code
Dev Container the repo ships, which provisions the full toolchain
automatically; see [CONTRIBUTING.md](CONTRIBUTING.md) for setup and
conventions.
