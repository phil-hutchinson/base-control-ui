// Both sides' bonus planets (rules.md §3.4), shown above the clocks: three
// drawings a side, green's row over red's, each carrying a badge for whether
// it has been claimed. Renders nothing at all when the setting is off — not
// an empty row, not a hidden one — and decorative throughout: a claim reaches
// a screen-reader user through the live region's sentence
// (`board/announcements.ts`), not through this panel. Each cell's drawing and
// badge are `PlanetBonusCell`, shared with the Quick Guide's PLANET BONUS
// diagram.

import { useMemo } from "react";
import type { PlanetArt } from "../board/planetArt";
import { planetArrangement, planetForSquare } from "../board/planetPlacement";
import { squareName } from "../rules/board";
import type { Side } from "../rules/fleet";
import type { BonusPlanetEntry, GameState } from "../rules/gameState";
import { planetBonusPoints } from "../rules/planetBonus";
import { bonusBadgeState } from "./bonusBadge";
import { PlanetBonusCell } from "./PlanetBonusCell";
import "./PlanetBonusPanel.css";

/** Green above red, matching the clocks' own order in both orientations. */
const SIDES: readonly Side[] = ["green", "red"];

/**
 * Each row's heading, so a player reads whose three planets a row is rather
 * than inferring it from the badges' colour — which says nothing at all
 * until something has been claimed. Written in sentence case and uppercased
 * in the stylesheet, exactly as the clocks' own side names are.
 */
const SIDE_LABEL: Readonly<Record<Side, string>> = {
  green: "Green bonus",
  red: "Red bonus",
};

interface BonusCellProps {
  readonly side: Side;
  readonly entry: BonusPlanetEntry;
  readonly arrangement: ReadonlyMap<string, PlanetArt>;
  readonly amount: number;
  readonly plyNumber: number;
}

function BonusCell({
  side,
  entry,
  arrangement,
  amount,
  plyNumber,
}: BonusCellProps) {
  const art = planetForSquare(arrangement, entry.square);
  if (art === undefined) {
    throw new Error(
      `PlanetBonusPanel: ${squareName(entry.square)} is not a planet square in this arrangement`,
    );
  }
  const badge = bonusBadgeState(entry.claimedOnPly, plyNumber);

  return (
    <div className="planet-bonus-panel__cell">
      {badge === "amount" ? (
        <PlanetBonusCell side={side} art={art} badge="amount" amount={amount} />
      ) : (
        <PlanetBonusCell side={side} art={art} badge={badge} />
      )}
    </div>
  );
}

export interface PlanetBonusPanelProps {
  /** The session's game state: read for the setting, the deal, the ply number and the opening seed. */
  readonly state: GameState;
}

export function PlanetBonusPanel({ state }: PlanetBonusPanelProps) {
  const arrangement = useMemo(
    () => planetArrangement(state.openingSeed),
    [state.openingSeed],
  );

  if (state.planetBonus === "off") {
    return null;
  }

  const amount = planetBonusPoints(state.planetBonus);

  return (
    <div className="planet-bonus-panel" aria-hidden="true">
      {SIDES.map((side) => (
        <div key={side} className="planet-bonus-panel__side">
          <span
            className={`planet-bonus-panel__label planet-bonus-panel__label--${side}`}
          >
            {SIDE_LABEL[side]}
          </span>
          <div
            className={`planet-bonus-panel__row planet-bonus-panel__row--${side}`}
          >
            {state.bonusPlanets[side].map((entry) => (
              <BonusCell
                key={squareName(entry.square)}
                side={side}
                entry={entry}
                arrangement={arrangement}
                amount={amount}
                plyNumber={state.plyNumber}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
