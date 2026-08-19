// The arithmetic behind a score's roll from one total to the next: a plain
// function of where the roll started, where it is headed, and how much time
// has elapsed. Holding this apart from any component or timer means the
// numbers themselves — including the moment a roll settles exactly on its
// target — are tested without a clock or a render.

/** How long a roll takes to settle on its target, in milliseconds. */
export const COUNT_UP_DURATION_MS = 600;

/**
 * The integer to display `elapsedMs` into a roll from `from` to `to`.
 * Linear in time, and returns exactly `to` once `elapsedMs` reaches
 * `COUNT_UP_DURATION_MS` or more — including when `to` is below `from`, and
 * when the two are already equal.
 */
export function countUpValue(
  from: number,
  to: number,
  elapsedMs: number,
): number {
  if (from === to || elapsedMs >= COUNT_UP_DURATION_MS) {
    return to;
  }
  const progress = Math.max(0, elapsedMs) / COUNT_UP_DURATION_MS;
  return Math.round(from + (to - from) * progress);
}
