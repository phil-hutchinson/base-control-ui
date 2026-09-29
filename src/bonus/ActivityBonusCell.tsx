// One activity bonus's own cell (steal.md §10): the planet's board artwork,
// at least as large as a planet draws on the board itself
// (`--board-square-size`, `App.css`), with the kind's symbol and a one-word
// caption beneath it, not overlaid on top of it — an activity bonus belongs
// to neither side until claimed, so there is no side-coloured badge to draw
// over the drawing the way a classic `PlanetBonusCell` does. Shared by
// `PlanetBonusPanel` and the Quick Guide's PLANET EFFECTS diagram,
// so the two never draw two different symbols or captions for the same
// kind. Self-contained, like `PlanetBonusCell`: it fills whatever width its
// caller gives it and takes its own height from its content, rather than
// being forced into a square, since it stacks three things rather than
// drawing one.

import type { PlanetArt } from "../board/planetArt";
import { Planet } from "../board/Planet";
import type { ActivityBonusKind } from "../rules/activityBonus";
import type { ChargedNodeCount } from "../rules/nodes";
import type { PlayerMatchingSetting } from "../rules/playerMatching";
import type { ScoringSetting } from "../rules/scoring";
import { activityBonusCaption } from "./activityBonusCaption";
import { ActivityBonusSymbol } from "./ActivityBonusSymbol";
import "./ActivityBonusCell.css";

export interface ActivityBonusCellProps {
  readonly art: PlanetArt;
  readonly kind: ActivityBonusKind;
  readonly nodeCount: ChargedNodeCount;
  readonly playerMatching: PlayerMatchingSetting;
  readonly scoring: ScoringSetting;
}

export function ActivityBonusCell({
  art,
  kind,
  nodeCount,
  playerMatching,
  scoring,
}: ActivityBonusCellProps) {
  return (
    <div className="activity-bonus-cell">
      <div className="activity-bonus-cell__planet">
        <Planet planet={art} />
      </div>
      <div className="activity-bonus-cell__symbol">
        <ActivityBonusSymbol
          kind={kind}
          nodeCount={nodeCount}
          playerMatching={playerMatching}
          scoring={scoring}
        />
      </div>
      <div className="activity-bonus-cell__caption">
        {activityBonusCaption(kind)}
      </div>
    </div>
  );
}
