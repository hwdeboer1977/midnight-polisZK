// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { formatPeur } from "../lib/format";
import { payslipFilename, type Payslip } from "../lib/payslip";

/**
 * The payslips for a filed period, for the employer to hand out.
 *
 * One per employee, downloaded individually rather than exported as a
 * single file. That is not tidiness — a payslip carries a salary and the nonce
 * that opens its commitment, so a combined export is one document disclosing
 * everyone's pay to whoever receives it. Making the safe thing the only
 * available thing is cheaper than a warning nobody reads.
 *
 * Nothing here is stored. Leave the page without handing these over and they
 * are gone from this screen — recoverable only by re-deriving them from the
 * passphrase and the sealed openings on chain.
 */
export function Payslips({ slips }: { slips: Payslip[] }) {
  if (slips.length === 0) return null;

  function download(slip: Payslip) {
    const blob = new Blob([JSON.stringify(slip, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = payslipFilename(slip);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="callout" style={{ marginTop: 16 }}>
      <h2>Payslips to hand out</h2>
      <p className="note" style={{ marginTop: 0 }}>
        Each employee needs their own. With it they can open their line on the
        Employee page and check it against the commitment you just filed — that
        check proves the figures are the ones committed before payday, so an
        edited payslip fails it. Send each one to that person only.
      </p>
      <table className="roster">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Net</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {slips.map((slip) => (
            <tr key={slip.slot}>
              <td>{slip.employee ?? `Employee ${slip.slot + 1}`}</td>
              <td>{formatPeur(BigInt(slip.net))} pEUR</td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <button type="button" className="ghost" onClick={() => download(slip)}>
                  Download
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        A payslip is the line itself, not a pointer to it — whoever holds the
        file can read what that person was paid. Send each one to that person
        only, by whatever channel you would send a paper payslip.
      </p>
    </section>
  );
}
