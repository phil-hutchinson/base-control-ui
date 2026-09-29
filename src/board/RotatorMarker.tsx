// The rotator's artwork (rules.md §3.3): a round recycling mark, drawn in
// the same square-level slot a node marker occupies (beneath any ship) and
// in its own colour, ROTATOR_COLOR. Purely decorative — a square's
// accessible name already says "rotator" (squareLabel.ts) — so, like every
// other piece of board art, it carries no title or description and is
// hidden from the accessibility tree.
//
// The mark's geometry — the three arcs and their arrowheads — lives in
// `rotatorMarkerGeometry.ts`, shared with the planet effects panel's
// Node scramble symbol.
//
// A rotator still on the board when another one is landed on and spent plays
// a turn animation instead of standing still (see `boardAnimations.ts`): the
// whole mark rotates clockwise by a third of a circle, which the arcs' own
// three-fold symmetry lands back on itself. It is drawn only while
// `turnAnimation` is given; without it, the mark's markup is unchanged from
// the plain artwork below.

import type { CSSProperties } from "react";
import type { RotatorTurnAnimation } from "./boardAnimations";
import {
  ARC_SPAN_DEGREES,
  ARC_START_ANGLES,
  ARC_STROKE_WIDTH,
  TURN_START_ANGLE_DEGREES,
  arcPath,
  arrowheadPoints,
} from "./rotatorMarkerGeometry";
import { ROTATOR_COLOR } from "./squareArt";
import "./RotatorMarker.css";

interface RotatorMarkerProps {
  /**
   * Present while this rotator is playing its turn animation
   * (`boardAnimations.ts`) because another rotator was just landed on and
   * spent.
   */
  readonly turnAnimation?: RotatorTurnAnimation;
}

/** The rotator's mark: six of these may be on the board at once under the dedicated setting (rules.md §3.3). */
export function RotatorMarker({ turnAnimation }: RotatorMarkerProps) {
  const className = turnAnimation
    ? "rotator-marker rotator-marker--turning"
    : "rotator-marker";
  const style = turnAnimation
    ? ({
        "--rotator-turn-angle": `${TURN_START_ANGLE_DEGREES}deg`,
      } as CSSProperties)
    : undefined;

  return (
    <svg
      key={turnAnimation?.runId}
      className={className}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={style}
    >
      {ARC_START_ANGLES.map((startDegrees) => (
        <g key={startDegrees}>
          <path
            d={arcPath(startDegrees)}
            fill="none"
            stroke={ROTATOR_COLOR}
            strokeWidth={ARC_STROKE_WIDTH}
            strokeLinecap="round"
          />
          <polygon
            points={arrowheadPoints(startDegrees + ARC_SPAN_DEGREES)}
            fill={ROTATOR_COLOR}
          />
        </g>
      ))}
    </svg>
  );
}
