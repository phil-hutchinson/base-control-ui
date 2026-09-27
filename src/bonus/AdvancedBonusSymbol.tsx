// Which of the four symbols an advanced planet bonus's kind draws (steal.md
// §10): `+N` for a points kind, the fuel bar for Fuel, three coloured rings
// for Additional nodes, the three-coloured rotation mark for Node scramble.
// A pure dispatch over `AdvancedBonusKind`, so `AdvancedBonusCell` — and
// the Quick Guide's diagram, which shares it (story 105, Step 7) — never
// need to know which symbol a kind draws.

import {
  advancedBonusPoints,
  type AdvancedBonusKind,
} from "../rules/advancedBonus";
import type { ChargedNodeCount } from "../rules/nodes";
import type { PlayerMatchingSetting } from "../rules/playerMatching";
import type { ScoringSetting } from "../rules/scoring";
import { AdditionalNodesSymbol } from "./AdditionalNodesSymbol";
import { FuelSymbol } from "./FuelSymbol";
import { NodeScrambleSymbol } from "./NodeScrambleSymbol";
import { PointsSymbol } from "./PointsSymbol";

export interface AdvancedBonusSymbolProps {
  readonly kind: AdvancedBonusKind;
  readonly nodeCount: ChargedNodeCount;
  readonly playerMatching: PlayerMatchingSetting;
  readonly scoring: ScoringSetting;
}

export function AdvancedBonusSymbol({
  kind,
  nodeCount,
  playerMatching,
  scoring,
}: AdvancedBonusSymbolProps) {
  switch (kind) {
    case "small-points":
      return (
        <PointsSymbol
          amount={advancedBonusPoints(
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
          amount={advancedBonusPoints(
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
          amount={advancedBonusPoints(
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
