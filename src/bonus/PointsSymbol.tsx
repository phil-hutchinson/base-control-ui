// The `+N` symbol a planet activity points bonus draws beneath its planet
// (steal.md §10): the amount the bonus would pay, in the panel's own badge
// typography (`PlanetBonusCell.css`'s `--amount` badge), so a points bonus
// reads the same whichever side is about to claim it.

import "./PointsSymbol.css";

export interface PointsSymbolProps {
  readonly amount: number;
}

export function PointsSymbol({ amount }: PointsSymbolProps) {
  return (
    <div className="points-symbol" aria-hidden="true">
      <span className="points-symbol__text">+{amount}</span>
    </div>
  );
}
