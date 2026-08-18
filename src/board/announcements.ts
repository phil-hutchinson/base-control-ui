// Player-facing wording (rules.md §5, §6, §8): turns a session event
// (`../game/session.ts`) into the sentence the live region speaks, and a
// game state into the turn indicator's sentence. Kept out of components so
// the wording can be unit-tested on its own. The players' vocabulary
// throughout: "turn" and "node", never "ply" or "hub".

import { squareName } from "../rules/board";
import type { EndOfTurnEffect, ShieldGainedEffect } from "../rules/endOfTurn";
import type { Side } from "../rules/fleet";
import { ACTIONS_PER_PLY, type GameState } from "../rules/gameState";
import type { MoveEffect, PassEffect } from "../rules/ply";
import { MAX_SHIELDS } from "../rules/shields";
import type { MovedEvent, RejectedEvent, SessionEvent } from "../game/session";

function capitalize(side: Side): string {
  return side === "green" ? "Green" : "Red";
}

function actionsPhrase(count: number): string {
  return `${count} ${count === 1 ? "action" : "actions"}`;
}

function movesPhrase(count: number): string {
  return `${count} ${count === 1 ? "move" : "moves"}`;
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
 * The clauses an end-of-turn sequence produced, in the order the sequence
 * produced them. All of a sequence's shield gains are grouped into one
 * clause; `site-cooled` produces no clause at all — a depleted site quietly
 * returning to the dormant pool is a board change, not a player event.
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
      case "site-cooled":
        break;
      case "node-ran-out":
        clauses.push(`The node at ${squareName(effect.square)} ran out.`);
        break;
      case "ship-stranded":
        clauses.push(
          `${capitalize(effect.side)} ship at ${squareName(effect.square)} is stranded and must be moved clear next turn.`,
        );
        break;
      case "site-woken":
        clauses.push(
          effect.wokeInto === "charged"
            ? `A new node woke at ${squareName(effect.square)}, already charged because a ship was standing there.`
            : `A new node woke at ${squareName(effect.square)}.`,
        );
        break;
    }
  }

  return clauses;
}

function passSentence(effect: PassEffect): string {
  return [
    `${capitalize(effect.side)} has no legal move, so the turn passes.`,
    ...endOfTurnClauses(effect.endOfTurn),
    `${turnPhrase(effect.sideToMove, ACTIONS_PER_PLY)}.`,
  ].join(" ");
}

/**
 * "What the move was": the ship's journey, and — when it charged a site on
 * the way — whether that was by landing on it or by flying over it. Either
 * side's ship reads the same way; the side is already named at the start of
 * the sentence.
 *
 * The bay case is checked first and returns early, so a move that both
 * charges a site en route and ends in a bay would announce only the bay.
 * That combination cannot happen on the current site layout — asserted by
 * `noMoveBothChargesAndEndsInABay` in `src/rules/siteSpacing.test.ts` — so
 * this ordering is safe only as long as that test keeps passing.
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

  const chargeEffect = event.effects.find(
    (effect): effect is Extract<MoveEffect, { type: "site-charged" }> =>
      effect.type === "site-charged",
  );
  if (chargeEffect === undefined) {
    return `${capitalize(event.side)} ship moved from ${from} to ${to}.`;
  }
  if (chargeEffect.reach === "landed-on") {
    return `${capitalize(event.side)} ship moved from ${from} to ${to} and charged the node.`;
  }
  return `${capitalize(event.side)} ship moved from ${from} to ${to}, flying over ${squareName(chargeEffect.square)} and charging the node.`;
}

/**
 * How a move's ply ended, if at all: the end-of-turn sequence's own clauses,
 * then the other side's turn if the ply ended, a further pass (with its own
 * end-of-turn clauses) if the resulting side had no legal move at all, or
 * how many actions the mover has left if the ply simply continues.
 */
function moveEndingClause(event: MovedEvent): string {
  const plyEndedEffect = event.effects.find(
    (effect): effect is Extract<MoveEffect, { type: "ply-ended" }> =>
      effect.type === "ply-ended",
  );
  const plyEndedClauses =
    plyEndedEffect !== undefined
      ? endOfTurnClauses(plyEndedEffect.endOfTurn)
      : [];

  const passEffect = event.effects.find(
    (effect): effect is Extract<MoveEffect, { type: "ply-passed" }> =>
      effect.type === "ply-passed",
  );
  if (passEffect !== undefined) {
    return [...plyEndedClauses, passSentence(passEffect)].join(" ");
  }

  if (plyEndedEffect !== undefined) {
    return [
      ...plyEndedClauses,
      `${turnPhrase(plyEndedEffect.sideToMove, ACTIONS_PER_PLY)}.`,
    ].join(" ");
  }

  return `${capitalize(event.side)} has ${actionsPhrase(event.actionsRemaining)} left.`;
}

function rejectionSentence(event: RejectedEvent): string {
  const square = squareName(event.square);
  switch (event.reason) {
    case "not-your-ship":
      return "That is your opponent's ship. Choose one of your own.";
    case "ship-already-moved":
      return "That ship has already moved this turn. Choose another.";
    case "another-ship-stranded":
      return "A stranded ship must be moved clear this turn. Choose one of those instead.";
    case "nothing-to-select":
      return `No ship on ${square}. Choose one of your own ships.`;
    case "out-of-range":
      return `${square} is out of range for the selected ship.`;
    case "path-blocked":
      return `Another ship is in the way of ${square}.`;
    case "destination-occupied":
      return `${square} is occupied.`;
    case "destination-dormant-site":
      return `${square} is a dormant site — a ship cannot stop there.`;
    case "destination-depleted-site":
      return `${square} is a depleted site — a ship cannot stop there.`;
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
      return `${capitalize(event.side)} ship at ${squareName(event.square)} selected. ${movesPhrase(event.destinationCount)} available.`;
    case "selection-cleared":
      return "Selection cleared.";
    case "moved":
      return `${moveSentence(event)} ${moveEndingClause(event)}`;
    case "ply-passed":
      return passSentence(event);
    case "rejected":
      return rejectionSentence(event);
  }
}

/** "Green's turn — 2 actions left", singular at one action. */
export function turnIndicatorText(state: GameState): string {
  return `${capitalize(state.sideToMove)}'s turn — ${actionsPhrase(state.actionsRemaining)} left`;
}
