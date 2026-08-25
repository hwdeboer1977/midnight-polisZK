/**
 * A November roster, for testing the payslip export against a fresh filing.
 *
 * A copy of the October one with the period moved on. Nothing else changes:
 * both rows already carry valid keys, and the payslip check no longer needs a
 * browser wallet to open a payslip, so there is no reason to repoint a row at
 * an extension wallet just to be able to read the result.
 *
 * Pass a coin key and an encryption key to put a different wallet in row 1 —
 * worth doing when you want the "filed for the wallet you have connected"
 * badge, which needs a payee that can actually connect.
 *
 *   node probe/make-roster-nov.mjs [coinPublicKey encryptionPublicKey]
 */
import ExcelJS from "exceljs";

const SOURCE = "roster-2026.xlsx";
const OUT = "roster-2026-11.xlsx";
const MONTH = 11;

const [cpk, epk] = process.argv.slice(2);
if ((cpk && !epk) || (!cpk && epk)) {
  throw new Error("Pass both keys, or neither — a row needs both to be payable");
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(SOURCE);
const ws = wb.getWorksheet("Roster");

ws.getRow(2).getCell(3).value = MONTH;

if (cpk) {
  const row = ws.getRow(5);
  row.getCell(1).value = "Test Employee (browser wallet)";
  row.getCell(5).value = cpk.trim();
  row.getCell(6).value = epk.trim();
}

await wb.xlsx.writeFile(OUT);
console.log(`wrote ${OUT} from ${SOURCE}\n`);

for (const n of [1, 2, 4, 5, 6]) {
  const r = ws.getRow(n);
  const cells = [1, 2, 3, 4, 5, 6].map((c) => {
    const v = r.getCell(c).value;
    const s = v == null ? "" : String(v);
    return s.length > 26 ? `${s.slice(0, 12)}…${s.slice(-8)}` : s;
  });
  console.log(String(n).padStart(2), "|", cells.filter(Boolean).join(" | "));
}
