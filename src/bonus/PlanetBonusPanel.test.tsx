// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { planetArrangement, planetForSquare } from "../board/planetPlacement";
import type { Square } from "../rules/board";
import {
  activityBonusPoints,
  type ActivityBonusKind,
} from "../rules/activityBonus";
import {
  startingGameState,
  type BonusPlanetEntry,
  type GameState,
} from "../rules/gameState";
import { PLANETS } from "../rules/planets";
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

/**
 * jsdom has no `PointerEvent` constructor, so `fireEvent.pointerEnter`'s
 * `init` object is silently dropped by the plain `Event` it falls back to.
 * Setting `pointerType` on the created event directly is what actually
 * reaches the handler, since React reads it straight off the native event.
 */
function firePointerEnter(node: Element, pointerType: string) {
  const event = createEvent.pointerEnter(node);
  Object.defineProperty(event, "pointerType", {
    value: pointerType,
    configurable: true,
  });
  fireEvent(node, event);
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

  it("reports the hovered square entering a classic cell, and undefined leaving it", () => {
    const state = startingGameState(SEED, { planetBonus: "three" });
    const onHoverSquare = vi.fn();

    const { container } = render(
      <PlanetBonusPanel state={state} onHoverSquare={onHoverSquare} />,
    );

    const cell = container.querySelector(".planet-bonus-panel__cell")!;
    fireEvent.pointerEnter(cell);
    expect(onHoverSquare).toHaveBeenLastCalledWith(
      state.bonusPlanets.green[0].square,
    );

    fireEvent.pointerLeave(cell);
    expect(onHoverSquare).toHaveBeenLastCalledWith(undefined);
  });

  it("ignores a touch tap on a classic cell, so no glow sticks after the tap", () => {
    const state = startingGameState(SEED, { planetBonus: "three" });
    const onHoverSquare = vi.fn();

    const { container } = render(
      <PlanetBonusPanel state={state} onHoverSquare={onHoverSquare} />,
    );

    const cell = container.querySelector(".planet-bonus-panel__cell")!;
    firePointerEnter(cell, "touch");

    expect(onHoverSquare).not.toHaveBeenCalled();
  });

  it("glows exactly the cell whose square matches glowSquare, and none by default", () => {
    const base = startingGameState(SEED, { planetBonus: "three" });
    // Disjoint sets, unlike the real (random) deal, so exactly one cell in
    // the whole panel can ever match a given glowSquare.
    const state: typeof base = {
      ...base,
      bonusPlanets: {
        green: [
          { square: PLANETS[0] },
          { square: PLANETS[1] },
          { square: PLANETS[2] },
        ],
        red: [
          { square: PLANETS[3] },
          { square: PLANETS[4] },
          { square: PLANETS[5] },
        ],
      },
    };

    const { container: plain } = render(<PlanetBonusPanel state={state} />);
    expect(
      plain.querySelectorAll(".planet-bonus-panel__cell--glow"),
    ).toHaveLength(0);
    cleanup();

    const { container } = render(
      <PlanetBonusPanel state={state} glowSquare={PLANETS[4]} />,
    );
    const glowing = container.querySelectorAll(
      ".planet-bonus-panel__cell--glow",
    );
    expect(glowing).toHaveLength(1);
    expect(
      container.querySelectorAll(".planet-bonus-panel__row--red")[0]
        .children[1],
    ).toHaveClass("planet-bonus-panel__cell--glow");
  });

  it("glows a planet shared by both sides in both rows", () => {
    const base = startingGameState(SEED, { planetBonus: "three" });
    const sharedSquare = PLANETS[0];
    const state: typeof base = {
      ...base,
      bonusPlanets: {
        green: [
          { square: sharedSquare },
          { square: PLANETS[1] },
          { square: PLANETS[2] },
        ],
        red: [
          { square: sharedSquare },
          { square: PLANETS[3] },
          { square: PLANETS[4] },
        ],
      },
    };

    const { container } = render(
      <PlanetBonusPanel state={state} glowSquare={sharedSquare} />,
    );

    const glowing = container.querySelectorAll(
      ".planet-bonus-panel__cell--glow",
    );
    expect(glowing).toHaveLength(2);
  });

  describe("under planet activity (steal.md §10)", () => {
    function withActivityBonuses(
      first: readonly [Square, ActivityBonusKind],
      second: readonly [Square, ActivityBonusKind],
    ): GameState {
      const base = startingGameState(SEED, {
        nodePlaystyle: "steal",
        planetActivity: "race",
      });
      return {
        ...base,
        activityBonuses: [
          { square: first[0], kind: first[1] },
          { square: second[0], kind: second[1] },
        ],
      };
    }

    it("renders exactly two cells, in slot order, with the board's own planet artwork", () => {
      const state = withActivityBonuses(
        [PLANETS[0], "large-points"],
        [PLANETS[1], "fuel"],
      );
      const arrangement = planetArrangement(state.openingSeed);

      const { container } = render(<PlanetBonusPanel state={state} />);

      const row = container.querySelector(".planet-bonus-panel__activity-row");
      const cells = row?.querySelectorAll(".planet-bonus-panel__activity-cell");
      expect(cells).toHaveLength(2);
      const hrefs = Array.from(
        row?.querySelectorAll(".planet > use") ?? [],
        (use) => use.getAttribute("href"),
      );
      expect(hrefs).toEqual([
        `#${planetForSquare(arrangement, PLANETS[0])?.ids.body}`,
        `#${planetForSquare(arrangement, PLANETS[1])?.ids.body}`,
      ]);
    });

    it("renders a stable game's pair exactly as it renders race's", () => {
      const race = withActivityBonuses(
        [PLANETS[0], "large-points"],
        [PLANETS[1], "fuel"],
      );
      const stable: GameState = { ...race, planetActivity: "stable" };

      const { container: raceContainer } = render(
        <PlanetBonusPanel state={race} />,
      );
      const raceMarkup = raceContainer.innerHTML;
      cleanup();
      const { container: stableContainer } = render(
        <PlanetBonusPanel state={stable} />,
      );

      expect(
        stableContainer.querySelectorAll(".planet-bonus-panel__activity-cell"),
      ).toHaveLength(2);
      expect(stableContainer.innerHTML).toBe(raceMarkup);
    });

    it("is hidden from the accessibility tree", () => {
      const state = withActivityBonuses(
        [PLANETS[0], "large-points"],
        [PLANETS[1], "fuel"],
      );

      const { container } = render(<PlanetBonusPanel state={state} />);

      expect(
        container.querySelector(".planet-bonus-panel--activity"),
      ).toHaveAttribute("aria-hidden", "true");
    });

    it("shows a points bonus's `+N` amount for the game's own settings", () => {
      const state = withActivityBonuses(
        [PLANETS[0], "large-points"],
        [PLANETS[1], "fuel"],
      );

      const { container } = render(<PlanetBonusPanel state={state} />);

      const expectedAmount = activityBonusPoints(
        state.chargedNodeCount,
        state.playerMatching,
        state.scoring,
        "large",
      );
      expect(container.querySelector(".points-symbol")).toHaveTextContent(
        `+${expectedAmount}`,
      );
    });

    it("captions every points size BONUS, and Fuel, Additional nodes and Node scramble their own word", () => {
      const points = withActivityBonuses(
        [PLANETS[0], "medium-points"],
        [PLANETS[1], "small-points"],
      );
      const { container } = render(<PlanetBonusPanel state={points} />);
      const captions = Array.from(
        container.querySelectorAll(".activity-bonus-cell__caption"),
        (caption) => caption.textContent,
      );
      expect(captions).toEqual(["BONUS", "BONUS"]);
      cleanup();

      const rest = withActivityBonuses(
        [PLANETS[0], "fuel"],
        [PLANETS[1], "additional-nodes"],
      );
      const { container: restContainer } = render(
        <PlanetBonusPanel state={rest} />,
      );
      const restCaptions = Array.from(
        restContainer.querySelectorAll(".activity-bonus-cell__caption"),
        (caption) => caption.textContent,
      );
      expect(restCaptions).toEqual(["FUEL", "ADD NODES"]);
      cleanup();

      const scramble = withActivityBonuses(
        [PLANETS[0], "node-scramble"],
        [PLANETS[1], "large-points"],
      );
      const { container: scrambleContainer } = render(
        <PlanetBonusPanel state={scramble} />,
      );
      expect(
        scrambleContainer.querySelector(".activity-bonus-cell__caption"),
      ).toHaveTextContent("SCRAMBLE");
    });

    it("draws Fuel as a single bar, Additional nodes as three coloured rings and Node scramble as a three-coloured rotation mark", () => {
      const fuel = withActivityBonuses(
        [PLANETS[0], "fuel"],
        [PLANETS[1], "small-points"],
      );
      const { container: fuelContainer } = render(
        <PlanetBonusPanel state={fuel} />,
      );
      expect(fuelContainer.querySelector(".fuel-symbol")).toBeInTheDocument();
      cleanup();

      const additionalNodes = withActivityBonuses(
        [PLANETS[0], "additional-nodes"],
        [PLANETS[1], "small-points"],
      );
      const { container: nodesContainer } = render(
        <PlanetBonusPanel state={additionalNodes} />,
      );
      const rings = nodesContainer.querySelectorAll(
        ".additional-nodes-symbol circle",
      );
      expect(rings).toHaveLength(3);
      const ringColors = new Set(
        Array.from(rings, (ring) => ring.getAttribute("stroke")),
      );
      expect(ringColors.size).toBe(3);
      cleanup();

      const scramble = withActivityBonuses(
        [PLANETS[0], "node-scramble"],
        [PLANETS[1], "small-points"],
      );
      const { container: scrambleContainer } = render(
        <PlanetBonusPanel state={scramble} />,
      );
      const arcs = scrambleContainer.querySelectorAll(
        ".node-scramble-symbol path",
      );
      expect(arcs).toHaveLength(3);
      const arcColors = new Set(
        Array.from(arcs, (arc) => arc.getAttribute("stroke")),
      );
      expect(arcColors.size).toBe(3);
    });

    it("keeps the survivor in its own slot and puts the new bonus in the claimed slot", () => {
      const before = withActivityBonuses(
        [PLANETS[0], "large-points"],
        [PLANETS[1], "fuel"],
      );
      // Slot 0 (PLANETS[0]) was claimed and redrawn to a new kind; slot 1
      // (the survivor, PLANETS[1]) kept its square but changed kind; a new
      // bonus (PLANETS[2]) took slot 0.
      const after: GameState = {
        ...before,
        activityBonuses: [
          { square: PLANETS[2], kind: "node-scramble" },
          { square: PLANETS[1], kind: "additional-nodes" },
        ],
      };
      const arrangement = planetArrangement(after.openingSeed);

      const { container } = render(<PlanetBonusPanel state={after} />);

      const row = container.querySelector(".planet-bonus-panel__activity-row");
      const hrefs = Array.from(
        row?.querySelectorAll(".planet > use") ?? [],
        (use) => use.getAttribute("href"),
      );
      expect(hrefs).toEqual([
        `#${planetForSquare(arrangement, PLANETS[2])?.ids.body}`,
        `#${planetForSquare(arrangement, PLANETS[1])?.ids.body}`,
      ]);
    });

    it("reports the hovered square entering a planet activity cell, and undefined leaving it", () => {
      const state = withActivityBonuses(
        [PLANETS[0], "large-points"],
        [PLANETS[1], "fuel"],
      );
      const onHoverSquare = vi.fn();

      const { container } = render(
        <PlanetBonusPanel state={state} onHoverSquare={onHoverSquare} />,
      );

      const cells = container.querySelectorAll(
        ".planet-bonus-panel__activity-cell",
      );
      fireEvent.pointerEnter(cells[1]);
      expect(onHoverSquare).toHaveBeenLastCalledWith(PLANETS[1]);

      fireEvent.pointerLeave(cells[1]);
      expect(onHoverSquare).toHaveBeenLastCalledWith(undefined);
    });

    it("ignores a touch tap on a planet activity cell, so no glow sticks after the tap", () => {
      const state = withActivityBonuses(
        [PLANETS[0], "large-points"],
        [PLANETS[1], "fuel"],
      );
      const onHoverSquare = vi.fn();

      const { container } = render(
        <PlanetBonusPanel state={state} onHoverSquare={onHoverSquare} />,
      );

      const cells = container.querySelectorAll(
        ".planet-bonus-panel__activity-cell",
      );
      firePointerEnter(cells[1], "touch");

      expect(onHoverSquare).not.toHaveBeenCalled();
    });

    it("glows exactly the slot whose square matches glowSquare, and none by default", () => {
      const state = withActivityBonuses(
        [PLANETS[0], "large-points"],
        [PLANETS[1], "fuel"],
      );

      const { container: plain } = render(<PlanetBonusPanel state={state} />);
      expect(
        plain.querySelectorAll(".planet-bonus-panel__activity-cell--glow"),
      ).toHaveLength(0);
      cleanup();

      const { container } = render(
        <PlanetBonusPanel state={state} glowSquare={PLANETS[1]} />,
      );
      const cells = container.querySelectorAll(
        ".planet-bonus-panel__activity-cell",
      );
      expect(cells[1]).toHaveClass("planet-bonus-panel__activity-cell--glow");
      expect(cells[0]).not.toHaveClass(
        "planet-bonus-panel__activity-cell--glow",
      );
    });
  });
});
