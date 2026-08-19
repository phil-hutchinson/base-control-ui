// A hook wrapping countUp.ts's arithmetic with requestAnimationFrame. It
// animates the number it returns towards its `target` argument and always
// settles exactly on it, so `target` stays the only source of truth: the
// hook never accumulates a total of its own, only a displayed value derived
// fresh from where the current roll started and how far it has run.

import { useEffect, useRef, useState } from "react";
import { COUNT_UP_DURATION_MS, countUpValue } from "./countUp";

function prefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The number to draw, rolling towards `target` and always settling exactly
 * on it. A fresh render returns `target` unchanged — nothing rolls up from
 * zero — and a `target` that changes mid-roll re-targets from wherever the
 * display currently sits. A `target` lower than what is currently displayed
 * snaps to it instantly instead of rolling down; only a rising target
 * animates. Under prefers-reduced-motion, jumps straight to `target` and
 * schedules nothing.
 */
export function useCountUp(target: number): number {
  const [displayed, setDisplayed] = useState(target);
  const displayedRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    displayedRef.current = displayed;
  }, [displayed]);

  useEffect(() => {
    if (displayedRef.current === target) {
      return;
    }
    if (prefersReducedMotion() || target < displayedRef.current) {
      displayedRef.current = target;
      setDisplayed(target);
      return;
    }

    const from = displayedRef.current;
    const startedAt = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const value = countUpValue(from, target, elapsed);
      displayedRef.current = value;
      setDisplayed(value);
      if (elapsed < COUNT_UP_DURATION_MS) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [target]);

  return displayed;
}
