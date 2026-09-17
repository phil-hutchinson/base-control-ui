// The close/reload guard: while `enabled`, cancels `beforeunload` so the
// browser shows its own "leave this page" prompt. The browser decides the
// wording and whether to show one at all — a page cannot set either — so
// this hook does nothing but arm and disarm the platform's own mechanism.

import { useEffect } from "react";

/** Cancels the tab's close/reload while `enabled`, and nothing otherwise. */
export function useLeaveConfirmation(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    function confirmLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", confirmLeaving);
    return () => {
      window.removeEventListener("beforeunload", confirmLeaving);
    };
  }, [enabled]);
}
