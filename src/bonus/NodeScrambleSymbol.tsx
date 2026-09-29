// The Node scramble symbol an activity bonus draws beneath its planet
// (steal.md §10): the rotator's own recycling mark (`RotatorMarker.tsx`),
// but each of its three arcs in a different colour rather than the
// rotator's own single colour — since this symbol stands for every node's
// waiting squares being shuffled between the nodes, not one rotator
// turning.

import {
  ARC_SPAN_DEGREES,
  ARC_START_ANGLES,
  ARC_STROKE_WIDTH,
  arcPath,
  arrowheadPoints,
} from "../board/rotatorMarkerGeometry";
import type { PlayerMatchingSetting } from "../rules/playerMatching";
import { activityBonusSymbolColors } from "./activityBonusColors";
import "./NodeScrambleSymbol.css";

export interface NodeScrambleSymbolProps {
  readonly playerMatching: PlayerMatchingSetting;
}

export function NodeScrambleSymbol({
  playerMatching,
}: NodeScrambleSymbolProps) {
  const colors = activityBonusSymbolColors(playerMatching);
  return (
    <svg
      className="node-scramble-symbol"
      viewBox="6 6 88 88"
      aria-hidden="true"
    >
      {ARC_START_ANGLES.map((startDegrees, index) => (
        <g key={startDegrees}>
          <path
            d={arcPath(startDegrees)}
            fill="none"
            stroke={colors[index]}
            strokeWidth={ARC_STROKE_WIDTH}
            strokeLinecap="round"
          />
          <polygon
            points={arrowheadPoints(startDegrees + ARC_SPAN_DEGREES)}
            fill={colors[index]}
          />
        </g>
      ))}
    </svg>
  );
}
