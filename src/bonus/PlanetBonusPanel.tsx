// Both sides' bonus planets (rules.md §3.4), shown above the clocks: three
// drawings a side, green's row over red's, each carrying a badge for whether
// it has been claimed. Renders nothing at all when both planet bonus and
// planet activity are off — not an empty row, not a hidden one — and
// decorative throughout: a claim reaches a screen-reader user through the
// live region's sentence (`board/announcements.ts`), not through this panel. Each cell's drawing and
// badge are `PlanetBonusCell`, shared with the Quick Guide's PLANET BONUS
// diagram.
//
// Under planet activity (steal.md §10) there are no per-side planets to
// draw two rows of: instead this renders a single row of the two current
// bonuses, slot 0 left and slot 1 right (`GameState.activityBonuses`), each
// as an `ActivityBonusCell` — the planet's own artwork with its kind's
// symbol beneath it. Reading the pair straight off `state.activityBonuses`
// in slot order is what keeps a claim's redraw showing the survivor in its
// own slot and the new bonus in the other one, with no component state of
// its own.
//
// Every cell reports the pointer hovering and leaving it through
// `onHoverSquare`, so `App` can light the matching square on the board — a
// pointer-only affordance, unrelated to the panel staying `aria-hidden`. The
// link runs the other way too: `glowSquare` is the square `Board` reports
// the player hovering there (`App`'s lifted `useBonusHoverGlow` state), and
// a cell drawing that same planet glows here as well, in the board's own
// halo idiom. A planet shared by both classic rows glows in both, since
// each row's cell compares against `glowSquare` on its own.

import { useMemo } from "react";
import type { PlanetArt } from "../board/planetArt";
import { planetArrangement, planetForSquare } from "../board/planetPlacement";
import { squareName, type Square } from "../rules/board";
import type { Side } from "../rules/fleet";
import type { BonusPlanetEntry, GameState } from "../rules/gameState";
import { planetBonusPoints } from "../rules/planetBonus";
import { ActivityBonusCell } from "./ActivityBonusCell";
import { bonusBadgeState } from "./bonusBadge";
import { isTouchPointer } from "./pointerHover";
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
  readonly glowSquare?: Square;
  readonly onHoverSquare?: (square: Square | undefined) => void;
}

function BonusCell({
  side,
  entry,
  arrangement,
  amount,
  plyNumber,
  glowSquare,
  onHoverSquare,
}: BonusCellProps) {
  const art = planetForSquare(arrangement, entry.square);
  if (art === undefined) {
    throw new Error(
      `PlanetBonusPanel: ${squareName(entry.square)} is not a planet square in this arrangement`,
    );
  }
  const badge = bonusBadgeState(entry.claimedOnPly, plyNumber);
  const glowing =
    glowSquare !== undefined &&
    squareName(glowSquare) === squareName(entry.square);

  return (
    <div
      className={
        glowing
          ? "planet-bonus-panel__cell planet-bonus-panel__cell--glow"
          : "planet-bonus-panel__cell"
      }
      onPointerEnter={(event) => {
        if (!isTouchPointer(event)) {
          onHoverSquare?.(entry.square);
        }
      }}
      onPointerLeave={(event) => {
        if (!isTouchPointer(event)) {
          onHoverSquare?.(undefined);
        }
      }}
    >
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
  /**
   * The square, if any, to draw glowing here — because the player is
   * hovering that planet on the board (`App`'s lifted hover state). Omit to
   * draw the panel with no glow (e.g. in the Quick Guide diagram).
   */
  readonly glowSquare?: Square;
  /**
   * Reports the square the pointer is over as it enters a cell, and
   * `undefined` as it leaves — so `App` can light the matching board
   * square. Omit to draw the panel with no hover reporting (e.g. in the
   * Quick Guide diagram).
   */
  readonly onHoverSquare?: (square: Square | undefined) => void;
}

export function PlanetBonusPanel({
  state,
  glowSquare,
  onHoverSquare,
}: PlanetBonusPanelProps) {
  const arrangement = useMemo(
    () => planetArrangement(state.openingSeed),
    [state.openingSeed],
  );

  if (state.planetActivity !== "off") {
    return (
      <div
        className="planet-bonus-panel planet-bonus-panel--activity"
        aria-hidden="true"
      >
        <div className="planet-bonus-panel__activity-row">
          {state.activityBonuses.map((entry) => {
            const art = planetForSquare(arrangement, entry.square);
            if (art === undefined) {
              throw new Error(
                `PlanetBonusPanel: ${squareName(entry.square)} is not a planet square in this arrangement`,
              );
            }
            const glowing =
              glowSquare !== undefined &&
              squareName(glowSquare) === squareName(entry.square);
            return (
              <div
                key={squareName(entry.square)}
                className={
                  glowing
                    ? "planet-bonus-panel__activity-cell planet-bonus-panel__activity-cell--glow"
                    : "planet-bonus-panel__activity-cell"
                }
                onPointerEnter={(event) => {
                  if (!isTouchPointer(event)) {
                    onHoverSquare?.(entry.square);
                  }
                }}
                onPointerLeave={(event) => {
                  if (!isTouchPointer(event)) {
                    onHoverSquare?.(undefined);
                  }
                }}
              >
                <ActivityBonusCell
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
                glowSquare={glowSquare}
                onHoverSquare={onHoverSquare}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
