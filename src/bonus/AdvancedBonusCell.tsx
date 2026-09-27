// One advanced planet bonus's own cell (steal.md §10): the planet's board
// artwork with the kind's symbol beneath it, not overlaid on top of it — an
// advanced bonus belongs to neither side until claimed, so there is no
// side-coloured badge to draw over the drawing the way a classic
// `PlanetBonusCell` does. Shared by `PlanetBonusPanel` and the Quick
// Guide's ADVANCED PLANET BONUSES diagram, so the two never draw two
// different symbols for the same kind. Self-contained, like
// `PlanetBonusCell`: it fills whatever box its caller sizes.

import type { PlanetArt } from "../board/planetArt";
import { Planet } from "../board/Planet";
import type { AdvancedBonusKind } from "../rules/advancedBonus";
import type { ChargedNodeCount } from "../rules/nodes";
import type { PlayerMatchingSetting } from "../rules/playerMatching";
import type { ScoringSetting } from "../rules/scoring";
import { AdvancedBonusSymbol } from "./AdvancedBonusSymbol";
import "./AdvancedBonusCell.css";

export interface AdvancedBonusCellProps {
  readonly art: PlanetArt;
  readonly kind: AdvancedBonusKind;
  readonly nodeCount: ChargedNodeCount;
  readonly playerMatching: PlayerMatchingSetting;
  readonly scoring: ScoringSetting;
}

export function AdvancedBonusCell({
  art,
  kind,
  nodeCount,
  playerMatching,
  scoring,
}: AdvancedBonusCellProps) {
  return (
    <div className="advanced-bonus-cell">
      <div className="advanced-bonus-cell__planet">
        <Planet planet={art} />
      </div>
      <div className="advanced-bonus-cell__symbol">
        <AdvancedBonusSymbol
          kind={kind}
          nodeCount={nodeCount}
          playerMatching={playerMatching}
          scoring={scoring}
        />
      </div>
    </div>
  );
}
