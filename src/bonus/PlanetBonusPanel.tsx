// Both sides' bonus planets (rules.md §3.4), shown above the clocks: three
// drawings a side, green's row over red's, each carrying a badge for whether
// it has been claimed. Renders nothing at all when the setting is off — not
// an empty row, not a hidden one — and decorative throughout: a claim reaches
// a screen-reader user through the live region's sentence
// (`board/announcements.ts`), not through this panel. Each cell's drawing and
// badge are `PlanetBonusCell`, shared with the Quick Guide's PLANET BONUS
// diagram.
//
// Under the advanced setting (steal.md §10) there are no per-side planets to
// draw two rows of: instead this renders a single row of the two current
// bonuses, slot 0 left and slot 1 right (`GameState.advancedBonuses`), each
// as an `AdvancedBonusCell` — the planet's own artwork with its kind's
// symbol beneath it. Reading the pair straight off `state.advancedBonuses`
// in slot order is what keeps a claim's redraw showing the survivor in its
// own slot and the new bonus in the other one, with no component state of
// its own.

import { useMemo } from "react";
import type { PlanetArt } from "../board/planetArt";
import { planetArrangement, planetForSquare } from "../board/planetPlacement";
import { squareName } from "../rules/board";
import type { Side } from "../rules/fleet";
import type { BonusPlanetEntry, GameState } from "../rules/gameState";
import { planetBonusPoints } from "../rules/planetBonus";
import { AdvancedBonusCell } from "./AdvancedBonusCell";
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

  if (state.planetBonus === "advanced") {
    return (
      <div
        className="planet-bonus-panel planet-bonus-panel--advanced"
        aria-hidden="true"
      >
        <div className="planet-bonus-panel__advanced-row">
          {state.advancedBonuses.map((entry) => {
            const art = planetForSquare(arrangement, entry.square);
            if (art === undefined) {
              throw new Error(
                `PlanetBonusPanel: ${squareName(entry.square)} is not a planet square in this arrangement`,
              );
            }
            return (
              <div
                key={squareName(entry.square)}
                className="planet-bonus-panel__advanced-cell"
              >
                <AdvancedBonusCell
                  art={art}
                  kind={entry.kind}
                  nodeCount={state.chargedNodeCount}
                  playerMatching={state.playerMatching}
                  scoring={state.scoring}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
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
