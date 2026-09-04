// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { squareFromName } from "../rules/board";
import type { ShipId } from "../rules/fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import type {
  EnergyTotals,
  GameState,
  Ship,
  NodeStatus,
} from "../rules/gameState";
import type { PowerLevel } from "../rules/power";
import type { NodeState } from "../rules/nodes";
import { ScoreDisplay } from "./ScoreDisplay";

afterEach(cleanup);

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function nodeStatuses(
  states: Readonly<Record<string, NodeState>>,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, state]) => [name, { state, level: 0 }]),
  );
}

function buildState(config: {
  energy?: EnergyTotals;
  ships?: readonly Ship[];
  nodes?: Readonly<Record<string, NodeState>>;
}): GameState {
  return {
    ships: config.ships ?? [],
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: 1,
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
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
      screen.getByText(
        "Green: 24 energy, no nodes held, standing on no depleted nodes.",
      ),
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
      screen.getByText(
        "Red: 9 energy, no nodes held, standing on no depleted nodes.",
      ),
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
      nodes: { H8: "charged", E5: "charged", K5: "inactive" },
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
      screen.getByText(
        "Green: 0 energy, 2 nodes held, standing on no depleted nodes.",
      ),
    ).toBeInTheDocument();
  });

  it("does not light a pip for a node the opposing side holds", () => {
    const state = buildState({
      nodes: { K5: "charged" },
      ships: [ship("red-1", "red", "K5")],
    });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(container.querySelectorAll(".score-display__pip--lit")).toHaveLength(
      0,
    );
  });

  it("renders five depleted pips, none on when the side stands on nothing depleted", () => {
    const state = buildState({});

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(
      container.querySelectorAll(".score-display__depleted-pip"),
    ).toHaveLength(5);
    expect(
      container.querySelectorAll(".score-display__depleted-pip--on"),
    ).toHaveLength(0);
  });

  it("lights one depleted pip per depleted node the side is standing on", () => {
    const state = buildState({
      nodes: { H8: "depleted", E5: "depleted", K5: "inactive" },
      ships: [
        ship("green-1", "green", "H8"),
        ship("green-2", "green", "E5"),
        ship("red-1", "red", "K5"),
      ],
    });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(
      container.querySelectorAll(".score-display__depleted-pip--on"),
    ).toHaveLength(2);
    expect(
      screen.getByText(
        "Green: 0 energy, no nodes held, standing on 2 depleted nodes.",
      ),
    ).toBeInTheDocument();
  });

  it("lights all five depleted pips when the side stands on six depleted nodes", () => {
    const state = buildState({
      nodes: {
        H8: "depleted",
        E5: "depleted",
        K5: "depleted",
        F2: "depleted",
        J2: "depleted",
        B4: "depleted",
      },
      ships: [
        ship("green-1", "green", "H8"),
        ship("green-2", "green", "E5"),
        ship("green-3", "green", "K5"),
        ship("green-4", "green", "F2"),
        ship("green-5", "green", "J2"),
        ship("green-6", "green", "B4"),
      ],
    });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(
      container.querySelectorAll(".score-display__depleted-pip--on"),
    ).toHaveLength(5);
  });

  it("does not light a depleted pip for a depleted node the opposing side stands on", () => {
    const state = buildState({
      nodes: { K5: "depleted" },
      ships: [ship("red-1", "red", "K5")],
    });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(
      container.querySelectorAll(".score-display__depleted-pip--on"),
    ).toHaveLength(0);
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
      screen.getByText(
        "Green: 6 energy, no nodes held, standing on no depleted nodes.",
      ),
    ).toBeInTheDocument();
  });
});
