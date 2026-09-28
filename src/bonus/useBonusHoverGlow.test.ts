// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ActivityBonusKind } from "../rules/activityBonus";
import type { Square } from "../rules/board";
import { startingGameState, type GameState } from "../rules/gameState";
import { PLANETS } from "../rules/planets";
import { useBonusHoverGlow } from "./useBonusHoverGlow";

afterEach(cleanup);

const SEED = 12345;

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

describe("useBonusHoverGlow", () => {
  it("starts with no glow, and reports whatever square onHoverSquare is given", () => {
    const state = withActivityBonuses(
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

  it("clears the glow once a claim replaces the hovered bonus", () => {
    const before = withActivityBonuses(
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
      activityBonuses: [
        { square: PLANETS[2], kind: "node-scramble" },
        { square: PLANETS[1], kind: "additional-nodes" },
      ],
    };
    rerender({ state: after });

    expect(result.current.glowSquare).toBeUndefined();
  });

  it("leaves the glow alone when the hovered square still carries a bonus", () => {
    const before = withActivityBonuses(
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
      activityBonuses: [
        { square: PLANETS[2], kind: "node-scramble" },
        { square: PLANETS[1], kind: "additional-nodes" },
      ],
    };
    rerender({ state: after });

    expect(result.current.glowSquare).toBe(PLANETS[1]);
  });

  it("clears a hover left over from a claim, even if a later bonus in the same game lands back on that square", () => {
    const before = withActivityBonuses(
      [PLANETS[0], "large-points"],
      [PLANETS[1], "fuel"],
    );
    const { result, rerender } = renderHook(
      ({ state }: { state: GameState }) => useBonusHoverGlow(state),
      { initialProps: { state: before } },
    );

    // Hovered while it was a bonus planet, and the pointer never reports
    // leaving — the usual way a player claims it is by clicking it while
    // already hovering it.
    act(() => {
      result.current.onHoverSquare(PLANETS[0]);
    });
    expect(result.current.glowSquare).toBe(PLANETS[0]);

    // PLANETS[0] is claimed: it drops out of the bonus set entirely for a
    // while.
    const claimed: GameState = {
      ...before,
      activityBonuses: [
        { square: PLANETS[2], kind: "node-scramble" },
        { square: PLANETS[1], kind: "additional-nodes" },
      ],
    };
    rerender({ state: claimed });
    expect(result.current.glowSquare).toBeUndefined();

    // Later, still the same game, a bonus is dealt back onto PLANETS[0].
    const dealtAgain: GameState = {
      ...before,
      activityBonuses: [
        { square: PLANETS[0], kind: "small-points" },
        { square: PLANETS[1], kind: "additional-nodes" },
      ],
    };
    rerender({ state: dealtAgain });

    expect(result.current.glowSquare).toBeUndefined();
  });

  it("clears a hover left over from an earlier game, even if the new game deals a bonus onto the same square", () => {
    const before = withActivityBonuses(
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

    // A fresh game (a different opening seed) whose bonus set happens to
    // include the same square the player was hovering in the last one.
    const freshGame: GameState = {
      ...withActivityBonuses(
        [PLANETS[0], "small-points"],
        [PLANETS[2], "node-scramble"],
      ),
      openingSeed: before.openingSeed + 1,
    };
    rerender({ state: freshGame });

    expect(result.current.glowSquare).toBeUndefined();
  });
});
