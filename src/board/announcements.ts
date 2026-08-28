// Player-facing wording (rules.md §5, §6, §8, §9): turns a session event
// (`../game/session.ts`) into the sentence the live region speaks, a game
// state into the turn indicator's sentence, and a finished game's result
// into words for the HUD. Kept out of components so the wording can be
// unit-tested on its own. The players' vocabulary throughout: "turn" and
// "node", never "ply" or "hub".

import { squareName } from "../rules/board";
import { chargedNodesHeldBy } from "../rules/energy";
import type {
  EndOfTurnEffect,
  EnergyCollectedEffect,
  ShieldGainedEffect,
} from "../rules/endOfTurn";
import type { Side } from "../rules/fleet";
import { ACTIONS_PER_PLY, type GameState } from "../rules/gameState";
import {
  currentRound,
  gameResult,
  isGameOver,
  type GameResult,
} from "../rules/gameLength";
import type {
  AttackEffect,
  FightResolvedEffect,
  MoveEffect,
  PassEffect,
  PlyEndedEffect,
} from "../rules/ply";
import { MAX_SHIELDS } from "../rules/shields";
import type { NodeVacatedEffect } from "../rules/vacating";
import type {
  AttackedEvent,
  MovedEvent,
  RejectedEvent,
  Session,
  SessionEvent,
} from "../game/session";

function capitalize(side: Side): string {
  return side === "green" ? "Green" : "Red";
}

function actionsPhrase(count: number): string {
  return `${count} ${count === 1 ? "action" : "actions"}`;
}

function movesPhrase(count: number): string {
  return `${count} ${count === 1 ? "move" : "moves"}`;
}

function targetsPhrase(count: number): string {
  return `${count} ${count === 1 ? "target" : "targets"}`;
}

function shieldsPhrase(count: number): string {
  return `${count} ${count === 1 ? "shield" : "shields"}`;
}

function roundsPhrase(count: number): string {
  return `${count} ${count === 1 ? "round" : "rounds"}`;
}

/** "3 nodes held", "1 node held", "no nodes held" — for the HUD's hidden score sentence. */
function nodesHeldPhrase(count: number): string {
  if (count === 0) {
    return "no nodes held";
  }
  return `${count} ${count === 1 ? "node" : "nodes"} held`;
}

/**
 * The selection sentence's counts clause (rules.md §5): both moves and
 * targets when both exist, whichever one exists alone, or a plain statement
 * that nothing is available.
 */
function selectionCountsPhrase(
  destinationCount: number,
  targetCount: number,
): string {
  if (destinationCount > 0 && targetCount > 0) {
    return `${movesPhrase(destinationCount)} and ${targetsPhrase(targetCount)} available.`;
  }
  if (destinationCount > 0) {
    return `${movesPhrase(destinationCount)} available.`;
  }
  if (targetCount > 0) {
    return `${targetsPhrase(targetCount)} available.`;
  }
  return "No actions available.";
}

/** "Green's turn, 2 actions left" — used inside announcements, not the indicator. */
function turnPhrase(side: Side, actionsRemaining: number): string {
  return `${capitalize(side)}'s turn, ${actionsPhrase(actionsRemaining)} left`;
}

/** "H8 and K5", "H8, K5 and E11" — a plain-language list, never an Oxford comma. */
function joinWithAnd(items: readonly string[]): string {
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * All of a sequence's shield gains as one clause, naming the squares once
 * rather than repeating a sentence per ship. A ship reaching the cap of 4 is
 * named as such.
 */
function shieldGainedClause(effects: readonly ShieldGainedEffect[]): string {
  const side = capitalize(effects[0].side);
  const atCap = effects
    .filter((effect) => effect.shields === MAX_SHIELDS)
    .map((effect) => squareName(effect.square));

  if (effects.length === 1) {
    const [effect] = effects;
    const square = squareName(effect.square);
    return effect.shields === MAX_SHIELDS
      ? `${side} ship at ${square} gained a shield, reaching the cap of 4.`
      : `${side} ship at ${square} gained a shield, now on ${effect.shields}.`;
  }

  const squares = effects.map((effect) => squareName(effect.square));
  const base = `${side} ships at ${joinWithAnd(squares)} each gained a shield.`;
  if (atCap.length === 0) {
    return base;
  }
  return `${base} ${joinWithAnd(atCap)} reached the cap of 4.`;
}

/**
 * A single turn's collection (rules.md §8.4): one node names itself, several
 * name their count and squares. There is at most one of these per sequence —
 * §8.4 pays once, for the count of nodes held, never once per node.
 */
function energyCollectedClause(effect: EnergyCollectedEffect): string {
  const side = capitalize(effect.side);
  const squares = effect.squares.map((square) => squareName(square));
  const source =
    squares.length === 1
      ? `the node at ${squares[0]}`
      : `${squares.length} nodes at ${joinWithAnd(squares)}`;
  return `${side} collected ${effect.amount} energy from ${source}, and now has ${effect.newTotal}.`;
}

/**
 * The clauses an end-of-turn sequence produced, in the order the sequence
 * produced them. All of a sequence's shield gains are grouped into one
 * clause. The two board-only site transitions are judged separately:
 * `site-charged` speaks — a node appearing is the only way one ever appears
 * now, and it is the thing both players are racing towards — while
 * `site-went-active` produces no clause at all, because an active site is
 * not a node, produces nothing and cannot be stopped on, so a site quietly
 * becoming eligible for the charge draw is a board change, not a player
 * event. A zero collection produces no `energy-collected` effect at all
 * (rules.md §8.4), so there is nothing here to skip for that case.
 */
function endOfTurnClauses(effects: readonly EndOfTurnEffect[]): string[] {
  const clauses: string[] = [];

  const shieldGains = effects.filter(
    (effect): effect is ShieldGainedEffect => effect.type === "shield-gained",
  );
  if (shieldGains.length > 0) {
    clauses.push(shieldGainedClause(shieldGains));
  }

  for (const effect of effects) {
    switch (effect.type) {
      case "shield-gained":
      case "site-went-active":
        break;
      case "energy-collected":
        clauses.push(energyCollectedClause(effect));
        break;
      case "node-ran-out":
        clauses.push(`The node at ${squareName(effect.square)} ran out.`);
        break;
      case "site-charged":
        clauses.push(`A new node charged at ${squareName(effect.square)}.`);
        break;
      case "ship-stranded":
        clauses.push(
          `${capitalize(effect.side)} ship at ${squareName(effect.square)} is stranded and must be moved clear next turn.`,
        );
        break;
    }
  }

  return clauses;
}

/**
 * A passed turn's clauses (rules.md §5), ending with `tailClause` — the next
 * side's turn by default, or `announcementForSession`'s game-over clause when
 * the pass was the game's last ply.
 */
function passSentenceClauses(
  effect: PassEffect,
  tailClause?: string,
): string[] {
  return [
    `${capitalize(effect.side)} has no legal action, so the turn passes.`,
    ...endOfTurnClauses(effect.endOfTurn),
    tailClause ?? `${turnPhrase(effect.sideToMove, ACTIONS_PER_PLY)}.`,
  ];
}

function passSentence(effect: PassEffect): string {
  return passSentenceClauses(effect).join(" ");
}

/**
 * "What the move was": the ship's journey, and whether it ended in a bay.
 * Either side's ship reads the same way; the side is already named at the
 * start of the sentence.
 */
function moveSentence(event: MovedEvent): string {
  const from = squareName(event.from);
  const to = squareName(event.to);
  const enteredBay = event.effects.some(
    (effect) => effect.type === "shields-reset",
  );

  if (enteredBay) {
    return `${capitalize(event.side)} ship moved from ${from} into the ${to} bay and lost its shields.`;
  }

  return `${capitalize(event.side)} ship moved from ${from} to ${to}.`;
}

/**
 * A node going dormant the moment the moving player's own action vacated it
 * (rules.md §8.7). This is a direct consequence of a choice the player just
 * made, unlike the silent `site-went-active`, so it speaks — a player who
 * never heard it would not learn that stepping off a node ends it.
 */
function nodeVacatedClause(effect: NodeVacatedEffect): string {
  return `The node at ${squareName(effect.square)} went dormant when the ${effect.side} ship left it.`;
}

/**
 * How an action's ply ended, if at all: first any nodes the action itself
 * vacated (rules.md §8.7), then the end-of-turn sequence's own clauses, then
 * the other side's turn if the ply ended, a further pass (with its own
 * end-of-turn clauses) if the resulting side had no legal action at all, or
 * how many actions the acting side has left if the ply simply continues.
 * Shared by a move and an attack — both end a ply the same way, and both can
 * vacate a node the same way. A fight can vacate two nodes at once, on a
 * drawn fight in which both ships stood on charged nodes. `tailClause`, when
 * given, replaces the "whose turn is next" clause — the substitution
 * `announcementForSession` makes at the end of the game.
 */
function actionEndingClauses(
  side: Side,
  effects: readonly (MoveEffect | AttackEffect)[],
  actionsRemaining: number,
  tailClause?: string,
): string[] {
  const vacatedClauses = effects
    .filter(
      (effect): effect is NodeVacatedEffect => effect.type === "node-vacated",
    )
    .map(nodeVacatedClause);

  const plyEndedEffect = effects.find(
    (effect): effect is PlyEndedEffect => effect.type === "ply-ended",
  );
  const plyEndedClauses =
    plyEndedEffect !== undefined
      ? endOfTurnClauses(plyEndedEffect.endOfTurn)
      : [];

  const passEffect = effects.find(
    (effect): effect is PassEffect => effect.type === "ply-passed",
  );
  if (passEffect !== undefined) {
    return [
      ...vacatedClauses,
      ...plyEndedClauses,
      ...passSentenceClauses(passEffect, tailClause),
    ];
  }

  if (plyEndedEffect !== undefined) {
    return [
      ...vacatedClauses,
      ...plyEndedClauses,
      tailClause ??
        `${turnPhrase(plyEndedEffect.sideToMove, ACTIONS_PER_PLY)}.`,
    ];
  }

  return [
    ...vacatedClauses,
    `${capitalize(side)} has ${actionsPhrase(actionsRemaining)} left.`,
  ];
}

function actionEndingClause(
  side: Side,
  effects: readonly (MoveEffect | AttackEffect)[],
  actionsRemaining: number,
): string {
  return actionEndingClauses(side, effects, actionsRemaining).join(" ");
}

/**
 * The winning attacker's advance clause (rules.md §7): where it ended up, or
 * that it held its ground when no square on the lane was legal to end on.
 */
function winnerAdvanceClause(
  winner: NonNullable<FightResolvedEffect["winner"]>,
): string {
  if (!winner.advanced) {
    return "It held its ground.";
  }

  return `It advanced to ${squareName(winner.square)} and took it.`;
}

/**
 * The fight's own sentence (rules.md §7), from the single `fight-resolved`
 * effect an attack always carries. The losing-attacker sentence reads as a
 * deliberate choice, not an error: §7 permits attacking a stronger enemy, and
 * stripping its shields at the cost of the attacker's own is a real tactic.
 */
function fightSentence(event: AttackedEvent): string {
  const fight = event.effects.find(
    (effect): effect is FightResolvedEffect => effect.type === "fight-resolved",
  );
  if (fight === undefined) {
    throw new RangeError(
      "an attacked event always carries a fight-resolved effect",
    );
  }

  const attackerSquare = squareName(fight.attacker.square);
  const defenderSquare = squareName(fight.defender.square);
  const attackerSide = capitalize(fight.attacker.side);
  const opening = `${attackerSide} ship at ${attackerSquare} attacked the ${fight.defender.side} ship at ${defenderSquare}`;

  if (fight.outcome === "mutual-return") {
    const [attackerReturn, defenderReturn] = fight.returns;
    return `${opening} and both were beaten. The attacker returned to the ${squareName(attackerReturn.to)} bay and the defender to the ${squareName(defenderReturn.to)} bay, both with no shields.`;
  }

  if (fight.winner === undefined) {
    throw new RangeError(
      "a decided fight always carries a winner: rules.md §7",
    );
  }

  if (fight.outcome === "attacker-won") {
    const [defenderReturn] = fight.returns;
    const cost = fight.defender.shields + 1;
    const advanceClause = winnerAdvanceClause(fight.winner);
    return `${opening} and won. ${advanceClause} The beaten ship returned to the ${squareName(defenderReturn.to)} bay with no shields. The fight cost ${shieldsPhrase(cost)}, leaving the winner on ${fight.winner.remainingShields}.`;
  }

  const [attackerReturn] = fight.returns;
  const cost = fight.attacker.shields + 1;
  return `${opening} and lost. The beaten ship returned to the ${squareName(attackerReturn.to)} bay with no shields. The fight cost the defender ${shieldsPhrase(cost)}, leaving it on ${fight.winner.remainingShields}.`;
}

function rejectionSentence(event: RejectedEvent): string {
  const square = squareName(event.square);
  switch (event.reason) {
    case "not-your-ship":
      return "That is your opponent's ship. Choose one of your own.";
    case "ship-already-acted":
      return "That ship has already acted this turn. Choose another.";
    case "another-ship-stranded":
      return "A stranded ship must be moved clear this turn. Only a move will free it — choose one of those.";
    case "nothing-to-select":
      return `No ship on ${square}. Choose one of your own ships.`;
    case "out-of-range":
      return `${square} is out of range for the selected ship.`;
    case "path-blocked":
      return `Another ship is in the way of ${square}.`;
    case "destination-occupied":
      return `${square} is occupied.`;
    case "destination-active-site":
      return `${square} is an active site — nothing has charged there yet, so a ship cannot stop there.`;
    case "destination-dormant-site":
      return `${square} is a dormant site — it has run out and is cooling down, so a ship cannot stop there.`;
    case "attacker-in-bay":
      return "A ship in a bay cannot attack. Move it out first.";
    case "target-in-bay":
      return "A ship in a bay cannot be attacked.";
    case "target-out-of-range":
      return `${square} is out of attack range. A ship attacks as far as it moves, so shields shorten its reach — a ship with four shields can only strike one square up, down, left or right.`;
    case "attack-path-blocked":
      return `Another ship stands in the way, so the attack cannot reach ${square}.`;
    // Unreachable through the board's own gesture — activating a friendly
    // ship re-selects it and activating an empty square is a move attempt —
    // but `attackRefusalReason` answers for every square, so both are worded.
    case "target-is-friendly":
      return "That is your own ship, not a target.";
    case "no-target-there":
      return `There is no ship on ${square} to attack.`;
    case "game-over":
      return "The game is over. Nothing further can be played.";
  }
}

/**
 * The sentence the live region speaks for the last thing that happened in a
 * session, or an empty string when nothing has happened yet.
 */
export function announcementFor(event: SessionEvent | undefined): string {
  if (event === undefined) {
    return "";
  }

  switch (event.type) {
    case "selected":
      return `${capitalize(event.side)} ship at ${squareName(event.square)} selected. ${selectionCountsPhrase(event.destinationCount, event.targetCount)}`;
    case "selection-cleared":
      return "Selection cleared.";
    case "moved":
      return `${moveSentence(event)} ${actionEndingClause(event.side, event.effects, event.actionsRemaining)}`;
    case "attacked":
      return `${fightSentence(event)} ${actionEndingClause(event.side, event.effects, event.actionsRemaining)}`;
    case "ply-passed":
      return passSentence(event);
    case "rejected":
      return rejectionSentence(event);
  }
}

/**
 * A finished game's result (rules.md §9): the winner and both final totals,
 * or a draw naming the shared total. Reused by the game-over clause below and
 * by the result panel.
 */
export function resultSentence(result: GameResult): string {
  if (result.outcome === "draw") {
    return `The game is a draw, ${result.energy.green} energy each.`;
  }

  if (result.winner === undefined) {
    throw new RangeError("a decided game always carries a winner: rules.md §9");
  }

  const winner = result.winner;
  const loser: Side = winner === "green" ? "red" : "green";
  return `${capitalize(winner)} wins, ${result.energy[winner]} energy to ${result.energy[loser]}.`;
}

/**
 * The clause substituted for "whose turn is next" once the game has ended
 * (rules.md §9): that the game is over, and its result.
 */
function gameOverClause(state: GameState): string {
  return `The game is over after ${roundsPhrase(state.lengthInRounds)}. ${resultSentence(gameResult(state))}`;
}

/**
 * The sentence the live region speaks for a session's last event, aware of
 * whether the game the session belongs to has ended. Before the end this is
 * exactly `announcementFor(session.lastEvent)`. Once the game is over, the
 * "whose turn is next" clause a finished ply or pass would otherwise end
 * with is **replaced** by the game-over clause — never appended after it, so
 * a screen reader never hears "Green's turn — 2 actions left" immediately
 * followed by "the game is over".
 */
export function announcementForSession(session: Session): string {
  const { state, lastEvent } = session;
  if (!isGameOver(state)) {
    return announcementFor(lastEvent);
  }

  if (lastEvent === undefined) {
    return "";
  }

  const tailClause = gameOverClause(state);

  switch (lastEvent.type) {
    case "moved":
      return `${moveSentence(lastEvent)} ${actionEndingClauses(lastEvent.side, lastEvent.effects, lastEvent.actionsRemaining, tailClause).join(" ")}`;
    case "attacked":
      return `${fightSentence(lastEvent)} ${actionEndingClauses(lastEvent.side, lastEvent.effects, lastEvent.actionsRemaining, tailClause).join(" ")}`;
    case "ply-passed":
      return passSentenceClauses(lastEvent, tailClause).join(" ");
    // A selection, its clearing, or a rejection never carries a "whose turn
    // is next" clause to replace — including the "game-over" rejection
    // itself, already worded above — so these are spoken exactly as
    // `announcementFor` would word them.
    case "selected":
    case "selection-cleared":
    case "rejected":
      return announcementFor(lastEvent);
  }
}

/** "Green: 24 energy, 3 nodes held." — the HUD score cell's hidden text. */
export function scoreSentence(state: GameState, side: Side): string {
  const nodesHeld = chargedNodesHeldBy(state, side).length;
  return `${capitalize(side)}: ${state.energy[side]} energy, ${nodesHeldPhrase(nodesHeld)}.`;
}

/** "35/100" — the HUD round counter's visible text, clamped at game over. */
export function roundCounterText(state: GameState): string {
  return `${currentRound(state)}/${state.lengthInRounds}`;
}

/** "Round 35 of 100." — the HUD round counter's spoken text. */
export function roundCounterSpokenText(state: GameState): string {
  return `Round ${currentRound(state)} of ${state.lengthInRounds}.`;
}

/** The result panel's heading, in sentence case; the panel uppercases it with CSS. */
export const GAME_OVER_HEADING = "Game over";

/**
 * "Green to play", or "Game over" once the game has ended (rules.md §9).
 * Stored in sentence case; `TurnIndicator.css` uppercases it for display.
 */
export function turnIndicatorText(state: GameState): string {
  if (isGameOver(state)) {
    return "Game over";
  }
  return `${capitalize(state.sideToMove)} to play`;
}
