// One square's stacked contents: the site marker beneath any ship standing
// on it, in a single-cell grid so the two can share the square without
// absolute positioning (see BoardSquare.css).

import type { SquareOccupant } from "./squareLabel";
import type { SiteState } from "../rules/sites";
import { ShipIcon } from "./ShipIcon";
import { SiteMarker } from "./SiteMarker";
import "./BoardSquare.css";

export interface BoardSquareProps {
  readonly isBay: boolean;
  readonly siteState?: SiteState;
  readonly occupant?: SquareOccupant;
}

/** One square's visible contents: a site marker (if any), then a ship (if any). */
export function BoardSquare({ isBay, siteState, occupant }: BoardSquareProps) {
  return (
    <div className={isBay ? "board-square board-square--bay" : "board-square"}>
      {siteState && <SiteMarker state={siteState} />}
      {occupant && <ShipIcon side={occupant.side} shields={occupant.shields} />}
    </div>
  );
}
