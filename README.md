# Base Control — Play in Your Browser

Base Control is a game for two players. Each of you commands a fleet of five
or six ships — you choose the size before play begins, with six the standard
game — on a 15 x 15 board, competing for the handful of contested nodes that
light up across it. Hold a node and it pays you energy every turn. The player
with the most energy at the end wins.

Each ship carries power, a reserve it spends on every move and every attack. A
single step up, down, left or right is free; a diagonal step costs 1; two
squares in a line, or a new L-shaped move that turns a corner, cost 2 — and a
ship is always free to take a cheaper move if that is all its reserve can pay
for. Only an enemy ship blocks the path; a ship flies straight over its own
side. The only way to refill is to sit on a planet: at the end of its owner's
turn a ship parked on one gains a point of power, or two if it is the only one
of that player's ships still topping up power on a planet at that moment — a
ship already full doesn't count — up to a maximum of six. An attack costs its
attacker the same price as the move it used to strike, while the ship being
attacked keeps whatever power it had. A ship holding a node cannot be attacked
while it holds it. A fight has no winner: both ships involved are pushed back
to a planet, chosen at random from wherever the board has one standing empty
— the ship that was attacked carrying whatever power it had, and the attacker
already having paid for its shot — and fly again from there. Ships are never
destroyed.

A node doesn't wear down on its own: it just sits there, lit, for as long as
it takes until a ship lands on it and starts its countdown. From that moment
it lasts six of the holder's own turns, with a number in the middle counting
them down, before it runs out and traps the ship still standing there.
Walking away instead ends the node immediately, the moment you leave — there
is no way to abandon a node and come back to it later, and your opponent
cannot inherit it either. New nodes only appear when a node lights: the three
still waiting are swept away together and three fresh ones appear elsewhere,
so the map itself keeps reshaping as the game runs and you will not know
where the next three will land until they do. A ship trapped when its node
runs out stays stuck — it can neither move nor attack, and cannot be attacked
— for five more of its own turns, then it is freed just before its next turn,
ready to move right away. A node left behind by a ship walking off blocks its
square for two turns and then it too is gone. A ship can fly over a waiting
or a depleted node, but cannot land on either; the only place a ship's power
comes back is a planet.

This is the game's web app. It runs entirely in your browser — nothing to
install, no account, no server.

> **Status:** early development. The app now plays a whole game, from the opening
> position to the final score. Opening it shows a start screen, not the board: the
> game's name, a choice of how many ships a side (six or five, six to start), a
> choice of how many rounds the game lasts (thirty, forty-five, sixty or ninety,
> thirty to start), a choice of a clock (unlimited, or six, four or two seconds a
> turn, unlimited to start) and a PLAY button. Changing any of the three choices
> starts nothing — the board only appears once PLAY is pressed, dealt with the
> choices you made. A clock is each player's own time for the whole game, not per
> turn — a thirty-round game at six seconds a turn gives each of you three minutes
> to spend however you like across your turns. A player who runs out passes every
> turn from then on, and once both players have run out the game ends there and
> then; running out is not a loss, since energy still decides who wins. A smaller
> fleet starts from fewer of the board's fourteen starting squares, leaving the
> rest empty; every starting square is an ordinary square, whether or not a ship
> stands there — it gives a ship nothing and protects it from nothing, so ships
> are attackable from the very first turn. Twelve planets sit inside the board
> instead, at fixed squares, none of them on the outer edge, each showing one of
> twelve different drawings. Which drawing sits on which planet is dealt out
> afresh at the start of every game, so no two games look alike, but the twelve
> squares the planets occupy never change. A planet is not just scenery: a ship
> standing on one cannot attack and cannot be attacked, and gains back a point of
> power at the end of each of its owner's turns, or two if it is the only one of
> that player's ships still topping up power on a planet, up to a full six. A ship
> already full doesn't count towards that. Green goes first, and each player takes
> one action a turn — a move or an attack — by mouse or by keyboard. Every game
> deals a different opening board: it opens with seven nodes — four already lit
> and three still waiting. The four lit ones are chosen at random too, but none
> of them carries a countdown yet, so at the start of the game all four are
> exactly as fresh as each other — a lit node only starts running down once a
> ship lands on it. Each waiting node carries one, two or three rings, and the
> one with three rings is the one that lights next. A ship can fly straight
> over a waiting node, but landing on one has to wait until it lights. On a
> turn when nothing lights, the rings shift round — the single becomes a
> double, the double becomes a triple, and the triple drops back to a single —
> so you can read not just what lights next but what lights the turn after
> that. Whatever runs out during a turn is made up at the end of it by
> lighting from the waiting three, highest rings first, so the board is always
> brought back to four lit nodes by the time your turn begins. Land a ship on
> a lit node and a black number appears in its middle: six, counting down by
> one at the end of each of your own turns while the glow itself grows
> steadily brighter, until it runs out on your sixth turn there and traps you.
> Leave a node you are holding instead and it ends immediately, right there in
> the middle of your turn — you cannot hand it back, and your opponent cannot
> pick it up after you — though it stays on the board, dim, for a couple more
> turns before it disappears for good. A ship can fly over any node that isn't
> lit; it simply cannot land on one, so the only way to end up trapped is to
> have been standing on a node when it ran out, never by choosing to land
> there. A ship caught this way is trapped for five more of its own turns,
> counted down by a white number the same way, and is freed just before its
> own next turn, ready to move right away. If every one of a player's ships is
> ever trapped at once, the game will not leave them stuck passing turn after
> turn: it ends the depleted node with the least life left among those that
> would set a ship free to move again, right away. A node that finishes its
> countdown, or is freed this way, simply leaves the board for good — nothing
> appears where it stood, and any ship that was trapped there is free again,
> keeping whatever power it had. New nodes only
> appear when a node lights: the whole waiting trio is swept away at once and
> three fresh ones appear elsewhere, spread apart from the lit nodes and from each
> other, so the map itself keeps reshaping as the game runs and you will not know
> where the next three will appear until they do. A node is never drawn on a
> planet, and all but never right next to one. A fight has no winner: both ships
> involved — the attacker and the ship it attacked — are sent to planets chosen at
> random from whichever planets are standing empty; the ship that was attacked
> keeps whatever power it carried, and the attacker arrives having already paid
> for its shot, so neither of you can know in advance where either will end up. A
> planet is where a ship recovers: it gains a point of power at the end of each of
> its owner's turns, or two if it is the only one of that player's ships still
> topping up power on a planet, up to a full six — a ship already full doesn't
> count towards that. A ship attacks exactly as far as it moves, and a ship
> holding a node can neither attack nor be attacked while it stands there. A node
> also pays energy at the end of each turn to the player sitting on it, and
> holding several at once pays far more than holding them one at a time would. The
> app keeps score and shows it, along with how many nodes each player holds and
> which round the game is in. Once the game reaches the number of rounds you
> chose, it ends: the player with the most energy wins, an equal score is a draw,
> and the "New Game" button returns you to the start screen with the same choices
> still set, ready to play again. There is still no way to save or record a game
> and no computer opponent to play against. The project is being built up story by
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
