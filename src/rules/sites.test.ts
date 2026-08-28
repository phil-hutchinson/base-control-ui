import { describe, expect, it } from "vitest";
import { BAYS } from "./bays";
import { COLUMN_LETTERS, squareAt, squareName, type Square } from "./board";
import {
  CHARGED_LIFE_PLIES,
  DORMANT_COOLDOWN_PLIES,
  SITES,
  STAGGERED_OPENING_CHARGED_SITES,
  TARGET_CHARGED_SITES,
  hasChargedNodeFinished,
  hasDormantSiteFinishedCooling,
  siteCyclePosition,
  startingSiteStatus,
} from "./sites";

const COLUMN_INDEX = new Map(
  COLUMN_LETTERS.map((letter, index) => [letter, index]),
);
const COLUMN_AT = new Map(
  COLUMN_LETTERS.map((letter, index) => [index, letter]),
);

/** The square that mirrors the given one across column H. */
function mirrorAcrossColumnH(square: Square): Square {
  const index = COLUMN_INDEX.get(square.column);
  if (index === undefined) {
    throw new Error(`unknown column ${square.column}`);
  }
  const mirroredColumn = COLUMN_AT.get(14 - index);
  if (mirroredColumn === undefined) {
    throw new Error("mirror across column H left the board");
  }
  return squareAt(mirroredColumn, square.row);
}

/** The square that mirrors the given one across row 8. */
function mirrorAcrossRow8(square: Square): Square {
  return squareAt(square.column, 16 - square.row);
}

describe("sites", () => {
  it("has exactly seventeen sites, no duplicates", () => {
    expect(SITES).toHaveLength(17);
    const names = new Set(SITES.map(squareName));
    expect(names.size).toBe(17);
  });

  it("lies entirely in the interior of the board", () => {
    for (const site of SITES) {
      expect(site.column).not.toBe("A");
      expect(site.column).not.toBe("O");
      expect(site.row).not.toBe(1);
      expect(site.row).not.toBe(15);
    }
  });

  it("is unchanged by a mirror across column H", () => {
    const names = new Set(SITES.map(squareName));

    for (const site of SITES) {
      const mirrored = mirrorAcrossColumnH(site);
      expect(names.has(squareName(mirrored))).toBe(true);
    }
  });

  it("is unchanged by a mirror across row 8", () => {
    const names = new Set(SITES.map(squareName));

    for (const site of SITES) {
      const mirrored = mirrorAcrossRow8(site);
      expect(names.has(squareName(mirrored))).toBe(true);
    }
  });

  it("shares no square with a bay", () => {
    const bayNames = new Set(BAYS.map(squareName));
    for (const site of SITES) {
      expect(bayNames.has(squareName(site))).toBe(false);
    }
  });

  it("matches §3.2's table row by row", () => {
    const expected = [
      "F2",
      "J2",
      "B4",
      "H4",
      "N4",
      "E5",
      "K5",
      "D8",
      "H8",
      "L8",
      "E11",
      "K11",
      "B12",
      "H12",
      "N12",
      "F14",
      "J14",
    ];

    expect(SITES.map(squareName)).toEqual(expected);
  });
});

describe("the board's charged target (rules.md §8.1, §8.2)", () => {
  it("aims to keep five sites charged", () => {
    expect(TARGET_CHARGED_SITES).toBe(5);
  });
});

describe("starting site status (rules.md §8.1)", () => {
  it("has exactly five sites starting charged: H8, E5, K5, E11, K11", () => {
    const chargedNames = SITES.filter(
      (site) => startingSiteStatus(site)?.state === "charged",
    ).map(squareName);

    expect(new Set(chargedNames)).toEqual(
      new Set(["H8", "E5", "K5", "E11", "K11"]),
    );
    expect(chargedNames).toHaveLength(5);
  });

  it("has the other twelve sites starting active", () => {
    const activeSites = SITES.filter(
      (site) => startingSiteStatus(site)?.state === "active",
    );

    expect(activeSites).toHaveLength(12);
  });

  it("has no site starting dormant", () => {
    for (const site of SITES) {
      expect(startingSiteStatus(site)?.state).not.toBe("dormant");
    }
  });

  it("has no site status for a square that is not a site", () => {
    expect(startingSiteStatus(squareAt("G", 7))).toBeUndefined();
    expect(startingSiteStatus(squareAt("D", 15))).toBeUndefined();
  });

  it("matches the staggered-opening table's run-out plies, transcribed from rules.md §8.1", () => {
    const byName = new Map(
      STAGGERED_OPENING_CHARGED_SITES.map(({ square, runsOutAtEndOfPly }) => [
        squareName(square),
        runsOutAtEndOfPly,
      ]),
    );

    expect(byName).toEqual(
      new Map([
        ["H8", 9],
        ["E5", 7],
        ["K5", 2],
        ["E11", 4],
        ["K11", 5],
      ]),
    );
  });

  it("derives each opening site's enteredOnPly from its run-out ply", () => {
    for (const {
      square,
      runsOutAtEndOfPly,
    } of STAGGERED_OPENING_CHARGED_SITES) {
      const status = startingSiteStatus(square);
      expect(status?.state).toBe("charged");
      expect(status?.enteredOnPly).toBe(runsOutAtEndOfPly - CHARGED_LIFE_PLIES);
    }
  });

  it("is itself symmetric about column H and row 8", () => {
    const names = new Set(
      STAGGERED_OPENING_CHARGED_SITES.map(({ square }) => squareName(square)),
    );

    for (const { square } of STAGGERED_OPENING_CHARGED_SITES) {
      expect(names.has(squareName(mirrorAcrossColumnH(square)))).toBe(true);
      expect(names.has(squareName(mirrorAcrossRow8(square)))).toBe(true);
    }
  });
});

describe("the site clocks (rules.md §8.3, §8.2)", () => {
  it("has both clocks at nine turns", () => {
    expect(CHARGED_LIFE_PLIES).toBe(9);
    expect(DORMANT_COOLDOWN_PLIES).toBe(9);
  });

  it("has a charged node finish nine turns after the ply it was charged on, not counting that ply", () => {
    const chargedOnPly = 1;

    for (let ply = chargedOnPly; ply <= chargedOnPly + 8; ply++) {
      expect(hasChargedNodeFinished(chargedOnPly, ply)).toBe(false);
    }
    expect(hasChargedNodeFinished(chargedOnPly, chargedOnPly + 9)).toBe(true);
    expect(hasChargedNodeFinished(chargedOnPly, chargedOnPly + 20)).toBe(true);
  });

  it("has a dormant site finish cooling nine turns after the ply it went dormant on, not counting that ply", () => {
    const wentDormantOnPly = 9;

    for (let ply = wentDormantOnPly; ply <= wentDormantOnPly + 8; ply++) {
      expect(hasDormantSiteFinishedCooling(wentDormantOnPly, ply)).toBe(false);
    }
    expect(
      hasDormantSiteFinishedCooling(wentDormantOnPly, wentDormantOnPly + 9),
    ).toBe(true);
    expect(
      hasDormantSiteFinishedCooling(wentDormantOnPly, wentDormantOnPly + 20),
    ).toBe(true);
  });

  it("works the eighteen-ply round trip: charged at the end of ply 1, runs out at the end of ply 10, active again at the end of ply 19", () => {
    const chargedOnPly = 1;

    // Charged for plies 2 through 10; finished as of ply 10.
    expect(hasChargedNodeFinished(chargedOnPly, 9)).toBe(false);
    expect(hasChargedNodeFinished(chargedOnPly, 10)).toBe(true);

    // Dormant with enteredOnPly 10; finished cooling as of ply 19.
    const wentDormantOnPly = 10;
    expect(hasDormantSiteFinishedCooling(wentDormantOnPly, 18)).toBe(false);
    expect(hasDormantSiteFinishedCooling(wentDormantOnPly, 19)).toBe(true);
  });
});

describe("the site cycle position (rules.md §8.3, §8.2)", () => {
  /** The last ply a node charged on `enteredOnPly` is still displayed charged. */
  function lastChargedPly(enteredOnPly: number): number {
    let ply = enteredOnPly;
    while (!hasChargedNodeFinished(enteredOnPly, ply)) {
      ply++;
    }
    return ply;
  }

  /** The last ply a site that went dormant on `enteredOnPly` is still displayed dormant. */
  function lastDormantPly(enteredOnPly: number): number {
    let ply = enteredOnPly + 1;
    while (!hasDormantSiteFinishedCooling(enteredOnPly, ply)) {
      ply++;
    }
    return ply;
  }

  it("has charged report 0 on the first ply after it was charged", () => {
    const enteredOnPly = 5;
    expect(siteCyclePosition("charged", enteredOnPly, enteredOnPly + 1)).toBe(
      0,
    );
  });

  it("has charged report 1 on the last ply hasChargedNodeFinished says it is still running", () => {
    const enteredOnPly = 5;
    const lastPly = lastChargedPly(enteredOnPly);
    expect(siteCyclePosition("charged", enteredOnPly, lastPly)).toBe(1);
  });

  it("has charged travel nine distinct, strictly increasing positions", () => {
    const enteredOnPly = 5;
    const lastPly = lastChargedPly(enteredOnPly);

    const positions: number[] = [];
    for (let ply = enteredOnPly + 1; ply <= lastPly; ply++) {
      positions.push(siteCyclePosition("charged", enteredOnPly, ply) as number);
    }

    expect(positions).toHaveLength(9);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it("has dormant report 0 on the first ply after it went dormant", () => {
    const enteredOnPly = 9;
    expect(siteCyclePosition("dormant", enteredOnPly, enteredOnPly + 1)).toBe(
      0,
    );
  });

  it("has dormant report 1 on the last ply hasDormantSiteFinishedCooling says it is still cooling", () => {
    const enteredOnPly = 9;
    const lastPly = lastDormantPly(enteredOnPly);
    expect(siteCyclePosition("dormant", enteredOnPly, lastPly)).toBe(1);
  });

  it("has dormant travel nine distinct, strictly increasing positions", () => {
    const enteredOnPly = 9;
    const lastPly = lastDormantPly(enteredOnPly);

    const positions: number[] = [];
    for (let ply = enteredOnPly + 1; ply <= lastPly; ply++) {
      positions.push(siteCyclePosition("dormant", enteredOnPly, ply) as number);
    }

    expect(positions).toHaveLength(9);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it("clamps values outside the window to 0 or 1", () => {
    expect(siteCyclePosition("charged", 5, 1)).toBe(0);
    expect(siteCyclePosition("charged", 5, 100)).toBe(1);
    expect(siteCyclePosition("dormant", 9, 1)).toBe(0);
    expect(siteCyclePosition("dormant", 9, 100)).toBe(1);
  });

  it("reports nothing for active, which has no clock", () => {
    expect(siteCyclePosition("active", 5, 5)).toBeUndefined();
  });

  it("reports a defined position for the staggered opening five, even with a negative enteredOnPly", () => {
    for (const { square } of STAGGERED_OPENING_CHARGED_SITES) {
      const status = startingSiteStatus(square);
      const position = siteCyclePosition("charged", status!.enteredOnPly, 1);
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThanOrEqual(1);
    }
  });
});
