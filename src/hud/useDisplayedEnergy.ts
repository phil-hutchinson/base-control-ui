// The HUD's one animation clock for both sides' scores. Wraps `useCountUp`
// once per side and reports the totals to draw plus whether the roll has
// settled, so anything above the HUD — currently `App.tsx` — can tell when a
// score has finished counting up without re-deriving the arithmetic itself.

import type { EnergyTotals } from "../rules/gameState";
import { useCountUp } from "./useCountUp";

/** The totals to draw, plus whether both sides have reached their targets. */
export interface DisplayedEnergy {
  readonly displayed: EnergyTotals;
  readonly settled: boolean;
}

/**
 * Rolls each side's displayed total towards `energy`. `settled` is true
 * exactly when both displayed values already equal their targets — true on
 * a fresh render, true again once a roll finishes, and true immediately
 * under prefers-reduced-motion or when a target falls, since `useCountUp`
 * does not animate either of those cases.
 */
export function useDisplayedEnergy(energy: EnergyTotals): DisplayedEnergy {
  const green = useCountUp(energy.green);
  const red = useCountUp(energy.red);

  return {
    displayed: { green, red },
    settled: green === energy.green && red === energy.red,
  };
}
