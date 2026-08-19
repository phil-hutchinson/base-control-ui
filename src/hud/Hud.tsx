// The arcade strip between the title and the board: both sides' scores and
// node pips, the round counter centred between them, and the turn
// indicator beneath. Everything here is drawn from the game state alone —
// no component in this strip ever names the game's length or a hundred.

import type { GameState } from "../rules/gameState";
import { RoundCounter } from "./RoundCounter";
import { ScoreDisplay } from "./ScoreDisplay";
import { TurnIndicator } from "./TurnIndicator";
import "./Hud.css";

interface HudProps {
  readonly state: GameState;
}

export function Hud({ state }: HudProps) {
  return (
    <div className="hud">
      <div className="hud__row">
        <ScoreDisplay state={state} side="green" />
        <RoundCounter state={state} />
        <ScoreDisplay state={state} side="red" />
      </div>
      <TurnIndicator state={state} />
    </div>
  );
}
