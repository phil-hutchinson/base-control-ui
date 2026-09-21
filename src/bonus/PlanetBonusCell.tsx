// One bonus planet cell — a planet's drawing with an optional badge overlay
// — shared by `PlanetBonusPanel` (rules.md §3.4) and the Quick Guide's
// PLANET BONUS diagram, so the two never draw two different checkmarks.
// Self-contained: it fills whatever box its caller sizes and supplies its
// own positioning for the badge, so neither caller needs to know how the
// other one works.

import type { PlanetArt } from "../board/planetArt";
import { Planet } from "../board/Planet";
import type { Side } from "../rules/fleet";
import type { BonusBadgeState } from "./bonusBadge";
import "./PlanetBonusCell.css";

/** The settled checkmark, drawn as inline SVG so it never depends on a font. */
export function ClaimedMark() {
  return (
    <svg viewBox="0 0 24 24" className="planet-bonus-cell__checkmark">
      <path
        d="M4 13 L10 19 L20 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface PlanetBonusCellProps {
  readonly side: Side;
  readonly art: PlanetArt;
  readonly badge: BonusBadgeState;
  /** Read only when `badge` is `"amount"`. */
  readonly amount?: number;
}

/**
 * A planet's drawing, filling whatever box its caller sizes, with a badge
 * over it in the given side's colour: nothing when unclaimed, the amount
 * just paid, or the settled checkmark.
 */
export function PlanetBonusCell({
  side,
  art,
  badge,
  amount,
}: PlanetBonusCellProps) {
  return (
    <div className="planet-bonus-cell">
      <Planet planet={art} />
      {badge !== "none" && (
        <span
          className={`planet-bonus-cell__badge planet-bonus-cell__badge--${side} planet-bonus-cell__badge--${badge}`}
        >
          {badge === "amount" ? `+${amount}` : <ClaimedMark />}
        </span>
      )}
    </div>
  );
}
