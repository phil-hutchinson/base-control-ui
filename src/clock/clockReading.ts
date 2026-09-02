// §10's clock reading: a pure function turning a remaining duration into
// the text a clock region shows. No React, no timers, no state — this is
// where the rounding rule is proved. Expiry is judged against the real
// remaining value elsewhere; the rounding here is a display rule only.

/**
 * Below this remaining duration the reading switches from `m:ss` to seconds
 * and tenths with no minutes. The handover is continuous: a duration above
 * the threshold and one at or below it never read the same, and nothing in
 * between goes unrepresented.
 */
export const CLOCK_READING_TENTHS_THRESHOLD_MS = 15_000;

/**
 * The text a clock region shows for `remainingMs` milliseconds left
 * (rules.md §10):
 *
 * - `Number.POSITIVE_INFINITY` (no clock chosen) reads `INF`;
 * - above the threshold, `m:ss` — minutes unpadded, seconds two digits,
 *   total seconds rounded **up**;
 * - at or below the threshold, seconds and tenths with no minutes, rounded
 *   **up** to the tenth (`15.0`, `14.9`, … `0.1`);
 * - zero or below reads `0.0`.
 */
export function formatClockReading(remainingMs: number): string {
  if (remainingMs === Number.POSITIVE_INFINITY) {
    return "INF";
  }
  if (remainingMs <= 0) {
    return "0.0";
  }
  if (remainingMs > CLOCK_READING_TENTHS_THRESHOLD_MS) {
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  const tenths = Math.ceil(remainingMs / 100);
  const whole = Math.floor(tenths / 10);
  const fraction = tenths % 10;
  return `${whole}.${fraction}`;
}
