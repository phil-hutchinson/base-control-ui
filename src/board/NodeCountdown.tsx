// The countdown number a charged or trapped node shows (rules.md §8.3): how
// many of the holder's own turns it has left, black on a charged node and
// white on a trap. Drawn as a single centred SVG <text> in the same 0-100
// viewBox NodeMarker and ShipModel use, so it scales with the square exactly
// as they do, and it is drawn after ShipModel in BoardSquare so it always
// sits above the ship it counts down for.
//
// Purely decorative, like NodeMarker and ShipModel: a screen reader gets a
// square's contents from its accessible name (squareLabel.ts), which does
// not carry the countdown (doc/plan/00000021-accessibility-tech-debt/known-issues.md,
// "From story 60"), so this SVG carries no title or description and is
// hidden from the accessibility tree.

import "./NodeCountdown.css";

interface NodeCountdownProps {
  readonly number: number;
  readonly color: "black" | "white";
}

// Starting values for the owner's eye, not a measured result. The ship art
// leaves a clear band across the middle of the square for a centred number
// to read through.
const FONT_SIZE = 44;

export function NodeCountdown({ number, color }: NodeCountdownProps) {
  return (
    <svg className="node-countdown" viewBox="0 0 100 100" aria-hidden="true">
      <text
        x={50}
        y={50}
        fontSize={FONT_SIZE}
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
      >
        {number}
      </text>
    </svg>
  );
}
