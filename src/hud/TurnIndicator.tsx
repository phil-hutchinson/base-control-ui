// Player-facing chrome saying whose turn it is and how many actions remain.
// Renders `announcements.ts`'s wording verbatim; composes none of its own.
// Deliberately not a live region — the change of turn already reaches a
// screen reader through the board's one live region, and a second region
// would announce it twice.

import type { GameState } from "../rules/gameState";
import { turnIndicatorText } from "../board/announcements";
import "./TurnIndicator.css";

interface TurnIndicatorProps {
  readonly state: GameState;
}

export function TurnIndicator({ state }: TurnIndicatorProps) {
  return <p className="turn-indicator">{turnIndicatorText(state)}</p>;
}
