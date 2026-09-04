// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * Periods are YYYYMM integers everywhere — in the contract, in the workbook and
 * on screen. These are the three things every page does with one.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** 202603 -> "March 2026". */
export function periodName(period: number): string {
  const month = MONTHS[(period % 100) - 1];
  return month ? `${month} ${Math.floor(period / 100)}` : String(period);
}

/** The month after a YYYYMM, rolling the year. */
export function monthAfter(period: number): number {
  return period % 100 >= 12 ? (Math.floor(period / 100) + 1) * 100 + 1 : period + 1;
}

/**
 * A set of months as ranges rather than a list of twelve.
 *
 * Contiguous runs collapse — "July 2026 – December 2026" — because that is the
 * shape they are recorded in, and a gap in the middle is worth seeing rather
 * than losing inside a comma-separated wall.
 */
export function describeMonths(periods: number[]): string {
  if (periods.length === 0) return "none";
  const sorted = [...periods].sort((a, b) => a - b);
  const runs: Array<[number, number]> = [];
  for (const period of sorted) {
    const last = runs[runs.length - 1];
    if (last && monthAfter(last[1]) === period) last[1] = period;
    else runs.push([period, period]);
  }
  return runs
    .map(([from, to]) =>
      from === to ? periodName(from) : `${periodName(from)} – ${periodName(to)}`
    )
    .join(" · ");
}
