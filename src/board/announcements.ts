// Player-facing wording (rules.md §5, §6): turns a session event (`../game/session.ts`)
// into the sentence the live region speaks, and a game state into the turn
// indicator's sentence. Kept out of components so the wording can be
// unit-tested on its own. The players' vocabulary throughout: "turn", never
// "ply".

import { squareName } from "../rules/board";
import type { Side } from "../rules/fleet";
import { ACTIONS_PER_PLY, type GameState } from "../rules/gameState";
import type { MoveEffect } from "../rules/ply";
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
 * How a move's ply ended, if at all: the other side's turn if the ply ended,
 * a further pass if the resulting side had no legal move at all, or how many
 * actions the mover has left if the ply simply continues.
 */
function moveEndingClause(event: MovedEvent): string {
  const passEffect = event.effects.find(
    (effect): effect is Extract<MoveEffect, { type: "ply-passed" }> =>
      effect.type === "ply-passed",
  );
  if (passEffect !== undefined) {
    return `${capitalize(passEffect.side)} has no legal move, so the turn passes. ${turnPhrase(passEffect.sideToMove, ACTIONS_PER_PLY)}.`;
  }

  const plyEndedEffect = event.effects.find(
    (effect): effect is Extract<MoveEffect, { type: "ply-ended" }> =>
      effect.type === "ply-ended",
  );
  if (plyEndedEffect !== undefined) {
    return `${turnPhrase(plyEndedEffect.sideToMove, ACTIONS_PER_PLY)}.`;
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
      return `${capitalize(event.side)} has no legal move, so the turn passes. ${turnPhrase(event.sideToMove, ACTIONS_PER_PLY)}.`;
    case "rejected":
      return rejectionSentence(event);
  }
}

/** "Green's turn — 2 actions left", singular at one action. */
export function turnIndicatorText(state: GameState): string {
  return `${capitalize(state.sideToMove)}'s turn — ${actionsPhrase(state.actionsRemaining)} left`;
}
