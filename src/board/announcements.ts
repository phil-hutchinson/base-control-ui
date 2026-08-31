// Player-facing wording (rules.md §5, §6, §8, §9): turns a session event
// (`../game/session.ts`) into the sentence the live region speaks, a game
// state into the turn indicator's sentence, and a finished game's result
// into words for the HUD. Kept out of components so the wording can be
// unit-tested on its own. The players' vocabulary throughout: "turn" and
// "node", never "ply" or "hub".

import { squareName } from "../rules/board";
import {
  chargedNodesHeldBy,
  dormantSitesOccupiedBy,
  MAX_DORMANT_SITES_PRICED,
} from "../rules/energy";
import type {
  EndOfTurnEffect,
  EnergyCollectedEffect,
  EnergyPenaltyEffect,
  PowerGainedEffect,
  PowerLostEffect,
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
import { MAX_POWER, MIN_POWER } from "../rules/power";
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

/** "standing on 2 dormant sites", "standing on 1 dormant site", "standing on
 * no dormant sites" — for the HUD's hidden score sentence. Named even when
 * zero (§8.4), so the sentence keeps one shape whether a side is paying or
 * not. */
function dormantSitesOccupiedPhrase(count: number): string {
  if (count === 0) {
    return "standing on no dormant sites";
  }
  return `standing on ${count} dormant ${count === 1 ? "site" : "sites"}`;
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
 * All of a sequence's power gains as one clause, naming the squares once
 * rather than repeating a sentence per ship. A ship reaching the maximum of
 * 4 is named as such. True of a ship on a dormant site or in a bay alike —
 * the clause never names which.
 */
function powerGainedClause(effects: readonly PowerGainedEffect[]): string {
  const side = capitalize(effects[0].side);
  const atMax = effects
    .filter((effect) => effect.power === MAX_POWER)
    .map((effect) => squareName(effect.square));

  if (effects.length === 1) {
    const [effect] = effects;
    const square = squareName(effect.square);
    return effect.power === MAX_POWER
      ? `${side} ship at ${square} gained a point of power, reaching the maximum of 4.`
      : `${side} ship at ${square} gained a point of power, now on ${effect.power}.`;
  }

  const squares = effects.map((effect) => squareName(effect.square));
  const base = `${side} ships at ${joinWithAnd(squares)} each gained a point of power.`;
  if (atMax.length === 0) {
    return base;
  }
  return `${base} ${joinWithAnd(atMax)} reached the maximum of 4.`;
}

/**
 * All of a sequence's power losses as one clause, the mirror of
 * `powerGainedClause`: the squares named once rather than repeating a
 * sentence per ship. A ship reaching 0 is named as such.
 */
function powerLostClause(effects: readonly PowerLostEffect[]): string {
  const side = capitalize(effects[0].side);
  const atFloor = effects
    .filter((effect) => effect.power === MIN_POWER)
    .map((effect) => squareName(effect.square));

  if (effects.length === 1) {
    const [effect] = effects;
    const square = squareName(effect.square);
    return effect.power === MIN_POWER
      ? `${side} ship at ${square} lost a point of power, reaching 0.`
      : `${side} ship at ${square} lost a point of power, now on ${effect.power}.`;
  }

  const squares = effects.map((effect) => squareName(effect.square));
  const base = `${side} ships at ${joinWithAnd(squares)} each lost a point of power.`;
  if (atFloor.length === 0) {
    return base;
  }
  return `${base} ${joinWithAnd(atFloor)} reached 0.`;
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
 * A single turn's penalty (rules.md §8.4): one dormant site names itself,
 * several name their count and squares — the mirror of
 * `energyCollectedClause`. There is at most one of these per sequence, for
 * the same reason there is at most one collection.
 *
 * The count priced is capped at `MAX_DORMANT_SITES_PRICED` (§8.4), but every
 * occupied dormant site is still named — nothing is ranked or selected, the
 * cap just stops counting. So a side over the cap hears which sites it is
 * standing on and that five of them are penalised, not that some subset was
 * chosen.
 */
function energyPenaltyClause(effect: EnergyPenaltyEffect): string {
  const side = capitalize(effect.side);
  const squares = effect.squares.map((square) => squareName(square));
  const source =
    squares.length === 1
      ? `the dormant site at ${squares[0]}`
      : squares.length > MAX_DORMANT_SITES_PRICED
        ? `${squares.length} dormant sites at ${joinWithAnd(squares)}, five of which are penalised`
        : `${squares.length} dormant sites at ${joinWithAnd(squares)}`;
  return `${side} lost ${effect.amount} energy to ${source}, and now has ${effect.newTotal}.`;
}

/**
 * The clauses an end-of-turn sequence produced, in the order the sequence
 * produced them. All of a sequence's power losses are grouped into one
 * clause, and all of its power gains into another, the charged-node loss
 * clause ahead of the gain clause so it sits next to the energy-collection
 * sentence that follows it, both ahead of the rest. The two board-only site
 * transitions are judged separately: `site-charged` speaks — a node
 * appearing is the only way one ever appears now, and it is the thing both
 * players are racing towards — while `site-went-active` produces no clause
 * at all, because an active site is not a node, produces nothing and cannot
 * be stopped on, so a site quietly becoming eligible for the charge draw is
 * a board change, not a player event. A zero collection or a zero penalty
 * produces no effect at all (rules.md §8.4), so there is nothing here to
 * skip for either case — a turn that only pays reads as one sentence, and a
 * turn that collects and then pays reads as two, in that order, because the
 * sequence pushes the collection effect before the penalty effect.
 */
function endOfTurnClauses(effects: readonly EndOfTurnEffect[]): string[] {
  const clauses: string[] = [];

  const powerLosses = effects.filter(
    (effect): effect is PowerLostEffect => effect.type === "power-lost",
  );
  if (powerLosses.length > 0) {
    clauses.push(powerLostClause(powerLosses));
  }

  const powerGains = effects.filter(
    (effect): effect is PowerGainedEffect => effect.type === "power-gained",
  );
  if (powerGains.length > 0) {
    clauses.push(powerGainedClause(powerGains));
  }

  for (const effect of effects) {
    switch (effect.type) {
      case "power-gained":
      case "power-lost":
      case "site-went-active":
        break;
      case "energy-collected":
        clauses.push(energyCollectedClause(effect));
        break;
      case "energy-penalty":
        clauses.push(energyPenaltyClause(effect));
        break;
      case "node-ran-out":
        clauses.push(`The node at ${squareName(effect.square)} ran out.`);
        break;
      case "site-charged":
        clauses.push(`A new node charged at ${squareName(effect.square)}.`);
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
    (effect) => effect.type === "power-reset",
  );

  if (enteredBay) {
    return `${capitalize(event.side)} ship moved from ${from} into the ${to} bay and refilled to full power.`;
  }

  return `${capitalize(event.side)} ship moved from ${from} to ${to}.`;
}

/**
 * How an action's ply ended, if at all: if the ply ended, the end-of-turn
 * sequence's own clauses followed by the other side's turn, a further pass
 * (with its own end-of-turn clauses) if the resulting side had no legal
 * action at all, or how many actions the acting side has left if the ply
 * simply continues. Shared by a move and an attack — both end a ply the
 * same way. `tailClause`, when given, replaces the "whose turn is next"
 * clause — the substitution `announcementForSession` makes at the end of the
 * game.
 */
function actionEndingClauses(
  side: Side,
  effects: readonly (MoveEffect | AttackEffect)[],
  actionsRemaining: number,
  tailClause?: string,
): string[] {
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
    return [...plyEndedClauses, ...passSentenceClauses(passEffect, tailClause)];
  }

  if (plyEndedEffect !== undefined) {
    return [
      ...plyEndedClauses,
      tailClause ??
        `${turnPhrase(plyEndedEffect.sideToMove, ACTIONS_PER_PLY)}.`,
    ];
  }

  return [`${capitalize(side)} has ${actionsPhrase(actionsRemaining)} left.`];
}

function actionEndingClause(
  side: Side,
  effects: readonly (MoveEffect | AttackEffect)[],
  actionsRemaining: number,
): string {
  return actionEndingClauses(side, effects, actionsRemaining).join(" ");
}

/**
 * The fight's own sentence (rules.md §7), from the single `fight-resolved`
 * effect an attack always carries: who attacked whom, that both were beaten,
 * and the two bays they landed in, both keeping the power they were
 * carrying. There is no winner and no advance to report — every fight has
 * the same outcome.
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

  if (fight.returns.length !== 2) {
    throw new RangeError("a fight-resolved effect always carries two returns");
  }
  const [attackerReturn, defenderReturn] = fight.returns;
  return `${opening} and both were beaten. The attacker returned to the ${squareName(attackerReturn.to)} bay and the defender to the ${squareName(defenderReturn.to)} bay, both keeping the power they were carrying.`;
}

function rejectionSentence(event: RejectedEvent): string {
  const square = squareName(event.square);
  switch (event.reason) {
    case "not-your-ship":
      return "That is your opponent's ship. Choose one of your own.";
    case "ship-already-acted":
      return "That ship has already acted this turn. Choose another.";
    case "nothing-to-select":
      return `No ship on ${square}. Choose one of your own ships.`;
    case "out-of-range":
      return `${square} is out of range for the selected ship.`;
    case "path-blocked":
      return `Another ship is in the way of ${square}.`;
    case "destination-occupied":
      return `${square} is occupied.`;
    case "attacker-in-bay":
      return "A ship in a bay cannot attack. Move it out first.";
    case "attacker-on-charged-node":
      return "A ship holding a charged node cannot attack while it stands there. Move it off first.";
    case "target-in-bay":
      return "A ship in a bay cannot be attacked.";
    case "target-on-charged-node":
      return "A ship holding a charged node cannot be attacked.";
    case "target-out-of-range":
      return `${square} is out of attack range. A ship attacks as far as it moves, so a drained ship barely strikes at all — a ship at 0 power can only strike one square up, down, left or right.`;
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

/** "Green: 24 energy, 3 nodes held, standing on 2 dormant sites." — the HUD
 * score cell's hidden text. */
export function scoreSentence(state: GameState, side: Side): string {
  const nodesHeld = chargedNodesHeldBy(state, side).length;
  const dormantOccupied = dormantSitesOccupiedBy(state, side).length;
  return `${capitalize(side)}: ${state.energy[side]} energy, ${nodesHeldPhrase(nodesHeld)}, ${dormantSitesOccupiedPhrase(dormantOccupied)}.`;
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
