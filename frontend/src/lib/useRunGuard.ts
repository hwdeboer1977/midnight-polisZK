// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from "react";

/**
 * Keeping a long chain job from being abandoned by a closed tab.
 *
 * Everything expensive here proves for minutes: filing, paying, remitting,
 * publishing a claim root. The progress line said so in grey body text under a
 * row of ticks, which is the wrong weight for the only instruction that
 * matters — a closed tab does not merely lose the view, it abandons work that
 * is part way through a sequence the ledger requires in order.
 *
 * Two mechanisms, because neither is enough alone. The browser's own
 * `beforeunload` prompt is the one that actually stops a click; a visible,
 * moving indicator is what stops somebody deciding the page has hung.
 *
 * ── On the unload prompt ───────────────────────────────────────────────────
 *
 * Browsers show their own wording and ignore any message supplied here — the
 * custom string was removed years ago to stop it being used for scare tactics.
 * So the page must ALSO say what is happening; this only forces the pause.
 */
export function useUnloadGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Still set for the browsers that require a non-empty value to prompt at
      // all, though none of them display it any more.
      event.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [active]);
}

/**
 * Seconds since a run started, as a formatted string, or null when idle.
 *
 * A number that moves is the difference between "this is slow" and "this is
 * broken" — proving gives no intermediate progress to report, so elapsed time
 * is the only honest signal that anything is still happening.
 */
export function useElapsed(active: boolean): string | null {
  const startedAt = useRef<number | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!active) {
      startedAt.current = null;
      return;
    }
    startedAt.current = Date.now();
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active || startedAt.current === null) return null;
  const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0
    ? `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`
    : `${seconds}s`;
}
