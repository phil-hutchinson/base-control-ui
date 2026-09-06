# Base Control — Play in Your Browser

Base Control is a game for two players. Each of you commands a fleet of five
or six ships — you choose the size before play begins, with six the standard
game — on a 15 x 15 board, competing for the handful of contested nodes that
light up across it. Hold a node and it pays you energy every turn. The player
with the most energy at the end wins.

Each ship carries power, a reserve it spends on every move and every attack. A
short step in any direction is free; the longest moves — two squares in a line,
or a new L-shaped move that turns a corner — cost more, and a ship is always
free to take a cheaper move if that is all its reserve can pay for. Only an
enemy ship blocks the path; a ship flies straight over its own side. The only
way to refill is to sit on a planet: at the end of its owner's turn a ship
parked on one gains a point of power, or two if it is the only one of that
player's ships still topping up power on a planet at that moment — a ship
already full doesn't count — up to a maximum of six. An attack costs its
attacker the same price as the move it used to strike, while the ship being
attacked keeps whatever power it had. A ship holding a node cannot be attacked
while it holds it. A fight has no winner: both ships involved are pushed back
to a planet, chosen at random from wherever the board has one standing empty,
carrying whatever power they had, and fly again from there. Ships are never
destroyed.

Nodes do not last. Standing on one burns it down faster than leaving it alone,
but walking away costs it nothing — a node someone abandons stays lit and keeps
burning at its slower pace, there for either player to reach. Either way it
eventually runs out and, once it has wound all the way down, it is gone for good
— and in that same instant a brand new node is born somewhere else on the board,
so the map itself keeps reshaping as the game runs and you will not know where
the next one will appear until it does. A depleted node costs its owner energy
every turn a ship stays on it and gives nothing back, so it usually pays to
move on — the only place a ship's power comes back is a planet.

This is the game's web app. It runs entirely in your browser — nothing to
install, no account, no server.

> **Status:** early development. The app now plays a whole game, from the
> opening position to the final score. Opening it shows a start screen, not the
> board: the game's name, a choice of how many ships a side (six or five, six
> to start), a choice of how many rounds the game lasts (thirty, forty-five,
> sixty or ninety, thirty to start), a choice of a clock (unlimited, or six,
> four or two seconds a turn, unlimited to start) and a PLAY button. Changing
> any of the three choices starts nothing — the board only appears once PLAY is
> pressed, dealt with the choices you made. A clock is each player's own time
> for the whole game, not per turn — a thirty-round game at six seconds a turn
> gives each of you three minutes to spend however you like across your turns.
> A player who runs out passes every turn from then on, and once both players
> have run out the game ends there and then; running out is not a loss, since
> energy still decides who wins. A smaller fleet starts from fewer of the
> board's fourteen starting squares, leaving the rest empty; every starting
> square is an ordinary square, whether or not a ship stands there — it gives a
> ship nothing and protects it from nothing, so ships are attackable from the
> very first turn. Twelve planets sit inside the board instead, at fixed
> squares, none of them on the outer edge, each showing one of twelve different
> drawings. Which drawing sits on which planet is dealt out afresh at the start
> of every game, so no two games look alike, but the twelve squares the planets
> occupy never change. A planet is not just scenery: a ship standing on one
> cannot attack and cannot be attacked, and gains back a point of power at the
> end of each of its owner's turns, or two if it is the only one of that
> player's ships still topping up power on a planet, up to a full six. A ship
> already full doesn't count towards that. Green goes first, and each player
> takes one action a turn — a move or an attack — by mouse or by keyboard.
> Every game deals a different opening board: it carries twelve nodes, at
> twelve squares drawn at random, and four of them are already lit — chosen at
> random too, and they do not all start fresh: some are already part-way
> through their life and will run out sooner than the rest. The eight that are
> not yet lit have not all been waiting the same length of time either, which
> is why some of them already look bigger and warmer than others on your very
> first turn. After that the board keeps itself topped up to four lit nodes,
> lighting new ones at random as older ones run out — and a node that has been
> waiting longer is more likely to be picked next, which shows in how it looks:
> a node waiting to be lit grows and brightens the longer it waits. A ship may
> stop anywhere it can reach, including a node that is not yet lit, and can
> camp there for as long as its owner likes while it waits to light. A node's
> glow shifts as it burns down, so you can see roughly how much life it has
> left, and it runs out at a random pace — faster while a ship is sitting on it
> than while it stands empty. A ship left standing on a node that has just run
> out simply stays there — it is never forced to move, and its owner is free to
> spend their next turn however they like. Staying is no longer free, though: a
> depleted node costs its owner energy at the end of every one of their turns
> and gives nothing back, so leaving is usually worth an action, even though
> nothing forces it. A depleted node does not relight where it was: once it has
> finished depleting it disappears for good, and that very instant a new node,
> not yet lit, is born somewhere else on the board, at a square chosen at
> random. From that moment the square the old node stood on goes back to being
> an ordinary empty square — a ship still parked there simply finds itself
> standing on ordinary ground, keeping whatever power it had and paying nothing
> more. The board always carries twelve nodes this way, but never the same
> twelve squares for long — the map you finish a long game on is not the map
> you started it on, and a node is never drawn on a planet, and all but never
> right next to one. A fight has no winner: both ships involved — the attacker
> and the ship it attacked — are sent to planets chosen at random from
> whichever planets are standing empty, each keeping whatever power it carried,
> so neither of you can know in advance where either will end up. A planet is
> where a ship recovers: it gains a point of power at the end of each of its
> owner's turns, or two if it is the only one of that player's ships still
> topping up power on a planet, up to a full six — a ship already full doesn't
> count towards that. A ship attacks exactly as far as it moves, and a ship
> holding a node can neither attack nor be attacked while it stands there. A
> node also pays energy at the end of each turn to the player sitting on it,
> and holding several at once pays far more than holding them one at a time
> would — and sitting on several depleted nodes at once costs far more in the
> same way. The two are counted separately rather than against each other, so a
> turn can pay you and charge you at once. The app keeps score and shows it,
> along with how many nodes each player holds, how many depleted nodes they are
> sitting on, and which round the game is in. Once the game reaches the number
> of rounds you chose, it ends: the player with the most energy wins, an equal
> score is a draw, and the "New Game" button returns you to the start screen
> with the same choices still set, ready to play again. There is still no way
> to save or record a game and no computer opponent to play against. The
> project is being built up story by story.

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
