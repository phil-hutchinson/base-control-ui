// Applying a move or an attack, and the ply each one ends (rules.md §5, §3.1,
// §6, §7). Both spend the acting ship's power (§6): a move deducts its own
// cost, and an attack deducts the cost of the shape it struck down. A move is
// either refused, with the reason from movement.ts, or applied: the ship
// arrives with the power it had left after paying. A ship that ends a move on
// a planet recovers there at a point per turn (§3.1, §4.1), through the
// end-of-turn sequence — not on arrival. An attack is either refused, with
// the reason from combat.ts, or resolved: both ships are placed on planets
// drawn at random from the planets standing empty, attacker first; the
// attacker arrives having already paid the shot's cost, the defender carries
// what it had before the fight untouched, and both squares they left are
// left empty. There is no winner and no advance. An attack never changes a
// node's state — a node's state changes only in the end-of-turn sequence
// (rules.md §8.6) — but a move is the one knowing exception: leaving a
// charged node depletes it on the spot, as the move resolves, and stepping
// onto one with no countdown starts one (§8.3, `applyMove` below). A landing
// is the second: under the planet and dedicated settings, a ship landing on
// a planet or a rotator rotates the queue on the spot, before the end-of-turn
// sequence ever runs (§8.2). A landing on a planet may also pay a planet
// bonus, immediately: the classic setting pays if it is on and the planet is
// one of the landing side's unclaimed three (§3.4); under steal, planet
// resources (steal.md §10) instead claims one of the board's two contested bonuses if
// the planet carries one, whoever's landing it is. A fight's two landings are
// each checked in turn, attacker's first, and under planet resources the
// attacker's claim resolves in full — including the bonus pair it leaves behind — before
// the defender's own return planet is even drawn (steal.md §10, `applyAttack`
// below). A turn is one move or one attack (§5), so every move and every
// attack ends the ply: play always passes to the other side. The pass guard
// covers the case §5 sets out for when the side to move can neither move nor
// attack at all.

import { sideToMoveCanMoveOrAttack } from "./canMoveOrAttack";
import { type Square, squareName } from "./board";
import { CHARGED_COUNTDOWN_PLIES, EXIT_COUNTDOWN_PLIES } from "./countdown";
import {
  type AttackRefusalReason,
  attackReach,
  attackRefusalReason,
  drawReturnPlanet,
} from "./combat";
import { isPlanet } from "./planets";
import { planetBonusPoints } from "./planetBonus";
import {
  type ActivityBonusKind,
  resolveActivityBonusClaim,
} from "./activityBonus";
import { type EndOfTurnEffect, runEndOfTurn } from "./endOfTurn";
import { otherSide, type Side, type ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import { type GameState, type Ship, shipsBySquare } from "./gameState";
import {
  type MoveRefusalReason,
  findShip,
  moveRefusalReason,
  shapeReaching,
} from "./movement";
import {
  type NodePriority,
  rotateQueue,
  snapshotInactivePriorities,
} from "./nodeQueue";
import { type PowerLevel, spendPower } from "./power";
import { abandonNode, claimNode, type NodeSignal } from "./steal";

/** Why the side to move's ply passed instead of moving or attacking (rules.md §5). */
export type PassReason = "cannot-move-or-attack" | "out-of-time";

/** The side to move's ply passed instead of a move or an attack being made (rules.md §5). */
export interface PassEffect {
  readonly type: "ply-passed";
  readonly side: Side;
  readonly sideToMove: Side;
  readonly reason: PassReason;
  readonly endOfTurn: readonly EndOfTurnEffect[];
}

/** A ply ended because a move or an attack was made (rules.md §5, §8.6). */
export interface PlyEndedEffect {
  readonly type: "ply-ended";
  readonly side: Side;
  readonly sideToMove: Side;
  readonly endOfTurn: readonly EndOfTurnEffect[];
}

/**
 * The two effects that can close out a ply, shared by a move and an attack
 * alike rather than tied to either specifically.
 */
export type EndOfPlyEffect = PlyEndedEffect | PassEffect;

/**
 * A charged node depleted the instant its holder left it (rules.md §8.3):
 * the square the ship moved away from. Raised only by a move that leaves a
 * charged node, never by one that merely starts on an ordinary square or
 * arrives on one — leaving is what spends it, not the ship's presence
 * beforehand. Always the first effect a move carries, ahead of whichever
 * `EndOfPlyEffect` closes it out, so a listener hears the node spent
 * before hearing how the turn ended.
 */
export interface NodeSpentEffect {
  readonly type: "node-spent";
  readonly square: Square;
}

/** One ship's identity and side, naming the ship a claim left stranded (steal.md §3). */
export interface StrandedShip {
  readonly shipId: ShipId;
  readonly side: Side;
}

/**
 * A ship claimed a node under steal by landing on one of its prospective
 * squares (steal.md §3): `square` is the square just charged, with the
 * claiming ship (`shipId`, `side`) aboard. `releasedSquare` is the node's
 * previous charged square, present only when the node was Held — whether the
 * claim takes the node from an opponent or relocates the claiming side's own
 * one — and, if a ship of either side is still standing there once the move
 * has resolved, `strandedShip` names it: that ship is left on an ordinary
 * square, free to move next turn. `discardedSquares` is every other prospective
 * square the node had — empty for a Held node with no extra, one square for an
 * Open node with no extra or a Held node carrying one, two squares for an Open
 * node carrying an extra (steal.md §10). `newProspective` is the fresh
 * prospective square drawn for the node's signal (steal.md §6). Always after
 * any `NodeAbandonedEffect` the same move also raises — leaving comes before
 * claiming when one move does both (steal.md §5) — and before any
 * `PlanetBonusClaimedEffect`, since a prospective square is never a planet and
 * the two never fire on the same landing.
 */
export interface NodeClaimedEffect {
  readonly type: "node-claimed";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly signal: NodeSignal;
  readonly square: Square;
  readonly releasedSquare?: Square;
  readonly strandedShip?: StrandedShip;
  readonly discardedSquares: readonly Square[];
  readonly newProspective: Square;
}

/**
 * A ship moved off a node's charged square under steal, without landing on
 * that node's own prospective square (steal.md §4): `square` is the vacated
 * square, now ordinary board, and `newProspective` is the second prospective
 * square drawn for the node's signal, anchored on the one it already has
 * (steal.md §6). The node is Open afterwards. Raised ahead of any
 * `NodeClaimedEffect` the same move also raises — leaving comes first
 * (steal.md §5) — and never raised for a ship relocating onto its own node's
 * prospective square, where the claim rule alone applies.
 */
export interface NodeAbandonedEffect {
  readonly type: "node-abandoned";
  readonly signal: NodeSignal;
  readonly square: Square;
  readonly newProspective: Square;
}

/**
 * A ship's landing rotated the queue one step (rules.md §8.2): under the
 * planet setting, `square` is the planet it landed on; under dedicated, the
 * rotator it landed on and spent. Never raised under continuous, where
 * nothing a ply does ever rotates the queue directly. One effect per
 * rotation — a fight under planet returns both ships to planets and so
 * raises two, attacker's landing first — and each sits after any
 * `NodeSpentEffect` and before the `EndOfPlyEffect` that closes the ply out,
 * so a listener hears the node spent, then the rotation, then how the turn
 * ended.
 */
export interface QueueRotatedEffect {
  readonly type: "queue-rotated";
  readonly square: Square;
  readonly trigger: "planet" | "rotator";
}

/**
 * A ship's landing paid a planet bonus (rules.md §3.4): `side` is the side
 * paid, `square` the planet landed on, and `amount` what was paid — nothing
 * else, in particular no running total, since the payment is raised mid-turn
 * and the end-of-turn collection lands on top of it moments later. Sits
 * after any `NodeSpentEffect` and before the `QueueRotatedEffect` the same
 * landing may also raise: the payment is part of the arrival, and the
 * rotation is that arrival's consequence for the board. A fight raises the
 * attacker's claim (if any) before the defender's, matching the placement
 * order rules.md §7.1 fixes.
 */
export interface PlanetBonusClaimedEffect {
  readonly type: "planet-bonus-claimed";
  readonly side: Side;
  readonly square: Square;
  readonly amount: number;
}

/**
 * A ship's landing claimed one of the board's two contested bonuses under
 * planet resources (steal.md §10): `side` is the claiming side,
 * `square` the planet landed on and `kind` the bonus claimed there.
 * `pointsAwarded` is the energy a points kind paid (0 for every other kind);
 * `poweredShipIds` names every one of `side`'s ships a Fuel claim raised by a
 * point (empty for every other kind); `addedSquares` are the squares an
 * Additional nodes claim gave their nodes (empty for every other kind — a Node
 * scramble adds no square, it only shuffles the prospective squares' signals,
 * which the new node map already shows). `survivor` is the bonus that was not
 * claimed — unmoved; under race redrawn to a different kind, under stable
 * keeping its kind, so `newKind` equals `oldKind` — and `newBonus` is what
 * appeared in the claimed bonus's place. Sits where `PlanetBonusClaimedEffect`
 * sits: a fight raises the attacker's claim (if any) before the defender's,
 * matching the placement order rules.md §7.1 fixes, and steal.md §10's own
 * fight order resolves the attacker's claim, bonus pair and all, before the
 * defender's return planet is even drawn.
 */
export interface ActivityBonusClaimedEffect {
  readonly type: "activity-bonus-claimed";
  readonly side: Side;
  readonly square: Square;
  readonly kind: ActivityBonusKind;
  readonly pointsAwarded: number;
  readonly poweredShipIds: readonly ShipId[];
  readonly addedSquares: readonly Square[];
  readonly survivor: {
    readonly square: Square;
    readonly oldKind: ActivityBonusKind;
    readonly newKind: ActivityBonusKind;
  };
  readonly newBonus: {
    readonly square: Square;
    readonly kind: ActivityBonusKind;
  };
}

/** Something that happened as a result of applying a move, beyond the move itself. */
export type MoveEffect =
  | NodeSpentEffect
  | NodeAbandonedEffect
  | NodeClaimedEffect
  | PlanetBonusClaimedEffect
  | ActivityBonusClaimedEffect
  | QueueRotatedEffect
  | EndOfPlyEffect;

/**
 * A move applied successfully, with the resulting state and what happened.
 * `cost` is the power the shape spent (rules.md §6) and `powerAfter` is the
 * moving ship's power once that cost is paid — an orthogonal step costs
 * nothing, so `powerAfter` then equals the power the ship carried before.
 */
export interface AppliedMove {
  readonly outcome: "applied";
  readonly state: GameState;
  readonly effects: readonly MoveEffect[];
  readonly cost: PowerLevel;
  readonly powerAfter: PowerLevel;
}

/** A move that was not legal, carrying the reason (never a sentence). */
export interface RefusedMove {
  readonly outcome: "refused";
  readonly reason: MoveRefusalReason;
}

export type ApplyMoveResult = AppliedMove | RefusedMove;

/** One ship's identity, side, square and power level, as they stood before a fight. */
export interface FightShip {
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly power: PowerLevel;
}

/** One ship's journey back to a planet, from where it stood to where it landed. */
export interface FightReturn {
  readonly shipId: ShipId;
  readonly side: Side;
  readonly from: Square;
  readonly to: Square;
}

/**
 * A fight, resolved in full (rules.md §7): one effect for the whole fight
 * rather than several, since a fight is one fact. `attacker` and `defender`
 * describe both ships as they stood **before** the fight, including the
 * power each was carrying. `cost` is the power the attacking shape spent
 * (rules.md §6, §7): the attacker's power afterwards is `attacker.power`
 * less `cost`, and the defender's is `defender.power` untouched. `returns`
 * lists both ships placed on a planet, attacker first — every fight returns
 * exactly two ships.
 */
export interface FightResolvedEffect {
  readonly type: "fight-resolved";
  readonly attacker: FightShip;
  readonly defender: FightShip;
  readonly cost: PowerLevel;
  readonly returns: readonly FightReturn[];
}

/**
 * Something that happened as a result of applying an attack, beyond the
 * fight itself.
 */
export type AttackEffect =
  | FightResolvedEffect
  | PlanetBonusClaimedEffect
  | ActivityBonusClaimedEffect
  | QueueRotatedEffect
  | EndOfPlyEffect;

/** An attack applied successfully, with the resulting state and what happened. */
export interface AppliedAttack {
  readonly outcome: "applied";
  readonly state: GameState;
  readonly effects: readonly AttackEffect[];
}

/** An attack that was not legal, carrying the reason (never a sentence). */
export interface RefusedAttack {
  readonly outcome: "refused";
  readonly reason: AttackRefusalReason;
}

export type ApplyAttackResult = AppliedAttack | RefusedAttack;

/**
 * Passes the side to move's ply for `reason`: the end-of-turn sequence runs
 * for it (a passed ply is still a turn), the ply number advances and the
 * other side becomes the side to move (rules.md §5, §8.6). Shared by
 * `applyPassGuard` and `applyOutOfTimePass`, which differ only in why the
 * pass happens.
 */
function passPly(
  state: GameState,
  reason: PassReason,
): { readonly state: GameState; readonly effect: PassEffect } {
  const side = state.sideToMove;
  const sideToMove = otherSide(side);
  const endOfTurn = runEndOfTurn(state);
  const passedState: GameState = {
    ...endOfTurn.state,
    plyNumber: endOfTurn.state.plyNumber + 1,
    sideToMove,
  };

  return {
    state: passedState,
    effect: {
      type: "ply-passed",
      side,
      sideToMove,
      reason,
      endOfTurn: endOfTurn.effects,
    },
  };
}

/**
 * If the side to move can neither move nor attack — no legal move with any
 * of its ships and no legal attack target with any of them — its ply passes
 * (rules.md §5, §8.6). Only the side to move is checked — the side passed to
 * is not — so this makes exactly one pass, never a second one back.
 *
 * Once the game is over, neither a move nor an attack is ever legal (rules.md
 * §9), which is exactly the condition this guard fires on. Checked first,
 * ahead of `sideToMoveCanMoveOrAttack`, this returns the state untouched:
 * otherwise the guard would read "cannot move or attack" as a pass, run the
 * end-of-turn sequence for a ply that does not exist, and advance past the
 * end again on every subsequent call, without bound.
 */
export function applyPassGuard(state: GameState): {
  readonly state: GameState;
  readonly effect: PassEffect | undefined;
} {
  if (isGameOver(state)) {
    return { state, effect: undefined };
  }

  if (sideToMoveCanMoveOrAttack(state)) {
    return { state, effect: undefined };
  }

  return passPly(state, "cannot-move-or-attack");
}

/**
 * The side to move passes because its clock has run out (rules.md §5, §10).
 * Refused — returning `state` untouched with no effects — unless the game is
 * not over **and** the side to move is genuinely out of time
 * (`state.outOfTime`). That refusal is deliberate and load-bearing: without
 * it, this would quietly become a pass button a player could use with time
 * still on the clock, which is out of scope.
 *
 * Otherwise the ply passes with reason "out of time", and the result is run
 * through `applyPassGuard` exactly as `applyMove` and `applyAttack` run their
 * own tail, so the side passed to never sits unable to move or attack. The
 * returned effects are therefore in order: the out-of-time pass, and — if the
 * guard fired — the cannot-move-or-attack pass that followed it.
 */
export function applyOutOfTimePass(state: GameState): {
  readonly state: GameState;
  readonly effects: readonly PassEffect[];
} {
  if (isGameOver(state) || !state.outOfTime[state.sideToMove]) {
    return { state, effects: [] };
  }

  const { state: passedState, effect } = passPly(state, "out-of-time");
  const effects: PassEffect[] = [effect];

  const { state: settled, effect: followingPass } = applyPassGuard(passedState);
  if (followingPass !== undefined) {
    effects.push(followingPass);
  }

  return { state: settled, effects };
}

/**
 * Runs the tail every move and every attack shares once its own effects have
 * been applied: a turn is one move or one attack (rules.md §5), so this
 * unconditionally runs the end-of-turn sequence, advances the ply number and
 * swaps the side to move, recording a `ply-ended` effect; then runs
 * `applyPassGuard`, recording a `ply-passed` effect if it fires. Mutates
 * `effects` by appending the `ply-ended` effect and whichever pass effect
 * follows it, and returns the resulting state. `effects` is typed to accept
 * either caller's effect list, since both `MoveEffect` and `AttackEffect`
 * include `EndOfPlyEffect` as one of their members.
 *
 * `reportedPriorities`, if given, is passed straight through to
 * `runEndOfTurn` — the priorities a landing rotated away from before this
 * ply's own move or attack got here (`rotateForLanding`, below).
 */
function endPly(
  state: GameState,
  effects: (MoveEffect | AttackEffect)[],
  reportedPriorities?: Readonly<Record<string, NodePriority>>,
): GameState {
  const side = state.sideToMove;
  const sideToMove = otherSide(side);
  const endOfTurn = runEndOfTurn(state, reportedPriorities);
  const next: GameState = {
    ...endOfTurn.state,
    plyNumber: endOfTurn.state.plyNumber + 1,
    sideToMove,
  };
  effects.push({
    type: "ply-ended",
    side,
    sideToMove,
    endOfTurn: endOfTurn.effects,
  });

  const { state: settled, effect: passEffect } = applyPassGuard(next);
  if (passEffect !== undefined) {
    effects.push(passEffect);
  }

  return settled;
}

/**
 * Rotates the queue once if `destination` triggers it under `state`'s
 * chosen setting (rules.md §8.2): a planet, under planet, or a rotator —
 * consumed as it lands — under dedicated. Under continuous, and under
 * planet or dedicated when `destination` is neither, nothing happens and
 * `state` is returned unchanged. Shared by `applyMove`, which calls this
 * once, and `applyAttack`, which calls it twice — attacker's return square
 * first, then the defender's — threading the state returned by the first
 * call into the second, so two rotations in the same fight compose.
 */
function rotateForLanding(
  state: GameState,
  destination: Square,
): {
  readonly state: GameState;
  readonly effect: QueueRotatedEffect | undefined;
} {
  if (state.nodePlaystyle === "planet") {
    if (!isPlanet(destination)) {
      return { state, effect: undefined };
    }
    return {
      state: { ...state, nodes: rotateQueue(state.nodes) },
      effect: { type: "queue-rotated", square: destination, trigger: "planet" },
    };
  }

  if (state.nodePlaystyle === "dedicated") {
    const destinationSquareName = squareName(destination);
    const rotatorIndex = state.rotators.findIndex(
      (square) => squareName(square) === destinationSquareName,
    );
    if (rotatorIndex === -1) {
      return { state, effect: undefined };
    }
    const rotators = state.rotators.filter(
      (_, index) => index !== rotatorIndex,
    );
    return {
      state: { ...state, nodes: rotateQueue(state.nodes), rotators },
      effect: {
        type: "queue-rotated",
        square: destination,
        trigger: "rotator",
      },
    };
  }

  return { state, effect: undefined };
}

/**
 * Pays a classic planet bonus if `square` triggers one for `side` landing
 * there (rules.md §3.4), modelled on `rotateForLanding` above: does nothing
 * at all — returning `state` unchanged — when the planet bonus setting is
 * off (always the case under steal, whose planet resources claims are a
 * separate path — steal.md §10),
 * when `square` is not one of `side`'s three dealt planets, or when
 * `side` has already claimed it. Otherwise it does two things at once:
 * `side`'s energy rises by `planetBonusPoints(state.planetBonus)`, and that
 * planet's entry in `state.bonusPlanets` records `state.plyNumber` — the ply
 * the landing happened on, since `endPly` has not yet advanced it. Shared by
 * `applyMove`, which calls this once, and `applyAttack`, which calls it
 * twice — the attacker's return planet first, then the defender's —
 * threading the state returned by the first call into the second, so two
 * claims in the same fight compose exactly as two rotations already do.
 */
function claimPlanetBonus(
  state: GameState,
  side: Side,
  square: Square,
): {
  readonly state: GameState;
  readonly effect: PlanetBonusClaimedEffect | undefined;
} {
  if (state.planetBonus === "off") {
    return { state, effect: undefined };
  }

  const landedSquareName = squareName(square);
  const entries = state.bonusPlanets[side];
  const entryIndex = entries.findIndex(
    (entry) => squareName(entry.square) === landedSquareName,
  );
  if (entryIndex === -1 || entries[entryIndex].claimedOnPly !== undefined) {
    return { state, effect: undefined };
  }

  const amount = planetBonusPoints(state.planetBonus);
  const updatedEntries = entries.map((entry, index) =>
    index === entryIndex ? { ...entry, claimedOnPly: state.plyNumber } : entry,
  );

  return {
    state: {
      ...state,
      energy: { ...state.energy, [side]: state.energy[side] + amount },
      bonusPlanets: { ...state.bonusPlanets, [side]: updatedEntries },
    },
    effect: { type: "planet-bonus-claimed", side, square, amount },
  };
}

/**
 * Claims one of the two activity bonuses if `square` carries one (steal.md
 * §10), modelled on `claimPlanetBonus` above: does nothing at all —
 * returning `state` unchanged — when the planet resources setting is off, or
 * when `square` is neither of the board's two current bonus planets.
 * Otherwise `resolveActivityBonusClaim` applies the claimed kind's own
 * effect, redraws the surviving bonus's kind (under race only) and deals a
 * new bonus in the claimed one's place; this wraps its result into `state` — `nodes`, `ships`,
 * `activityBonuses` and `randomSeed` all follow the resolution, and `side`'s
 * energy rises by whatever it awarded (0 for every kind but a points one) —
 * and raises an `ActivityBonusClaimedEffect` describing what happened. Shared
 * by `applyMove`, which calls this once, and `applyAttack`, which calls it
 * twice — the attacker's return planet first, then the defender's — threading
 * the state returned by the first call into the second, exactly as
 * `claimPlanetBonus` and `rotateForLanding` already do.
 */
function claimActivityBonus(
  state: GameState,
  side: Side,
  square: Square,
): {
  readonly state: GameState;
  readonly effect: ActivityBonusClaimedEffect | undefined;
} {
  if (state.planetActivity === "off") {
    return { state, effect: undefined };
  }

  const landedSquareName = squareName(square);
  const isBonusPlanet = state.activityBonuses.some(
    (entry) => squareName(entry.square) === landedSquareName,
  );
  if (!isBonusPlanet) {
    return { state, effect: undefined };
  }

  const result = resolveActivityBonusClaim(state, side, square);
  const energy =
    result.outcome.pointsAwarded === 0
      ? state.energy
      : {
          ...state.energy,
          [side]: state.energy[side] + result.outcome.pointsAwarded,
        };

  return {
    state: {
      ...state,
      nodes: result.nodes,
      ships: result.ships,
      activityBonuses: result.activityBonuses,
      randomSeed: result.nextSeed,
      energy,
    },
    effect: {
      type: "activity-bonus-claimed",
      side,
      square,
      kind: result.outcome.kind,
      pointsAwarded: result.outcome.pointsAwarded,
      poweredShipIds: result.outcome.poweredShipIds,
      addedSquares: result.outcome.addedSquares,
      survivor: result.outcome.survivor,
      newBonus: result.outcome.newBonus,
    },
  };
}

/**
 * Applies a move of `shipId` to `destination` in `state`, or refuses it. A
 * legal move never mutates `state`: it returns a new state in which the ship
 * stands on `destination` having paid the shape's cost (rules.md §6) out of
 * its own power. An orthogonal step costs nothing, so the ship's power is
 * untouched by it. A ship that ends the move on a planet does not gain
 * power on arrival — it recovers a point at a time, through the end-of-turn
 * sequence (rules.md §3.1, §4.1), like any other planet stay — but it may
 * gain energy on arrival, if `destination` is one of the moving side's
 * unclaimed bonus planets (rules.md §3.4, `claimPlanetBonus` below) or, under
 * the planet resources setting, one of the board's two current activity bonus
 * planets (steal.md §10, `claimActivityBonus` below) — the two settings are
 * mutually exclusive, so only one of the two ever fires.
 *
 * Under the continuous, planet and dedicated playstyles, up to two node
 * changes can happen as the move resolves — two knowing exceptions to a
 * node's state changing only in the end-of-turn sequence, and the queue's
 * rotation besides (rules.md §8.3, §8.6). If the square the ship left carries
 * a charged node, it depletes on the spot, carrying `EXIT_COUNTDOWN_PLIES`,
 * and a `NodeSpentEffect` is raised for it: leaving a node spends it, it is
 * never handed back, and the opponent cannot inherit it. If the square the
 * ship arrives on carries a charged node with no countdown, its countdown is
 * set to `CHARGED_COUNTDOWN_PLIES`; one that already carries a countdown is
 * left alone, which can only happen if this move somehow lands on an
 * occupied square, since a countdown's own holder is standing there.
 *
 * Under steal instead (steal.md §§3-5), those two checks are replaced by its
 * own two events. If the ship left a charged node and the destination is not
 * that same node's own prospective square, the node is abandoned
 * (`abandonNode`), raising a `NodeAbandonedEffect`. If the destination is a
 * prospective square, of any node, its node is then claimed (`claimNode`),
 * raising a `NodeClaimedEffect` — after any `NodeAbandonedEffect`, since
 * leaving comes first when one move does both. A ship relocating onto its
 * own node's prospective square only claims: the abandon condition excludes
 * it. Both draws thread `state.randomSeed` in turn, so `afterMove` below
 * carries the seed either has left behind.
 *
 * Then `claimPlanetBonus` pays a classic bonus if `destination` earns one,
 * raising a `PlanetBonusClaimedEffect`, and `claimActivityBonus` claims an
 * activity bonus the same way, raising an `ActivityBonusClaimedEffect` — a
 * move that leaves a charged node and lands on a bonus planet resolves the
 * leave first, exactly as steal.md §10 states — a planet is never a node
 * square, so one move can at most leave one node and land on one bonus
 * planet. Finally,
 * `rotateForLanding` rotates the queue once if `destination` is a planet
 * under the planet setting, or a rotator under dedicated — spending the
 * rotator as it lands — raising a
 * `QueueRotatedEffect` after any node effect and any bonus claim; under
 * continuous, under steal, or when the destination triggers neither, nothing
 * happens here.
 *
 * A move ends the ply (rules.md §5): play passes to the other side. The
 * result then passes through `applyPassGuard`, so a move that leaves the
 * side now to move with no legal move and no legal attack is followed
 * immediately by a pass.
 */
export function applyMove(
  state: GameState,
  shipId: ShipId,
  destination: Square,
): ApplyMoveResult {
  const reason = moveRefusalReason(state, shipId, destination);
  if (reason !== undefined) {
    return { outcome: "refused", reason };
  }

  const ship = findShip(state, shipId);
  const shape = shapeReaching(ship.square, destination);
  if (shape === undefined) {
    throw new RangeError(
      `no shape reaches ${squareName(destination)} from ${squareName(ship.square)}, despite the move having been found legal`,
    );
  }
  const powerAfter = spendPower(ship.power, shape.cost);

  const effects: MoveEffect[] = [];

  const ships = state.ships.map((candidate) =>
    candidate.id === shipId
      ? { ...candidate, square: destination, power: powerAfter }
      : candidate,
  );

  const leftSquareName = squareName(ship.square);
  const destinationSquareName = squareName(destination);
  let nodes = state.nodes;
  let randomSeed = state.randomSeed;

  if (state.nodePlaystyle === "steal") {
    const leftStatus = state.nodes[leftSquareName];
    const destinationStatus = state.nodes[destinationSquareName];
    const destinationSignal =
      destinationStatus?.state === "prospective"
        ? destinationStatus.signal
        : undefined;
    const shipSquares = ships.map((candidate) => candidate.square);

    if (
      leftStatus?.state === "charged" &&
      leftStatus.signal !== undefined &&
      leftStatus.signal !== destinationSignal
    ) {
      const abandoned = abandonNode(
        nodes,
        leftStatus.signal,
        ship.square,
        shipSquares,
        randomSeed,
      );
      nodes = abandoned.nodes;
      randomSeed = abandoned.nextSeed;
      effects.push({
        type: "node-abandoned",
        signal: leftStatus.signal,
        square: ship.square,
        newProspective: abandoned.newProspective,
      });
    }

    if (destinationSignal !== undefined) {
      const claimed = claimNode(
        nodes,
        destinationSignal,
        destination,
        shipSquares,
        randomSeed,
      );
      nodes = claimed.nodes;
      randomSeed = claimed.nextSeed;

      const releasedSquare = claimed.releasedSquare;
      const strandedShip =
        releasedSquare !== undefined
          ? ships.find(
              (candidate) =>
                squareName(candidate.square) === squareName(releasedSquare),
            )
          : undefined;

      effects.push({
        type: "node-claimed",
        shipId: ship.id,
        side: ship.side,
        signal: destinationSignal,
        square: destination,
        ...(claimed.releasedSquare !== undefined
          ? { releasedSquare: claimed.releasedSquare }
          : {}),
        ...(strandedShip !== undefined
          ? {
              strandedShip: {
                shipId: strandedShip.id,
                side: strandedShip.side,
              },
            }
          : {}),
        discardedSquares: claimed.discardedSquares,
        newProspective: claimed.newProspective,
      });
    }
  } else {
    const leftStatus = state.nodes[leftSquareName];
    if (leftStatus !== undefined && leftStatus.state === "charged") {
      nodes = {
        ...nodes,
        [leftSquareName]: { state: "depleted", level: EXIT_COUNTDOWN_PLIES },
      };
      effects.push({ type: "node-spent", square: ship.square });
    }

    const destinationStatus = state.nodes[destinationSquareName];
    if (
      destinationStatus !== undefined &&
      destinationStatus.state === "charged" &&
      destinationStatus.level === 0
    ) {
      nodes = {
        ...nodes,
        [destinationSquareName]: {
          state: "charged",
          level: CHARGED_COUNTDOWN_PLIES,
        },
      };
    }
  }

  const afterMove: GameState = { ...state, ships, nodes, randomSeed };
  const { state: classicClaimedState, effect: claimEffect } = claimPlanetBonus(
    afterMove,
    ship.side,
    destination,
  );
  if (claimEffect !== undefined) {
    effects.push(claimEffect);
  }
  const { state: claimedState, effect: activityClaimEffect } =
    claimActivityBonus(classicClaimedState, ship.side, destination);
  if (activityClaimEffect !== undefined) {
    effects.push(activityClaimEffect);
  }
  // Captured before rotateForLanding, so a node that charges later in this
  // same ply is reported at the priority a player last saw it holding, not
  // the one a landing under planet or dedicated rotates it to.
  const priorityBeforeLanding = snapshotInactivePriorities(claimedState.nodes);
  const { state: rotatedState, effect: rotationEffect } = rotateForLanding(
    claimedState,
    destination,
  );
  if (rotationEffect !== undefined) {
    effects.push(rotationEffect);
  }
  const settled = endPly(rotatedState, effects, priorityBeforeLanding);

  return {
    outcome: "applied",
    state: settled,
    effects,
    cost: shape.cost,
    powerAfter,
  };
}

/**
 * Places `shipId` on `planet`, carrying `power` (rules.md §7). The defender's
 * call passes its power unchanged; the attacker's call passes what is left
 * once the shot's cost is paid.
 */
function placeOnPlanet(
  state: GameState,
  shipId: ShipId,
  planet: Square,
  power: PowerLevel,
): GameState {
  return {
    ...state,
    ships: state.ships.map((ship) =>
      ship.id === shipId ? { ...ship, square: planet, power } : ship,
    ),
  };
}

/**
 * Checks the invariants rules.md §7 guarantees about a fight's result, and
 * throws if any is violated — bug detectors on a cheap operation, not cases a
 * caller need handle. `returnedShipIds` names the two ships placed on a
 * planet; `attackerShipId` names which of the two struck the blow, and
 * `cost` is what that shape spent (rules.md §6). Every other ship must be
 * exactly where it was.
 *
 * The fleet-size check asserts each side's ship count is unchanged by the
 * fight, which can only ever change who holds a square, never how many
 * ships either side has.
 *
 * The node-state check is narrowed to what an attack must actually leave
 * alone: every node present in `before` is present in `after` and vice
 * versa, every node's `state` is identical, and a **charged** or
 * **depleted** node's `level` is identical too — a fight must not touch a
 * node's life, which is what this check exists to guard (rules.md §8.6). An
 * **inactive** node's `level` — its priority — is exempt: under the planet
 * setting a fight returns both ships to planets, and each landing rotates
 * the queue (§8.2, §7), so a fight's own two node changes are the inactive
 * priorities moving, not the charged or depleted states this check protects.
 *
 * The returned-ship checks pin what §7.1's random draw guarantees: each of
 * the two returned ships ends on a planet, they do not share a planet, and
 * each lands on a planet that held no ship in `before` — together, exactly
 * what "there is always somewhere to go" promises. Power is checked
 * asymmetrically, since a fight no longer leaves both ships untouched: the
 * defender's power must be exactly what it was in `before`, and the
 * attacker's must be exactly `before`'s power less `cost` — the shape it
 * struck down (rules.md §6, §7).
 *
 * Under planet resources (steal.md §10), a landing's claim can legitimately
 * change power (Fuel) and the node map (Additional nodes, Node scramble)
 * — the very things the power and node checks below exist to protect against
 * a fight touching. `before.planetActivity` decides this once: when it is on,
 * the power check widens to allow a returning ship's power to be exactly one
 * higher than expected, since Fuel is the only bonus kind that touches power and never raises a ship by
 * more than one; the node-equality check is skipped entirely. Every
 * placement check (each returned ship on its own planet, previously empty,
 * every other ship exactly where it stood, both fleets the same size) still
 * runs, since a claim never moves a ship or changes who has how many.
 *
 * Exported so a test can hand-construct an otherwise-impossible before/after
 * pair, since it has no other seam.
 */
export function assertFightInvariants(
  before: GameState,
  after: GameState,
  attackerShipId: ShipId,
  cost: PowerLevel,
  returnedShipIds: ReadonlySet<ShipId>,
): void {
  const isPlanetActivityOn = before.planetActivity !== "off";
  const beforeOccupiedSquareNames = new Set(
    before.ships.map((ship) => squareName(ship.square)),
  );
  const returnedPlanetSquareNames = new Set<string>();

  for (const ship of before.ships) {
    const updated = after.ships.find((candidate) => candidate.id === ship.id);
    if (updated === undefined) {
      throw new RangeError(
        `ship "${ship.id}" is missing after a fight: rules.md §7 never removes a ship`,
      );
    }

    if (
      !returnedShipIds.has(ship.id) &&
      squareName(updated.square) !== squareName(ship.square)
    ) {
      throw new RangeError(
        `ship "${ship.id}" changed square in a fight it did not return from: rules.md §7 moves only a returning ship`,
      );
    }

    if (returnedShipIds.has(ship.id)) {
      const updatedName = squareName(updated.square);
      if (!isPlanet(updated.square)) {
        throw new RangeError(
          `returned ship "${ship.id}" ended on "${updatedName}", which is not a planet: rules.md §7.1 sends a returning ship to a planet`,
        );
      }
      if (returnedPlanetSquareNames.has(updatedName)) {
        throw new RangeError(
          `two returned ships both ended on planet "${updatedName}": rules.md §7.1 draws each returning ship its own empty planet`,
        );
      }
      returnedPlanetSquareNames.add(updatedName);
      if (beforeOccupiedSquareNames.has(updatedName)) {
        throw new RangeError(
          `returned ship "${ship.id}" ended on planet "${updatedName}", which held a ship before the fight: rules.md §7.1 draws only from planets empty at the moment`,
        );
      }
      // Under planet resources, a landing's claim (steal.md §10) can
      // legitimately raise either fighter's power by exactly one (Fuel) — no
      // other kind touches power, and Fuel never raises a ship already at the
      // maximum — so the gap between the expected and the actual power is 0
      // with planet resources off, and 0 or 1 with it on.
      const isAttacker = ship.id === attackerShipId;
      const expectedPower = isAttacker ? ship.power - cost : ship.power;
      const powerGap = updated.power - expectedPower;
      const powerGapIsAllowed = isPlanetActivityOn
        ? powerGap === 0 || powerGap === 1
        : powerGap === 0;
      if (!powerGapIsAllowed) {
        throw new RangeError(
          isAttacker
            ? `attacking ship "${ship.id}" had ${ship.power} power before the fight and paid ${cost} for the shot, so should have ended with ${expectedPower}${isPlanetActivityOn ? " (or one more, from a Fuel claim)" : ""}, but ended with ${updated.power} instead: rules.md §6, §7 spend exactly the cost of the shape struck down`
            : `defending ship "${ship.id}" had ${ship.power} power before the fight and ${updated.power} after${isPlanetActivityOn ? ", more than a Fuel claim's one point could add" : ""}: rules.md §7 leaves the defender's power untouched`,
        );
      }
    }
  }

  for (const side of ["green", "red"] as const) {
    const beforeCount = before.ships.filter(
      (ship) => ship.side === side,
    ).length;
    const afterCount = after.ships.filter((ship) => ship.side === side).length;
    if (afterCount !== beforeCount) {
      throw new RangeError(
        `${side}'s fleet had ${beforeCount} ships before this fight and ${afterCount} after`,
      );
    }
  }

  // A landing's activity bonus claim (steal.md §10) can legitimately add a
  // node's squares (Additional nodes) or move signals between prospective
  // squares (Node scramble), so this whole check only applies with the planet
  // resources setting off, where a fight must leave every node exactly as it
  // stood.
  if (isPlanetActivityOn) {
    return;
  }

  const nodeNames = new Set([
    ...Object.keys(before.nodes),
    ...Object.keys(after.nodes),
  ]);
  for (const name of nodeNames) {
    const beforeStatus = before.nodes[name];
    const afterStatus = after.nodes[name];
    if (beforeStatus === undefined || afterStatus === undefined) {
      throw new RangeError(
        `node "${name}" ${beforeStatus === undefined ? "appeared" : "disappeared"} during a fight: rules.md §7 never creates, charges or retires a node`,
      );
    }
    if (beforeStatus.state !== afterStatus.state) {
      throw new RangeError(
        `node "${name}" changed from "${beforeStatus.state}" to "${afterStatus.state}": an attack never changes a node's state, rules.md §8.6 says a node's state changes only in the end-of-turn sequence, or mid-move`,
      );
    }
    if (beforeStatus.signal !== afterStatus.signal) {
      throw new RangeError(
        `node "${name}" changed signal from ${beforeStatus.signal} to ${afterStatus.signal} during a fight: an attack can neither vacate a charged node nor land on a prospective one under steal, so a fight must never claim or abandon a node (steal.md §§3-5)`,
      );
    }
    // A charged or depleted node's level must not move — a fight must not
    // touch a node's life. An inactive node's level (its priority) is
    // exempt: under the planet setting a fight's two landings rotate the
    // queue (rules.md §8.2, §7).
    if (
      beforeStatus.state !== "inactive" &&
      beforeStatus.level !== afterStatus.level
    ) {
      throw new RangeError(
        `node "${name}" changed level from ${beforeStatus.level} to ${afterStatus.level} while ${beforeStatus.state}: rules.md §8.6 says a node's state changes only in the end-of-turn sequence, or mid-move, and a fight must not touch a node's life`,
      );
    }
  }
}

/**
 * Applies an attack by `shipId` on `target` in `state`, or refuses it
 * (rules.md §6, §7). A legal attack never mutates `state`: it deducts the
 * cost of the shape it struck down from the attacker's power as the fight
 * resolves, then places both ships on a planet drawn at random from the
 * planets standing empty (`drawReturnPlanet`) — the attacker arriving with
 * that power already spent, the defender carrying exactly what it had
 * before. Both squares the ships fought from are left empty; there is no
 * winner and no advance. Neither square's node changes state: leaving a node
 * does not end it (rules.md §8.3).
 *
 * The two returns do not happen together: the attacker is placed first, and
 * its landing is settled in full — any planet bonus it claims (`claimPlanetBonus`,
 * §3.4, or `claimActivityBonus`, steal.md §10) and any rotation that follows
 * (`rotateForLanding`, §8.2) — before the defender's own return planet is
 * even drawn, from the planets still empty at that point. This is steal.md
 * §10's fight order, stated there because it matters for a recorded game's
 * replay: the attacker's claim advances the seed, and, under the planet
 * resources setting, may change which ships carry power (Fuel) and which
 * squares belong to which node (Additional nodes, Node scramble), before the
 * defender's planet is drawn and its own landing settled the same way. `assertFightInvariants` runs
 * once, against the fully settled state. An attack ends the ply (rules.md
 * §5), just as a move does: play passes to the other side, and the result
 * then passes through `applyPassGuard`.
 */
export function applyAttack(
  state: GameState,
  shipId: ShipId,
  target: Square,
): ApplyAttackResult {
  const reason = attackRefusalReason(state, shipId, target);
  if (reason !== undefined) {
    return { outcome: "refused", reason };
  }

  const attackerShip = state.ships.find((ship) => ship.id === shipId);
  if (attackerShip === undefined) {
    throw new RangeError(`no ship with id "${shipId}" in this state`);
  }
  const defenderShip = shipsBySquare(state).get(squareName(target));
  if (defenderShip === undefined) {
    throw new RangeError(
      `no ship on the attacked square ${squareName(target)}`,
    );
  }

  const attackerBefore = toFightShip(attackerShip);
  const defenderBefore = toFightShip(defenderShip);

  const shape = attackReach(state, shipId, target);
  if (shape === undefined) {
    throw new RangeError(
      `no shape reaches ${squareName(target)} from ${squareName(attackerShip.square)}, despite the attack having been found legal`,
    );
  }
  const cost = shape.cost;
  const attackerPowerAfter = spendPower(attackerShip.power, cost);

  const [attackerTo, seedAfterAttacker] = drawReturnPlanet(state);
  const afterAttackerReturned: GameState = {
    ...placeOnPlanet(state, attackerShip.id, attackerTo, attackerPowerAfter),
    randomSeed: seedAfterAttacker,
  };

  // The attacker's landing is settled in full — its claim, planet bonus or
  // activity bonus, and the rotation that follows — before the defender's own
  // return planet is even drawn (steal.md §10).
  const attackerClassicClaim = claimPlanetBonus(
    afterAttackerReturned,
    attackerShip.side,
    attackerTo,
  );
  const attackerActivityClaim = claimActivityBonus(
    attackerClassicClaim.state,
    attackerShip.side,
    attackerTo,
  );
  const attackerClaimEffect =
    attackerClassicClaim.effect ?? attackerActivityClaim.effect;
  // Captured once, ahead of either fighter's rotation, so a node that charges
  // later in this same ply is reported at the priority a player last saw it
  // holding. Only a classic setting ever rotates a fight's landing — the
  // planet resources setting is steal-only, and steal never rotates one — and
  // neither classic claim touches a node, so the snapshot is the same whether
  // it is read now or once both ships have landed.
  const priorityBeforeLanding = snapshotInactivePriorities(
    attackerActivityClaim.state.nodes,
  );
  const afterAttackerRotation = rotateForLanding(
    attackerActivityClaim.state,
    attackerTo,
  );

  const [defenderTo, seedAfterDefender] = drawReturnPlanet(
    afterAttackerRotation.state,
  );
  const afterDefenderReturned: GameState = {
    ...placeOnPlanet(
      afterAttackerRotation.state,
      defenderShip.id,
      defenderTo,
      defenderShip.power,
    ),
    randomSeed: seedAfterDefender,
  };

  const defenderClassicClaim = claimPlanetBonus(
    afterDefenderReturned,
    defenderShip.side,
    defenderTo,
  );
  const defenderActivityClaim = claimActivityBonus(
    defenderClassicClaim.state,
    defenderShip.side,
    defenderTo,
  );
  const defenderClaimEffect =
    defenderClassicClaim.effect ?? defenderActivityClaim.effect;
  const afterDefenderRotation = rotateForLanding(
    defenderActivityClaim.state,
    defenderTo,
  );
  const rotatedState = afterDefenderRotation.state;

  const returns: FightReturn[] = [
    {
      shipId: attackerShip.id,
      side: attackerShip.side,
      from: attackerShip.square,
      to: attackerTo,
    },
    {
      shipId: defenderShip.id,
      side: defenderShip.side,
      from: defenderShip.square,
      to: defenderTo,
    },
  ];

  assertFightInvariants(
    state,
    rotatedState,
    attackerShip.id,
    cost,
    new Set(returns.map((entry) => entry.shipId)),
  );

  const effects: AttackEffect[] = [
    {
      type: "fight-resolved",
      attacker: attackerBefore,
      defender: defenderBefore,
      cost,
      returns,
    },
  ];
  if (attackerClaimEffect !== undefined) {
    effects.push(attackerClaimEffect);
  }
  if (afterAttackerRotation.effect !== undefined) {
    effects.push(afterAttackerRotation.effect);
  }
  if (defenderClaimEffect !== undefined) {
    effects.push(defenderClaimEffect);
  }
  if (afterDefenderRotation.effect !== undefined) {
    effects.push(afterDefenderRotation.effect);
  }

  const settled = endPly(rotatedState, effects, priorityBeforeLanding);

  return { outcome: "applied", state: settled, effects };
}

/** A ship's identity, side, square and power level, snapshotted for a `FightResolvedEffect`. */
function toFightShip(ship: Ship): FightShip {
  return {
    shipId: ship.id,
    side: ship.side,
    square: ship.square,
    power: ship.power,
  };
}
