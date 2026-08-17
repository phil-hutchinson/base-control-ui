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

> **Status:** early development. Opening the app now shows the board in its
> starting position, with all fourteen ships lined up in their bays and the
> seventeen sites marked, five of them already nodes in play — but the app
> does not play the game yet. Nothing wakes, runs down, or changes, there are
> no turns, and there is no way to move or fight. The project is being built
> up story by story.

## The rules

The full rulebook is [doc/ruleset/rules.md](doc/ruleset/rules.md), with a
[change log](doc/ruleset/changelog.md) recording how it has changed. The game
is in active pre-release development and the rules are still moving — one
detail is deliberately left open, and is listed at the end of the rulebook.

## Development

The app is a TypeScript/React single-page application with no backend — it can
be served from any static file host. All development happens inside the VS Code
Dev Container the repo ships, which provisions the full toolchain
automatically; see [CONTRIBUTING.md](CONTRIBUTING.md) for setup and
conventions.
