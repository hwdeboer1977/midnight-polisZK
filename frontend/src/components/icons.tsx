// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * The few marks the dashboards use, drawn rather than imported.
 *
 * An icon set is a megabyte and a font request for six glyphs. These are
 * stroke-only and inherit `currentColor`, so they follow the theme without a
 * second palette to keep in step — and each one is a noun the page already
 * names in words beside it, which is why they are all `aria-hidden` at the
 * call site.
 */

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Employers. */
export const IconPeople = () => (
  <svg {...base}>
    <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
    <circle cx="10" cy="8" r="3.2" />
    <path d="M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 5.2a3.2 3.2 0 0 1 0 5.6" />
  </svg>
);

/** The benefit fund — an institution that receives. */
export const IconBank = () => (
  <svg {...base}>
    <path d="M4 10h16M5 10v8M10 10v8M14 10v8M19 10v8M3 18h18M12 3 4 7.5h16z" />
  </svg>
);

/** The tax vault — an institution that holds. */
export const IconShield = () => (
  <svg {...base}>
    <path d="M12 3.5 5 6.2v5.1c0 4 2.9 7.6 7 9.2 4.1-1.6 7-5.2 7-9.2V6.2z" />
  </svg>
);

/** Money in flight — the one figure that is about time. */
export const IconClock = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

/** What this key is, rather than what it holds. */
export const IconRole = () => (
  <svg {...base}>
    <path d="M12 3.5 5 6.2v5.1c0 4 2.9 7.6 7 9.2 4.1-1.6 7-5.2 7-9.2V6.2z" />
    <path d="M9.3 12.2l1.9 1.9 3.6-3.8" />
  </svg>
);
