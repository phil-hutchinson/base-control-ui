// One square's stacked contents: a planet's drawing beneath everything else,
// then the node marker beneath any ship standing on it, then the node's
// countdown number (rules.md §8.3) above the ship, then, during ship
// selection, a legal destination or a legal attack target's marking, sharing
// the square in a single-cell grid rather than absolute positioning (see
// BoardSquare.css). The selected ship's own square carries no drawing at
// all - only its accessible name says "selected". A fight has one outcome,
// so the target ring is a plain cue rather than a prediction; what attacking
// here does is spoken in the square's accessible name, not drawn.
//
// A planet's drawing is drawn whether or not the square is occupied - there
// is no occupancy condition anywhere below. A ship simply draws over it, as
// it already does over a node marker.
//
// A ship's condition and the selection mark are separate, independently
// optional fields, so a square can carry either, both, or neither. The only
// condition is a ship that can neither move nor attack — a pinned ship — and
// it is drawn dampened, with a hollow bar at the square's bottom edge.

import type { CSSProperties } from "react";
import type { ShipCondition, SquareMark, SquareOccupant } from "./squareLabel";
import type { NodeState } from "../rules/nodes";
import type { NodePriority } from "../rules/nodeQueue";
import { ShipModel } from "../ships/ShipModel";
import { Planet } from "./Planet";
import type { PlanetArt } from "./planetArt";
import { NodeMarker } from "./NodeMarker";
import { NodeCountdown } from "./NodeCountdown";
import "./BoardSquare.css";

export interface BoardSquareProps {
  readonly isPlanet: boolean;
  readonly squareName: string;
  /** Present if and only if `isPlanet` is true. */
  readonly planet?: PlanetArt;
  readonly nodeState?: NodeState;
  readonly cyclePosition?: number;
  readonly priority?: NodePriority;
  /**
   * The countdown number a charged or trapped node shows (rules.md §8.3, see
   * `../rules/countdown`'s `countdownNumber`), or `undefined` when the node
   * shows none: a charged node with no countdown, an exit node, or no node
   * at all. Its colour follows `nodeState` — black on `charged`, white on
   * `depleted` — so callers do not have to state the colour separately.
   */
  readonly countdownNumber?: number;
  readonly occupant?: SquareOccupant;
  readonly condition?: ShipCondition;
  readonly mark?: SquareMark;
}

// Geometry for the markings, in the same 0-100 viewBox ShipModel and
// NodeMarker use, so they scale with the square exactly as those do.
const DESTINATION_DISC_RADIUS = 9;
const TARGET_RING_RADIUS = 32;
const TARGET_RING_STROKE_WIDTH = 6;
const CONDITION_BAR_WIDTH = 30;
const CONDITION_BAR_HEIGHT = 5;
const CONDITION_BAR_BOTTOM_INSET = 8;
const CONDITION_BAR_STROKE_WIDTH = 2;
const DAMPENED_OPACITY = 0.45;

/** A small solid disc marking a square the selected ship may legally move to. */
function DestinationMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--destination"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle cx={50} cy={50} r={DESTINATION_DISC_RADIUS} fill="currentColor" />
    </svg>
  );
}

/**
 * A large hollow ring marking a square the selected ship may legally
 * attack, centred on the square so it reads around an enemy ship icon
 * rather than under one. Distinct from the destination's small solid disc
 * by both shape and size, so the two survive greyscale.
 */
function TargetMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--target"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle
        cx={50}
        cy={50}
        r={TARGET_RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={TARGET_RING_STROKE_WIDTH}
      />
    </svg>
  );
}

/** A hollow bar at the square's bottom edge, marking a ship that can neither move nor attack. */
function CannotMoveOrAttackMark() {
  return (
    <svg
      className="board-square__mark board-square__mark--cannot-move-or-attack"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <rect
        x={50 - CONDITION_BAR_WIDTH / 2}
        y={100 - CONDITION_BAR_BOTTOM_INSET - CONDITION_BAR_HEIGHT}
        width={CONDITION_BAR_WIDTH}
        height={CONDITION_BAR_HEIGHT}
        fill="none"
        stroke="currentColor"
        strokeWidth={CONDITION_BAR_STROKE_WIDTH}
      />
    </svg>
  );
}

/** One square's visible contents: a node marker, a ship, and a selection marking, each if present. */
export function BoardSquare({
  isPlanet,
  squareName,
  planet,
  nodeState,
  cyclePosition,
  priority,
  countdownNumber,
  occupant,
  condition,
  mark,
}: BoardSquareProps) {
  const classNames = ["board-square"];
  if (isPlanet) {
    // No stylesheet rule reads this - it exists only as a query hook for
    // tests to find a planet square.
    classNames.push("board-square--planet");
  }
  const isDampened = condition === "cannot-move-or-attack";
  if (isDampened) {
    classNames.push("board-square--dampened");
  }

  // Threads DAMPENED_OPACITY into BoardSquare.css as the one place it is
  // defined, rather than duplicating the number in the stylesheet.
  const style = isDampened
    ? ({ "--dampened-opacity": DAMPENED_OPACITY } as CSSProperties)
    : undefined;

  return (
    <div className={classNames.join(" ")} style={style}>
      {planet && <Planet planet={planet} />}
      {nodeState && (
        <NodeMarker
          state={nodeState}
          squareName={squareName}
          cyclePosition={cyclePosition}
          priority={priority}
        />
      )}
      {occupant && <ShipModel side={occupant.side} power={occupant.power} />}
      {countdownNumber !== undefined && (
        <NodeCountdown
          number={countdownNumber}
          color={nodeState === "depleted" ? "white" : "black"}
        />
      )}
      {mark === "destination" && <DestinationMark />}
      {mark === "target" && <TargetMark />}
      {condition === "cannot-move-or-attack" && <CannotMoveOrAttackMark />}
    </div>
  );
}
