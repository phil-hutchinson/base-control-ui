# Base Control — Play in Your Browser

Base Control is a game for two players. Each of you commands a fleet of seven
ships on a 15 x 15 board, competing for the handful of contested nodes that
light up across it. Hold a node and it pays you energy every turn. The
player with the most energy at the end wins.

Your ships carry shields. Shields win fights — but every shield a ship carries
slows it down, so the strongest ship on the board is also the slowest. Sitting
on a node builds shields up; winning a fight burns them off. Ships are never
destroyed: a ship that loses is pushed back to a bay on the edge of the board,
stripped of its shields, and flies again from there.

Nodes do not last. Each one runs down after a few turns and goes dark, and
another wakes somewhere else on the board — and you will not know where until
it happens.

This is the game's web app. It runs entirely in your browser — nothing to
install, no account, no server.

> **Status:** early development. The app now plays a whole game, from the
> opening position to the final score. Opening it shows the board in its
> starting position, with all fourteen ships lined up in their bays and the
> seventeen sites marked, five of them already nodes in play. Green goes
> first, and each player takes one action a turn — a move or an attack — by
> mouse or by keyboard. A node wakes the moment a ship touches it, landing
> on it or flying over it, and pays a shield to the player sitting on it at
> the end of each of their own turns. A node runs out after nine turns, and
> a new one wakes somewhere else at random to replace it. A ship still
> standing on a node that has just run out has to be moved clear, and that
> is what its owner's next turn is spent on. In a fight the ship carrying
> more shields wins and the beaten one is pushed back to a bay with none —
> but winning costs the winner a shield more than the loser was carrying.
> The attacking winner advances onto the square it just cleared, so a won
> fight can take a node outright, in a single action; and a ship attacks
> exactly as far as it moves, so heavy shields buy strength at the cost of
> reach. Two ships carrying the same shields both go home. The bay a beaten
> ship returns to travels around the edge of the board as the game goes on,
> and the board marks where it is. A node also pays energy at the end of
> each turn to the player sitting on it, and holding several at once pays
> far more than holding them one at a time would. The app keeps score and
> shows it, along with how many nodes each player holds and which round the
> game is in. After a hundred rounds the game ends: the player with the most
> energy wins, an equal score is a draw, and a button starts another game.
> There is still no way to save or record a game, no computer opponent to
> play against, and no way to choose how long a game runs. The project is
> being built up story by story.

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
