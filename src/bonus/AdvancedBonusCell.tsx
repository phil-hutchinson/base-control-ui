// One advanced planet bonus's own cell (steal.md §10): the planet's board
// artwork, at least as large as a planet draws on the board itself
// (`--board-square-size`, `App.css`), with the kind's symbol and a one-word
// caption beneath it, not overlaid on top of it — an advanced bonus belongs
// to neither side until claimed, so there is no side-coloured badge to draw
// over the drawing the way a classic `PlanetBonusCell` does. Shared by
// `PlanetBonusPanel` and the Quick Guide's ADVANCED PLANET BONUSES diagram,
// so the two never draw two different symbols or captions for the same
// kind. Self-contained, like `PlanetBonusCell`: it fills whatever width its
// caller gives it and takes its own height from its content, rather than
// being forced into a square, since it stacks three things rather than
// drawing one.

import type { PlanetArt } from "../board/planetArt";
import { Planet } from "../board/Planet";
import type { AdvancedBonusKind } from "../rules/advancedBonus";
import type { ChargedNodeCount } from "../rules/nodes";
import type { PlayerMatchingSetting } from "../rules/playerMatching";
import type { ScoringSetting } from "../rules/scoring";
import { advancedBonusCaption } from "./advancedBonusCaption";
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
      <div className="advanced-bonus-cell__caption">
        {advancedBonusCaption(kind)}
      </div>
    </div>
  );
}
