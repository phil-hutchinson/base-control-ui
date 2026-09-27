// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AdvancedBonusKind } from "../rules/advancedBonus";
import type { Square } from "../rules/board";
import { startingGameState, type GameState } from "../rules/gameState";
import { PLANETS } from "../rules/planets";
import { useBonusHoverGlow } from "./useBonusHoverGlow";

afterEach(cleanup);

const SEED = 12345;

function withAdvancedBonuses(
  first: readonly [Square, AdvancedBonusKind],
  second: readonly [Square, AdvancedBonusKind],
): GameState {
  const base = startingGameState(SEED, {
    nodePlaystyle: "steal",
    planetBonus: "advanced",
  });
  return {
    ...base,
    advancedBonuses: [
      { square: first[0], kind: first[1] },
      { square: second[0], kind: second[1] },
    ],
  };
}

describe("useBonusHoverGlow", () => {
  it("starts with no glow, and reports whatever square onHoverSquare is given", () => {
    const state = withAdvancedBonuses(
      [PLANETS[0], "large-points"],
      [PLANETS[1], "fuel"],
    );
    const { result } = renderHook(() => useBonusHoverGlow(state));

    expect(result.current.glowSquare).toBeUndefined();

    act(() => {
      result.current.onHoverSquare(PLANETS[0]);
    });
    expect(result.current.glowSquare).toBe(PLANETS[0]);

    act(() => {
      result.current.onHoverSquare(undefined);
    });
    expect(result.current.glowSquare).toBeUndefined();
  });

  it("clears the glow once a claim replaces the hovered bonus", async () => {
    const before = withAdvancedBonuses(
      [PLANETS[0], "large-points"],
      [PLANETS[1], "fuel"],
    );
    const { result, rerender } = renderHook(
      ({ state }: { state: GameState }) => useBonusHoverGlow(state),
      { initialProps: { state: before } },
    );

    act(() => {
      result.current.onHoverSquare(PLANETS[0]);
    });
    expect(result.current.glowSquare).toBe(PLANETS[0]);

    // PLANETS[0]'s bonus (slot 0) was claimed and replaced by a new one on
    // PLANETS[2]; the survivor (PLANETS[1]) changed kind but kept its square.
    const after: GameState = {
      ...before,
      advancedBonuses: [
        { square: PLANETS[2], kind: "node-scramble" },
        { square: PLANETS[1], kind: "additional-nodes" },
      ],
    };
    rerender({ state: after });

    await waitFor(() => {
      expect(result.current.glowSquare).toBeUndefined();
    });
  });

  it("leaves the glow alone when the hovered square still carries a bonus", async () => {
    const before = withAdvancedBonuses(
      [PLANETS[0], "large-points"],
      [PLANETS[1], "fuel"],
    );
    const { result, rerender } = renderHook(
      ({ state }: { state: GameState }) => useBonusHoverGlow(state),
      { initialProps: { state: before } },
    );

    act(() => {
      result.current.onHoverSquare(PLANETS[1]);
    });

    // Slot 0's bonus is claimed and replaced; slot 1 (the hovered one)
    // survives with a new kind but the same square.
    const after: GameState = {
      ...before,
      advancedBonuses: [
        { square: PLANETS[2], kind: "node-scramble" },
        { square: PLANETS[1], kind: "additional-nodes" },
      ],
    };
    rerender({ state: after });

    await waitFor(() => {
      expect(result.current.glowSquare).toBe(PLANETS[1]);
    });
  });
});
