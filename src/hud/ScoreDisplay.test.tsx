// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { squareFromName } from "../rules/board";
import { STARTING_RETURN_POSITION_INDEX } from "../rules/bays";
import type { ShipId } from "../rules/fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import type {
  EnergyTotals,
  GameState,
  Ship,
  SiteStatus,
} from "../rules/gameState";
import type { ShieldCount } from "../rules/shields";
import type { SiteState } from "../rules/sites";
import { ScoreDisplay } from "./ScoreDisplay";

afterEach(cleanup);

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  shields: ShieldCount = 0,
): Ship {
  return { id, side, square: squareFromName(square), shields };
}

function siteStatuses(
  states: Readonly<Record<string, SiteState>>,
): Record<string, SiteStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, state]) => [
      name,
      { state, enteredOnPly: 0 },
    ]),
  );
}

function buildState(config: {
  energy?: EnergyTotals;
  ships?: readonly Ship[];
  siteStates?: Readonly<Record<string, SiteState>>;
}): GameState {
  return {
    ships: config.ships ?? [],
    siteStates: siteStatuses(config.siteStates ?? {}),
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: 1,
    returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
  };
}

describe("ScoreDisplay", () => {
  it("carries the true total and node count as a hidden sentence", () => {
    const state = buildState({ energy: { green: 24, red: 9 } });

    render(
      <ScoreDisplay
        state={state}
        side="green"
        displayedTotal={state.energy.green}
      />,
    );

    expect(
      screen.getByText("Green: 24 energy, no nodes held."),
    ).toBeInTheDocument();
  });

  it("shows both sides' totals as decorative digits, zero-padded", () => {
    const state = buildState({ energy: { green: 24, red: 9 } });

    const { container } = render(
      <div>
        <ScoreDisplay
          state={state}
          side="green"
          displayedTotal={state.energy.green}
        />
        <ScoreDisplay
          state={state}
          side="red"
          displayedTotal={state.energy.red}
        />
      </div>,
    );

    expect(container).toHaveTextContent("0024");
    expect(container).toHaveTextContent("0009");
    expect(
      screen.getByText("Red: 9 energy, no nodes held."),
    ).toBeInTheDocument();
  });

  it("renders five pips, none lit when the side holds no charged node", () => {
    const state = buildState({});

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(container.querySelectorAll(".score-display__pip")).toHaveLength(5);
    expect(container.querySelectorAll(".score-display__pip--lit")).toHaveLength(
      0,
    );
  });

  it("lights a pip per charged node the side is standing on", () => {
    const state = buildState({
      siteStates: { H8: "charged", E5: "charged", K5: "active" },
      ships: [
        ship("green-1", "green", "H8"),
        ship("green-2", "green", "E5"),
        ship("red-1", "red", "K5"),
      ],
    });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(container.querySelectorAll(".score-display__pip--lit")).toHaveLength(
      2,
    );
    expect(
      screen.getByText("Green: 0 energy, 2 nodes held."),
    ).toBeInTheDocument();
  });

  it("does not light a pip for a node the opposing side holds", () => {
    const state = buildState({
      siteStates: { K5: "charged" },
      ships: [ship("red-1", "red", "K5")],
    });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(container.querySelectorAll(".score-display__pip--lit")).toHaveLength(
      0,
    );
  });

  it("has no static accessibility violations", async () => {
    const state = buildState({});

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });

  it("draws the digits from the displayed total, not the state's true total", () => {
    const state = buildState({ energy: { green: 24, red: 9 } });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={15} />,
    );

    expect(container).toHaveTextContent("0015");
  });

  it("carries the state's true total in the hidden sentence even while the displayed total is still rolling", () => {
    const state = buildState({ energy: { green: 6, red: 0 } });

    render(<ScoreDisplay state={state} side="green" displayedTotal={0} />);

    expect(
      screen.getByText("Green: 6 energy, no nodes held."),
    ).toBeInTheDocument();
  });
});
