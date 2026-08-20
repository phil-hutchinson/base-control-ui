// Player-facing chrome saying whose turn it is. Renders `announcements.ts`'s
// wording verbatim; composes none of its own. Deliberately not a live
// region — the change of turn already reaches a screen reader through the
// board's one live region, and a second region would announce it twice.

import type { GameState } from "../rules/gameState";
import { isGameOver } from "../rules/gameLength";
import { turnIndicatorText } from "../board/announcements";
import "./TurnIndicator.css";

interface TurnIndicatorProps {
  readonly state: GameState;
}

export function TurnIndicator({ state }: TurnIndicatorProps) {
  const className = isGameOver(state)
    ? "turn-indicator"
    : `turn-indicator turn-indicator--${state.sideToMove}`;
  return <p className={className}>{turnIndicatorText(state)}</p>;
}
