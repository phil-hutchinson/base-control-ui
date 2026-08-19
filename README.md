# Base Control — Play in Your Browser

Base Control is a game for two players. Each of you commands a fleet of seven
ships on a 15 x 15 board, competing for the handful of contested nodes that
light up across it. Hold a node and it pays you influence every turn. The
player with the most influence at the end wins.

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

> **Status:** early development. The app now plays turns, moves ships and
> fights. Opening it shows the board in its starting position, with all
> fourteen ships lined up in their bays and the seventeen sites marked, five
> of them already nodes in play. Green goes first, and each player takes two
> actions a turn — a move or an attack — by mouse or by keyboard. No ship
> moves twice in the same turn, though a ship that has already moved can
> still attack. A node wakes the moment a ship touches it, landing on it or
> flying over it, and pays a shield to the player sitting on it at the end of
> each of their own turns. A node runs out after nine turns, and a new one
> wakes somewhere else at random to replace it. A ship still standing on a
> node that has just run out has to be moved clear before its owner can do
> anything else that turn. In a fight the ship carrying more shields wins and
> the beaten one is pushed back to a bay with none — but winning costs the
> winner a shield more than the loser was carrying, and the winner holds its
> ground rather than advancing, so clearing a node and then taking it needs
> both of a turn's actions. Two ships carrying the same shields both go home.
> The bay a beaten ship returns to travels around the edge of the board as
> the game goes on, and the board marks where it is. Nothing is scored yet
> and the game does not end. The project is being built up story by story.

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
