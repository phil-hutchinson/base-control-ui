// A game's state, boiled down to what both ends of an online game know:
// `canonicalState` writes it as a fixed-shape JSON string, and `stateHash`
// takes a 64-bit FNV-1a hash of it so the server and a client can compare
// one short string instead of the whole state. This detects a desync; it
// is not a security check.

import { squareName } from "../rules/board";
import { nodeSquares, type GameState } from "../rules/gameState";

/**
 * A JSON string built with a fixed key order and every key always present —
 * an absent value is written as `null`, never omitted — so two states that
 * agree on everything the hash covers produce character-for-character the
 * same string regardless of how each got there (`state.nodes`'s own key
 * order, for instance, records history and is never read here; node order
 * comes from `nodeSquares`, which walks the board instead).
 *
 * Holds: the setup's rule fields, under the setup's own names; the side to
 * move; the ply number; energy; the ships in state order (side, square,
 * power); the nodes in board order (square, state, level, signal); the
 * bonus planets per side (square, claimed-on ply); the activity bonuses in
 * slot order (square, kind); and the rotators, in board order. Leaves out
 * the seed, which a client never has, and the artwork, which is not a rule.
 * Content is ASCII throughout — square names, setting strings, numbers,
 * booleans — which `stateHash` relies on.
 */
export function canonicalState(state: GameState): string {
  const fleetSize = state.ships.filter((ship) => ship.side === "green").length;

  const canonical = {
    playstyle: state.nodePlaystyle,
    rounds: state.lengthInRounds,
    fleetSize,
    chargedNodes: state.chargedNodeCount,
    combat: state.combatEnabled,
    scoring: state.scoring,
    planetBonus: state.planetBonus,
    planetActivity: state.planetActivity,
    playerMatching: state.playerMatching,
    sideToMove: state.sideToMove,
    plyNumber: state.plyNumber,
    energy: { green: state.energy.green, red: state.energy.red },
    ships: state.ships.map((ship) => ({
      side: ship.side,
      square: squareName(ship.square),
      power: ship.power,
    })),
    nodes: nodeSquares(state).map((square) => {
      const status = state.nodes[squareName(square)];
      return {
        square: squareName(square),
        state: status.state,
        level: status.level,
        signal: status.signal ?? null,
      };
    }),
    bonusPlanets: {
      green: state.bonusPlanets.green.map((entry) => ({
        square: squareName(entry.square),
        claimedOnPly: entry.claimedOnPly ?? null,
      })),
      red: state.bonusPlanets.red.map((entry) => ({
        square: squareName(entry.square),
        claimedOnPly: entry.claimedOnPly ?? null,
      })),
    },
    activityBonuses: state.activityBonuses.map((entry) => ({
      square: squareName(entry.square),
      kind: entry.kind,
    })),
    rotators: state.rotators.map((square) => squareName(square)),
  };

  return JSON.stringify(canonical);
}

const FNV_OFFSET_BASIS_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

/**
 * The 64-bit FNV-1a hash of `text`, written as 16 lower-case hex digits,
 * zero-padded. `text` must be ASCII — every character code below 128 — so
 * its character codes are its UTF-8 bytes and no `TextEncoder` is needed
 * (there is none without the DOM library the core is built without). Used
 * on `canonicalState`'s output, which is ASCII by construction, but kept as
 * its own function so the published FNV-1a reference values can be tested
 * directly against arbitrary text.
 */
export function fnv1a64(text: string): string {
  let hash = FNV_OFFSET_BASIS_64;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code >= 128) {
      throw new RangeError(
        `fnv1a64: text must be ASCII, got character code ${code} at index ${index}`,
      );
    }
    hash ^= BigInt(code);
    hash = (hash * FNV_PRIME_64) & MASK_64;
  }
  return hash.toString(16).padStart(16, "0");
}

/** The 64-bit FNV-1a hash of `canonicalState(state)`, as 16 hex digits. */
export function stateHash(state: GameState): string {
  return fnv1a64(canonicalState(state));
}
