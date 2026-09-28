// Which of the four symbols a planet activity bonus's kind draws (steal.md
// §10): `+N` for a points kind, the fuel bar for Fuel, three coloured rings
// for Additional nodes, the three-coloured rotation mark for Node scramble.
// A pure dispatch over `ActivityBonusKind`, so `ActivityBonusCell` — and
// the Quick Guide's diagram, which shares it — never need to know which
// symbol a kind draws.

import {
  activityBonusPoints,
  type ActivityBonusKind,
} from "../rules/activityBonus";
import type { ChargedNodeCount } from "../rules/nodes";
import type { PlayerMatchingSetting } from "../rules/playerMatching";
import type { ScoringSetting } from "../rules/scoring";
import { AdditionalNodesSymbol } from "./AdditionalNodesSymbol";
import { FuelSymbol } from "./FuelSymbol";
import { NodeScrambleSymbol } from "./NodeScrambleSymbol";
import { PointsSymbol } from "./PointsSymbol";

export interface ActivityBonusSymbolProps {
  readonly kind: ActivityBonusKind;
  readonly nodeCount: ChargedNodeCount;
  readonly playerMatching: PlayerMatchingSetting;
  readonly scoring: ScoringSetting;
}

export function ActivityBonusSymbol({
  kind,
  nodeCount,
  playerMatching,
  scoring,
}: ActivityBonusSymbolProps) {
  switch (kind) {
    case "small-points":
      return (
        <PointsSymbol
          amount={activityBonusPoints(
            nodeCount,
            playerMatching,
            scoring,
            "small",
          )}
        />
      );
    case "medium-points":
      return (
        <PointsSymbol
          amount={activityBonusPoints(
            nodeCount,
            playerMatching,
            scoring,
            "medium",
          )}
        />
      );
    case "large-points":
      return (
        <PointsSymbol
          amount={activityBonusPoints(
            nodeCount,
            playerMatching,
            scoring,
            "large",
          )}
        />
      );
    case "fuel":
      return <FuelSymbol />;
    case "additional-nodes":
      return <AdditionalNodesSymbol playerMatching={playerMatching} />;
    case "node-scramble":
      return <NodeScrambleSymbol playerMatching={playerMatching} />;
  }
}
