// Player-facing wording (rules.md §5, §6, §8, §9): turns a session event
// (`../game/session.ts`) into the sentence the live region speaks, a game
// state into the turn indicator's sentence, and a finished game's result
// into words for the HUD. Kept out of components so the wording can be
// unit-tested on its own. The players' vocabulary throughout: "turn" and
// "node", never "ply" or "hub".

import { isPlanet } from "../rules/planets";
import { type Square, squareName } from "../rules/board";
import { chargedNodesHeldBy } from "../rules/energy";
import type {
  EndOfTurnEffect,
  EnergyCollectedEffect,
  PowerGainedEffect,
  QueueRefilledEffect,
} from "../rules/endOfTurn";
import type { Side } from "../rules/fleet";
import { ACTIONS_PER_PLY, type GameState } from "../rules/gameState";
import { TOP_NODE_PRIORITY } from "../rules/nodeQueue";
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
  NodeSpentEffect,
  PassEffect,
  PlyEndedEffect,
} from "../rules/ply";
import { MAX_POWER, spendPower, type PowerLevel } from "../rules/power";
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

/** "a point of power" for 1, "2 points of power" for 2 — the only two amounts §3.1's rate ever produces. */
function powerAmountPhrase(amount: number): string {
  return amount === 1 ? "a point of power" : `${amount} points of power`;
}

/**
 * All of a sequence's power gains as one clause, naming the squares once
 * rather than repeating a sentence per ship. A ship reaching the maximum of
 * `MAX_POWER` is named as such. Only a ship on a planet ever gains power
 * (§3.1); a charged node no longer drains and a depleted node no longer
 * refills. Within one sequence the amount gained is always uniform, so the
 * grouped clause reads it off the first effect.
 */
function powerGainedClause(effects: readonly PowerGainedEffect[]): string {
  const side = capitalize(effects[0].side);
  const atMax = effects
    .filter((effect) => effect.power === MAX_POWER)
    .map((effect) => squareName(effect.square));

  if (effects.length === 1) {
    const [effect] = effects;
    const square = squareName(effect.square);
    const gained = powerAmountPhrase(effect.amount);
    return effect.power === MAX_POWER
      ? `${side} ship at ${square} gained ${gained}, reaching the maximum of ${MAX_POWER}.`
      : `${side} ship at ${square} gained ${gained}, now on ${effect.power}.`;
  }

  const squares = effects.map((effect) => squareName(effect.square));
  const gained = powerAmountPhrase(effects[0].amount);
  const base = `${side} ships at ${joinWithAnd(squares)} each gained ${gained}.`;
  if (atMax.length === 0) {
    return base;
  }
  return `${base} ${joinWithAnd(atMax)} reached the maximum of ${MAX_POWER}.`;
}

/**
 * A single turn's collection (rules.md §8.4): one node names itself, several
 * name their count and squares. There is at most one of these per sequence —
 * a turn's whole collection is announced as a single amount, however many
 * nodes it came from.
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
 * A charge sweeping the queue and dealing a fresh trio, as one sentence
 * (rules.md §8.2, §8.6 step 5): the nodes that were waiting are gone, new
 * ones are waiting in their place, and the priority-3 node among them is
 * named directly — the one piece of the rings a listener cannot see for
 * themselves.
 */
function queueRefilledClause(effect: QueueRefilledEffect): string {
  const gone =
    effect.discardedSquares.length > 0
      ? `The nodes waiting at ${joinWithAnd(effect.discardedSquares.map(squareName))} are gone.`
      : "Nothing was left waiting.";
  const newSquares = effect.newNodes.map((node) => squareName(node.square));
  const next = effect.newNodes.find(
    (node) => node.priority === TOP_NODE_PRIORITY,
  );
  const nextClause =
    next !== undefined ? ` ${squareName(next.square)} charges next.` : "";
  return `${gone} New nodes are waiting at ${joinWithAnd(newSquares)}.${nextClause}`;
}

/**
 * The clauses an end-of-turn sequence produced, in the order the sequence
 * produced them. All of a sequence's power gains are grouped into one
 * clause, ahead of the rest — there is no longer a power-loss clause to sit
 * it next to, since no end-of-turn step takes power away any more (§4.1).
 * `node-charged` speaks — a node becoming charged is the thing both players
 * are racing towards. `queue-refilled` speaks too, as one sentence for the
 * whole sweep: the queue a player was reading is gone and a new one has
 * taken its place. `node-retired` speaks for a node that simply leaves,
 * naming only its own square — nothing appears to replace it. `ship-trapped`
 * and `ship-freed` each speak too, right after the node event that caused
 * them, since a player needs to know a ship was caught or released, not
 * just that a node changed. `node-relief` speaks ahead of the `node-retired`
 * effect it caused, naming the side it relieved, so a player hears why that
 * node ended early, not just that it did. A zero collection produces no
 * effect at all (rules.md §8.4), so there is nothing here to skip for it —
 * a turn that collects nothing simply has no collection clause, and nothing
 * in this sequence ever takes energy away.
 */
function endOfTurnClauses(effects: readonly EndOfTurnEffect[]): string[] {
  const clauses: string[] = [];

  const powerGains = effects.filter(
    (effect): effect is PowerGainedEffect => effect.type === "power-gained",
  );
  if (powerGains.length > 0) {
    clauses.push(powerGainedClause(powerGains));
  }

  for (const effect of effects) {
    switch (effect.type) {
      case "power-gained":
        break;
      case "energy-collected":
        clauses.push(energyCollectedClause(effect));
        break;
      case "node-ran-out":
        clauses.push(`The node at ${squareName(effect.square)} ran out.`);
        break;
      case "ship-trapped":
        clauses.push(
          `The ${effect.side} ship at ${squareName(effect.square)} is trapped there until the node retires.`,
        );
        break;
      case "node-charged":
        clauses.push(`A new node charged at ${squareName(effect.square)}.`);
        break;
      case "queue-refilled":
        clauses.push(queueRefilledClause(effect));
        break;
      case "node-retired":
        clauses.push(`The node at ${squareName(effect.square)} is gone.`);
        break;
      case "ship-freed":
        clauses.push(
          `The ${effect.side} ship at ${squareName(effect.square)} is free again.`,
        );
        break;
      case "node-relief":
        clauses.push(
          `Every ${effect.side} ship was trapped, so the node at ${squareName(effect.square)} ended early.`,
        );
        break;
    }
  }

  return clauses;
}

/**
 * A passed turn's opening clause (rules.md §5, §10): "no legal action" or
 * "out of time", depending on why the turn passed.
 */
function passOpeningClause(effect: PassEffect): string {
  return effect.reason === "out-of-time"
    ? `${capitalize(effect.side)} is out of time, so the turn passes.`
    : `${capitalize(effect.side)} has no legal action, so the turn passes.`;
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
    passOpeningClause(effect),
    ...endOfTurnClauses(effect.endOfTurn),
    tailClause ?? `${turnPhrase(effect.sideToMove, ACTIONS_PER_PLY)}.`,
  ];
}

function passSentence(effect: PassEffect): string {
  return passSentenceClauses(effect).join(" ");
}

/**
 * What a move cost the moving ship, and what it has left (rules.md §6): an
 * orthogonal step is free and says so, rather than claiming a cost of
 * nothing.
 */
function moveCostClause(cost: PowerLevel, powerAfter: PowerLevel): string {
  return cost === 0
    ? `The move was free; it still has ${powerAfter} power.`
    : `The move cost ${cost} power, leaving ${powerAfter}.`;
}

/**
 * A charged node depleting the instant its holder left it (rules.md §8.3):
 * one sentence, naming the square, for the `node-spent` effect a departing
 * move carries.
 */
function nodeSpentClause(square: Square): string {
  return `The node at ${squareName(square)} ended when the ship left it.`;
}

/**
 * "What the move was": the ship's journey, whether it ended on a planet, what
 * the move cost (rules.md §6), and — between those and the action-ending
 * clauses — whether it spent a charged node by leaving it (§8.3). Either
 * side's ship reads the same way; the side is already named at the start of
 * the sentence.
 */
function moveSentence(event: MovedEvent): string {
  const from = squareName(event.from);
  const to = squareName(event.to);
  const journey = isPlanet(event.to)
    ? `${capitalize(event.side)} ship moved from ${from} onto the ${to} planet.`
    : `${capitalize(event.side)} ship moved from ${from} to ${to}.`;

  const nodeSpent = event.effects.find(
    (effect): effect is NodeSpentEffect => effect.type === "node-spent",
  );
  const nodeSpentClauseText =
    nodeSpent !== undefined ? ` ${nodeSpentClause(nodeSpent.square)}` : "";

  return `${journey} ${moveCostClause(event.cost, event.powerAfter)}${nodeSpentClauseText}`;
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
 * what the attack cost the attacker and what it has left, that the defender
 * kept the power it was carrying, and the two planets they landed on. There
 * is no winner and no advance to report — every fight has the same outcome.
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

  const attackerPowerAfter = spendPower(fight.attacker.power, fight.cost);
  const attackCostClause =
    fight.cost === 0
      ? `The attack was free; the attacker still has ${attackerPowerAfter} power.`
      : `The attack cost the attacker ${fight.cost} power, leaving ${attackerPowerAfter}.`;

  if (fight.returns.length !== 2) {
    throw new RangeError("a fight-resolved effect always carries two returns");
  }
  const [attackerReturn, defenderReturn] = fight.returns;
  return `${opening} and both were beaten. ${attackCostClause} The defender kept the power it was carrying. The attacker returned to the ${squareName(attackerReturn.to)} planet and the defender to the ${squareName(defenderReturn.to)} planet.`;
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
    case "ship-trapped":
      return "That ship is trapped on a depleted node and cannot move until the node goes.";
    case "out-of-range":
      return `${square} is out of range for the selected ship.`;
    case "cannot-afford":
      return `${square} costs more power than the selected ship has. A step up, down, left or right is free; a diagonal step costs 1; two squares or an L cost 2.`;
    case "path-blocked":
      return `An enemy ship is in the way of ${square}.`;
    case "destination-occupied":
      return `${square} is occupied.`;
    case "destination-uncharged-node":
      return `${square} holds a node that is not charged — a ship may fly over one, but cannot land on it.`;
    case "attacker-on-planet":
      return "A ship on a planet cannot attack. Move it off first.";
    case "attacker-on-charged-node":
      return "A ship holding a charged node cannot attack while it stands there. Move it off first.";
    case "attacker-on-depleted-node":
      return "A ship trapped on a depleted node cannot attack.";
    case "target-on-planet":
      return "A ship on a planet cannot be attacked.";
    case "target-on-charged-node":
      return "A ship holding a charged node cannot be attacked.";
    case "target-on-depleted-node":
      return "A ship trapped on a depleted node cannot be attacked.";
    case "target-out-of-range":
      return `${square} is not one of the shapes a ship can attack from here — an orthogonal or diagonal step, two squares orthogonally, or an L — whatever power it carries.`;
    case "cannot-afford-target":
      return `The selected ship does not have the power to strike ${square}. An orthogonal step is free, a diagonal costs 1, and two squares or an L cost 2.`;
    case "attack-path-blocked":
      return `An enemy ship stands in the way, so the attack cannot reach ${square}.`;
    // Unreachable through the board's own gesture — activating a friendly
    // ship re-selects it and activating an empty square is a move attempt —
    // but `attackRefusalReason` answers for every square, so both are worded.
    case "target-is-friendly":
      return "That is your own ship, not a target.";
    case "no-target-there":
      return `There is no ship on ${square} to attack.`;
    case "game-over":
      return "The game is over. Nothing further can be played.";
    case "out-of-time":
      return "Your clock has run out.";
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
 * (rules.md §9, §10): that the game is over, and its result. Worded for
 * whichever of the two endings actually happened — the rounds running out,
 * or both players running out of time before they did — so the sentence is
 * never false about a game that ended early on the clock.
 */
function gameOverClause(state: GameState): string {
  const endedOnTheClock = state.outOfTime.green && state.outOfTime.red;
  const endingClause = endedOnTheClock
    ? "The game is over: both players are out of time."
    : `The game is over after ${roundsPhrase(state.lengthInRounds)}.`;
  return `${endingClause} ${resultSentence(gameResult(state))}`;
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
