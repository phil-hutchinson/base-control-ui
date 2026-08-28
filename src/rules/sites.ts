// The seventeen site squares (rules.md §3.2), the three states a site can be
// in (rules.md §8.1), and the two nine-ply clocks that govern how long a
// site stays charged (§8.3) and how long it stays dormant (§8.2).

import { type Square, squareAt, squareName } from "./board";

/**
 * The seventeen site squares, in the row order rules.md §3.2 lists them
 * (bottom to top, left to right within a row).
 */
export const SITES: readonly Square[] = [
  // Row 2
  squareAt("F", 2),
  squareAt("J", 2),
  // Row 4
  squareAt("B", 4),
  squareAt("H", 4),
  squareAt("N", 4),
  // Row 5
  squareAt("E", 5),
  squareAt("K", 5),
  // Row 8
  squareAt("D", 8),
  squareAt("H", 8),
  squareAt("L", 8),
  // Row 11
  squareAt("E", 11),
  squareAt("K", 11),
  // Row 12
  squareAt("B", 12),
  squareAt("H", 12),
  squareAt("N", 12),
  // Row 14
  squareAt("F", 14),
  squareAt("J", 14),
];

/** The three states a site can be in (rules.md §8.1). */
export type SiteState = "active" | "charged" | "dormant";

/**
 * How many turns a charged node stays charged (rules.md §8.3), not counting
 * the turn at whose end it was charged.
 */
export const CHARGED_LIFE_PLIES = 9;

/**
 * How many turns a dormant site cools down for before it goes active again
 * (rules.md §8.2), not counting the turn it went dormant on.
 */
export const DORMANT_COOLDOWN_PLIES = 9;

/**
 * How many sites the board aims to keep charged at all times (rules.md
 * §8.1, §8.2). This is an aim, not an invariant: the board charges up to
 * this many active sites at the end of every turn, and falls short when
 * there are not enough active sites to reach it.
 */
export const TARGET_CHARGED_SITES = 5;

/**
 * The five sites that start the game charged (rules.md §8.1), and the turn
 * at whose end each one runs out, transcribed literally from the document's
 * staggered-opening table. The other twelve sites start active, and none
 * starts dormant.
 */
export const STAGGERED_OPENING_CHARGED_SITES: readonly {
  readonly square: Square;
  readonly runsOutAtEndOfPly: number;
}[] = [
  { square: squareAt("H", 8), runsOutAtEndOfPly: 9 },
  { square: squareAt("E", 5), runsOutAtEndOfPly: 7 },
  { square: squareAt("K", 5), runsOutAtEndOfPly: 2 },
  { square: squareAt("E", 11), runsOutAtEndOfPly: 4 },
  { square: squareAt("K", 11), runsOutAtEndOfPly: 5 },
];

/**
 * `STAGGERED_OPENING_CHARGED_SITES`, keyed by square name, with each site's
 * `enteredOnPly` derived from its run-out ply
 * (`runsOutAtEndOfPly - CHARGED_LIFE_PLIES`). Four of the five come out
 * negative — the site's clock started before the game did, which is exactly
 * what "staggered" means for an opening node: `enteredOnPly` is read only
 * through subtraction, so a negative value is arithmetically fine, and
 * `siteCyclePosition` clamps its result to [0, 1] regardless.
 */
const STAGGERED_OPENING_BY_NAME: ReadonlyMap<
  string,
  { readonly state: "charged"; readonly enteredOnPly: number }
> = new Map(
  STAGGERED_OPENING_CHARGED_SITES.map(({ square, runsOutAtEndOfPly }) => [
    squareName(square),
    {
      state: "charged",
      enteredOnPly: runsOutAtEndOfPly - CHARGED_LIFE_PLIES,
    },
  ]),
);

const SITE_NAMES: ReadonlySet<string> = new Set(SITES.map(squareName));

/**
 * The state and `enteredOnPly` a site starts the game in, or `undefined` if
 * the given square is not a site at all (rules.md §8.1). The staggered
 * opening five are `charged`, with an `enteredOnPly` derived from their
 * run-out ply (see `STAGGERED_OPENING_BY_NAME`); every other site is
 * `active`, with an `enteredOnPly` of 0 — a value nothing reads, since
 * active has no clock.
 */
export function startingSiteStatus(
  square: Square,
): { readonly state: SiteState; readonly enteredOnPly: number } | undefined {
  const name = squareName(square);
  if (!SITE_NAMES.has(name)) {
    return undefined;
  }
  const staggered = STAGGERED_OPENING_BY_NAME.get(name);
  return staggered ?? { state: "active", enteredOnPly: 0 };
}

/**
 * Whether a node charged on `enteredOnPly` has finished its nine turns as of
 * `plyNumber` (rules.md §8.3). `enteredOnPly` is the ply at whose end the
 * site was charged, so this is true from `enteredOnPly + CHARGED_LIFE_PLIES`
 * onwards.
 */
export function hasChargedNodeFinished(
  enteredOnPly: number,
  plyNumber: number,
): boolean {
  return plyNumber - enteredOnPly >= CHARGED_LIFE_PLIES;
}

/**
 * Whether a site that went dormant on `enteredOnPly` has finished cooling
 * down as of `plyNumber` (rules.md §8.2). `enteredOnPly` is the ply at whose
 * end the site went dormant, so this is true from
 * `enteredOnPly + DORMANT_COOLDOWN_PLIES` onwards.
 */
export function hasDormantSiteFinishedCooling(
  enteredOnPly: number,
  plyNumber: number,
): boolean {
  return plyNumber - enteredOnPly >= DORMANT_COOLDOWN_PLIES;
}

/**
 * How far a charged or dormant site is through its clock, as a proportion
 * from 0 (the first turn it is seen in that state) to 1 (its last). Active
 * has no clock, so this reports `undefined` for it. Both clocked states
 * measure plies since the end of the ply the state was entered on, so
 * neither counts that ply itself: `elapsed` starts at 0 one ply after
 * `enteredOnPly`.
 */
export function siteCyclePosition(
  state: SiteState,
  enteredOnPly: number,
  plyNumber: number,
): number | undefined {
  let denominator: number;

  if (state === "charged") {
    denominator = CHARGED_LIFE_PLIES - 1;
  } else if (state === "dormant") {
    denominator = DORMANT_COOLDOWN_PLIES - 1;
  } else {
    return undefined;
  }

  const elapsed = plyNumber - enteredOnPly - 1;

  if (denominator <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, elapsed / denominator));
}
