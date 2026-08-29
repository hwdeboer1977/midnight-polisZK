// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { periodName } from "../generated/roster";
import { formatPeur } from "../lib/format";
import type { NationalDeposits } from "../lib/nationalDeposits";

/**
 * What each national contract recorded for this period.
 *
 * Lived inside `RosterUpload` while the deposit did, as the result line of the
 * employer's sixth step. Both moved: the hop spends the treasury wallets and
 * pays into contracts the platform governs, so it is the operator's, and the
 * confirmation belongs beside the button that produces it rather than on a page
 * whose reader can only wait.
 *
 * Three states per contract and they are kept apart deliberately. A figure is
 * what arrived; **zero** is a deposit that has not been made; **unknown** is a
 * contract that is not deployed here or did not answer, and rendering that as
 * zero would invite redoing a hop that may already be done. The same
 * distinction `readNationalDeposits` draws, carried through to the screen
 * rather than flattened on the way.
 *
 * Neither figure is checked against the payroll contract's totals here. It
 * cannot be, on chain — one contract cannot read another's ledger — so what
 * these contracts record is a claim about a period, and a mismatch with
 * `totalTaxFor` is publicly visible rather than refused. Showing the figure is
 * what makes that comparison possible at all.
 */
export function NationalArrivals({
  deposits,
  period,
}: {
  deposits: NationalDeposits | null;
  period: number;
}) {
  if (!deposits) return <span className="muted">Reading the national contracts…</span>;

  const line = (label: string, minor: bigint | null, address: string | null) => {
    if (address === null) return `${label}: no contract deployed on this network`;
    if (minor === null) return `${label}: could not be read`;
    if (minor === 0n) return `${label}: nothing recorded for ${periodName(period)} yet`;
    return `${label}: €${formatPeur(minor)} recorded for ${periodName(period)}`;
  };

  return (
    <ul className="national-arrivals">
      <li>{line("Benefit fund", deposits.contributionsMinor, deposits.fundAddress)}</li>
      <li>{line("Tax vault", deposits.taxMinor, deposits.taxvaultAddress)}</li>
    </ul>
  );
}
