// The Additional nodes symbol an advanced bonus draws beneath its planet
// (steal.md §10): a node's three rings, in the same geometry a prospective
// node's own marker draws them (`NodeMarker.tsx`), but each ring in a
// different colour rather than one node's own single signal colour — since
// this symbol stands for every node gaining a ring, not any one of them.

import {
  INACTIVE_RING_RADII,
  INACTIVE_RING_STROKE_WIDTH,
} from "../board/nodeMarkerGeometry";
import type { PlayerMatchingSetting } from "../rules/playerMatching";
import { advancedBonusSymbolColors } from "./advancedBonusColors";
import "./AdditionalNodesSymbol.css";

export interface AdditionalNodesSymbolProps {
  readonly playerMatching: PlayerMatchingSetting;
}

export function AdditionalNodesSymbol({
  playerMatching,
}: AdditionalNodesSymbolProps) {
  const colors = advancedBonusSymbolColors(playerMatching);
  return (
    <svg
      className="additional-nodes-symbol"
      viewBox="8 8 84 84"
      aria-hidden="true"
    >
      {INACTIVE_RING_RADII.map((radius, index) => (
        <circle
          key={radius}
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke={colors[index]}
          strokeWidth={INACTIVE_RING_STROKE_WIDTH}
        />
      ))}
    </svg>
  );
}
