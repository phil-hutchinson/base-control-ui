// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { planetArrangement, planetForSquare } from "../board/planetPlacement";
import { startingGameState, type BonusPlanetEntry } from "../rules/gameState";
import { PlanetBonusPanel } from "./PlanetBonusPanel";

afterEach(cleanup);

const SEED = 12345;

/** Every drawn planet cell's `<use>` reference, in DOM order, per row. */
function rowUseHrefs(container: HTMLElement, rowClass: string): string[] {
  const row = container.querySelector(`.${rowClass}`);
  if (row === null) {
    return [];
  }
  return Array.from(row.querySelectorAll(".planet > use"), (use) =>
    use.getAttribute("href"),
  ).filter((href): href is string => href !== null);
}

describe("PlanetBonusPanel", () => {
  it("renders nothing at all when the setting is off", () => {
    const state = startingGameState(SEED);

    const { container } = render(<PlanetBonusPanel state={state} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders two rows, green above red, each with that side's three planets", () => {
    const state = startingGameState(SEED, { planetBonus: "three" });

    const { container } = render(<PlanetBonusPanel state={state} />);

    const rows = container.querySelectorAll(".planet-bonus-panel__row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveClass("planet-bonus-panel__row--green");
    expect(rows[1]).toHaveClass("planet-bonus-panel__row--red");
    expect(rows[0].querySelectorAll(".planet-bonus-panel__cell")).toHaveLength(
      3,
    );
    expect(rows[1].querySelectorAll(".planet-bonus-panel__cell")).toHaveLength(
      3,
    );
  });

  it("heads each row with that side's name", () => {
    const state = startingGameState(SEED, { planetBonus: "three" });

    const { container } = render(<PlanetBonusPanel state={state} />);

    const labels = container.querySelectorAll(".planet-bonus-panel__label");
    expect(labels).toHaveLength(2);
    expect(labels[0]).toHaveTextContent("Green bonus");
    expect(labels[0]).toHaveClass("planet-bonus-panel__label--green");
    expect(labels[1]).toHaveTextContent("Red bonus");
    expect(labels[1]).toHaveClass("planet-bonus-panel__label--red");
  });

  it("draws each planet with the same artwork the board carries on that square", () => {
    const state = startingGameState(SEED, { planetBonus: "three" });
    const arrangement = planetArrangement(state.openingSeed);

    const { container } = render(<PlanetBonusPanel state={state} />);

    const expectedGreen = state.bonusPlanets.green.map((entry) => {
      const art = planetForSquare(arrangement, entry.square);
      return `#${art?.ids.body}`;
    });
    const expectedRed = state.bonusPlanets.red.map((entry) => {
      const art = planetForSquare(arrangement, entry.square);
      return `#${art?.ids.body}`;
    });

    expect(rowUseHrefs(container, "planet-bonus-panel__row--green")).toEqual(
      expectedGreen,
    );
    expect(rowUseHrefs(container, "planet-bonus-panel__row--red")).toEqual(
      expectedRed,
    );
  });

  function withClaim(
    entries: readonly BonusPlanetEntry[],
    square: BonusPlanetEntry["square"],
    claimedOnPly: number,
  ): readonly BonusPlanetEntry[] {
    return entries.map((entry) =>
      entry.square === square ? { ...entry, claimedOnPly } : entry,
    );
  }

  it("shows no badge until claimed, the amount on the claiming ply and the ply after, and the checkmark from then on", () => {
    const base = startingGameState(SEED, { planetBonus: "three" });
    const claimedSquare = base.bonusPlanets.green[0].square;

    const unclaimed = base;
    const { container: unclaimedContainer } = render(
      <PlanetBonusPanel state={unclaimed} />,
    );
    expect(
      unclaimedContainer.querySelector(".planet-bonus-cell__badge"),
    ).not.toBeInTheDocument();
    cleanup();

    const claimingPly: typeof base = {
      ...base,
      plyNumber: 5,
      bonusPlanets: {
        ...base.bonusPlanets,
        green: withClaim(base.bonusPlanets.green, claimedSquare, 5),
      },
    };
    const { container: amountContainer } = render(
      <PlanetBonusPanel state={claimingPly} />,
    );
    const amountBadge = amountContainer.querySelector(
      ".planet-bonus-cell__badge--amount",
    );
    expect(amountBadge).toHaveTextContent("+3");
    expect(amountBadge).toHaveClass("planet-bonus-cell__badge--green");
    cleanup();

    const replyPly: typeof base = { ...claimingPly, plyNumber: 6 };
    const { container: replyContainer } = render(
      <PlanetBonusPanel state={replyPly} />,
    );
    expect(
      replyContainer.querySelector(".planet-bonus-cell__badge--amount"),
    ).toHaveTextContent("+3");
    cleanup();

    const settledPly: typeof base = { ...claimingPly, plyNumber: 7 };
    const { container: settledContainer } = render(
      <PlanetBonusPanel state={settledPly} />,
    );
    expect(
      settledContainer.querySelector(".planet-bonus-cell__badge--claimed"),
    ).toBeInTheDocument();
    expect(
      settledContainer.querySelector(".planet-bonus-cell__badge--amount"),
    ).not.toBeInTheDocument();
  });

  it("draws red's claim in red's colour, independently of green's", () => {
    const base = startingGameState(SEED, { planetBonus: "two" });
    const claimedSquare = base.bonusPlanets.red[0].square;
    const state: typeof base = {
      ...base,
      plyNumber: 3,
      bonusPlanets: {
        ...base.bonusPlanets,
        red: withClaim(base.bonusPlanets.red, claimedSquare, 3),
      },
    };

    const { container } = render(<PlanetBonusPanel state={state} />);

    const badge = container.querySelector(".planet-bonus-cell__badge");
    expect(badge).toHaveClass("planet-bonus-cell__badge--red");
    expect(badge).toHaveTextContent("+2");
  });

  it("draws a planet shared by both sides in both rows, each with its own badge", () => {
    const base = startingGameState(SEED, { planetBonus: "three" });
    const sharedSquare = base.bonusPlanets.green[0].square;
    const state: typeof base = {
      ...base,
      plyNumber: 4,
      bonusPlanets: {
        green: withClaim(base.bonusPlanets.green, sharedSquare, 4),
        red: [
          { square: sharedSquare },
          base.bonusPlanets.red[1],
          base.bonusPlanets.red[2],
        ],
      },
    };

    const { container } = render(<PlanetBonusPanel state={state} />);

    const greenRow = container.querySelector(
      ".planet-bonus-panel__row--green",
    )!;
    const redRow = container.querySelector(".planet-bonus-panel__row--red")!;
    expect(rowUseHrefs(container, "planet-bonus-panel__row--green")[0]).toBe(
      rowUseHrefs(container, "planet-bonus-panel__row--red")[0],
    );
    expect(
      greenRow.querySelector(".planet-bonus-cell__badge--amount"),
    ).toBeInTheDocument();
    expect(
      redRow.querySelector(".planet-bonus-cell__badge"),
    ).not.toBeInTheDocument();
  });

  it("is hidden from the accessibility tree", () => {
    const state = startingGameState(SEED, { planetBonus: "three" });

    const { container } = render(<PlanetBonusPanel state={state} />);

    expect(container.querySelector(".planet-bonus-panel")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
