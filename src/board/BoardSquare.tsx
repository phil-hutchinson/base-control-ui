// One square's stacked contents: a planet's drawing beneath everything else,
// then the node marker or the rotator mark beneath any ship standing on it
// (a square carries at most one of the three - rules.md §3.2, §3.3), then
// the node's countdown number (rules.md §8.3) above the ship, then, during
// ship selection, a legal destination or a legal attack target's marking,
// sharing the square in a single-cell grid rather than absolute positioning
// (see BoardSquare.css). The selected ship's own square carries no drawing
// at all - only its accessible name says "selected". A destination's mark
// draws a free move's disc or, when the move costs power, that many fuel
// bars in its place; a target's mark always draws its ring, because the
// ring is what tells an attack from a move, and adds the same bars inside
// it when the shot costs power. The bars are the same mark a ship's own
// power gauge draws on its hull (rules.md §6, §7), in the interaction
// accent rather than a side's colour, because they belong to the "you are
// choosing a move" layer, not to whichever ship stands on the square.
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
import type { PowerLevel } from "../rules/power";
import { ShipModel } from "../ships/ShipModel";
import {
  GAUGE_BAR_LENGTH,
  GAUGE_BAR_STROKE_WIDTH,
  GAUGE_BAR_UNDERLAY_STROKE_WIDTH,
  GAUGE_UNDERLAY_COLOR,
} from "../ships/shipArt";
import { Planet } from "./Planet";
import type { PlanetArt } from "./planetArt";
import { NodeMarker } from "./NodeMarker";
import { RotatorMarker } from "./RotatorMarker";
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
   * Whether the square holds a rotator (rules.md §3.3), independent of
   * `nodeState` and `isPlanet` — a square is at most one of the three, but
   * that is a fact about the board, not something this component enforces.
   */
  readonly hasRotator?: boolean;
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

// The vertical gap between stacked fuel bars: the hull gauge's own row
// spacing, GAUGE_SLOT_POSITIONS' two rows sitting at y 10 and y 26 (16
// apart) - so a stack of bars reads as rows of the same gauge, not a new
// spacing invented for the board.
const COST_BAR_ROW_SPACING = 16;

/**
 * The y position of each bar in a stack of `count` bars, centred on the
 * square's centre (50) in the 0-100 viewBox: one bar sits at 50; more bars
 * spread outward from there, `COST_BAR_ROW_SPACING` apart.
 */
function costBarPositions(count: number): readonly number[] {
  const offset = (count - 1) / 2;
  return Array.from(
    { length: count },
    (_, index) => 50 + (index - offset) * COST_BAR_ROW_SPACING,
  );
}

/**
 * A move or attack's price, drawn as that many of the hull gauge's own bar
 * (rules.md §6, §7) - the same double stroke, a dark underlay then the
 * interaction accent on top, round-capped, so the mark reads as the same
 * object as the gauge rather than a second notation for the same thing.
 * The accent is `currentColor`, never a side's colour, because the bar says
 * what the move costs, not whose ship is moving.
 */
function CostBarStack({ cost }: { readonly cost: number }) {
  return (
    <g strokeLinecap="round">
      {costBarPositions(cost).map((y, index) => (
        <g key={index} data-cost-bar={index}>
          <line
            x1={50 - GAUGE_BAR_LENGTH / 2}
            y1={y}
            x2={50 + GAUGE_BAR_LENGTH / 2}
            y2={y}
            stroke={GAUGE_UNDERLAY_COLOR}
            strokeWidth={GAUGE_BAR_UNDERLAY_STROKE_WIDTH}
          />
          <line
            x1={50 - GAUGE_BAR_LENGTH / 2}
            y1={y}
            x2={50 + GAUGE_BAR_LENGTH / 2}
            y2={y}
            stroke="currentColor"
            strokeWidth={GAUGE_BAR_STROKE_WIDTH}
          />
        </g>
      ))}
    </g>
  );
}

/**
 * A free destination's small solid disc, or, when the move costs power, that
 * many fuel bars in its place - the same bar the ship's own power gauge
 * draws on its hull.
 */
function DestinationMark({ cost }: { readonly cost: PowerLevel }) {
  return (
    <svg
      className="board-square__mark board-square__mark--destination"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {cost === 0 ? (
        <circle
          cx={50}
          cy={50}
          r={DESTINATION_DISC_RADIUS}
          fill="currentColor"
        />
      ) : (
        <CostBarStack cost={cost} />
      )}
    </svg>
  );
}

/**
 * A large hollow ring marking a square the selected ship may legally
 * attack, centred on the square so it reads around an enemy ship icon
 * rather than under one. Distinct from the destination's small solid disc
 * by both shape and size, so the two survive greyscale. The ring is always
 * drawn, even when the shot is free, because the ring is what tells an
 * attack from a move; when the shot costs power, the same fuel bars a
 * destination shows are drawn inside it, over the enemy ship.
 */
function TargetMark({ cost }: { readonly cost: PowerLevel }) {
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
      {cost > 0 && <CostBarStack cost={cost} />}
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
  hasRotator,
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
      {hasRotator && <RotatorMarker />}
      {occupant && <ShipModel side={occupant.side} power={occupant.power} />}
      {countdownNumber !== undefined && (
        <NodeCountdown
          number={countdownNumber}
          color={nodeState === "depleted" ? "white" : "black"}
        />
      )}
      {mark?.kind === "destination" && <DestinationMark cost={mark.cost} />}
      {mark?.kind === "target" && <TargetMark cost={mark.cost} />}
      {condition === "cannot-move-or-attack" && <CannotMoveOrAttackMark />}
    </div>
  );
}
