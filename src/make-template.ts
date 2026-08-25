import path from "path";
import { ROSTER_COLUMNS, writeRosterTemplate } from "./utils/roster.js";

/**
 * Writes a filled example roster. Real names and addresses would never belong
 * in a repo; these are obvious placeholders so the file can be committed and
 * used as a starting point.
 */
const SAMPLE = [
  { fullName: "Anna de Vries", address: "Keizersgracht 12, 1015 CW Amsterdam", salary: "4200.00" },
  { fullName: "Bram Jansen", address: "Lange Voorhout 3, 2514 EA Den Haag", salary: "3850.50" },
  { fullName: "Chiara Rossi", address: "Via Roma 44, 20121 Milano", salary: "5100.00" },
  { fullName: "Daan Bakker", address: "Coolsingel 210, 3012 AG Rotterdam", salary: "3600.00" },
  { fullName: "Elif Yilmaz", address: "Bahariye Cd. 8, 34710 Istanbul", salary: "4475.25" },
  { fullName: "Femke Visser", address: "Oudegracht 91, 3511 AE Utrecht", salary: "3990.00" },
  { fullName: "Gideon Okafor", address: "Adeola Odeku St 17, Lagos", salary: "4720.00" },
  { fullName: "Hanna Nowak", address: "Ulica Floriańska 5, 31-019 Kraków", salary: "3410.75" },
  { fullName: "Ivo Novák", address: "Národní 22, 110 00 Praha", salary: "3125.00" },
  { fullName: "Julia Meijer", address: "Grote Markt 7, 9711 LV Groningen", salary: "5300.00" },
];

const target = process.argv[2] ?? path.join(process.cwd(), "roster-template.xlsx");

// Seeded with the current month so the common case is a file you can fill in
// and submit; the period is still a cell, so filing a past month is editing
// one number rather than working around the template.
const now = new Date();
const period = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };

await writeRosterTemplate(target, SAMPLE, period);
console.log(`Wrote ${target}`);
console.log(`Period:  Year ${period.year} | Month ${period.month}  (rows 1-2)`);
// Derived from ROSTER_COLUMNS rather than written out again. A hardcoded copy
// is how this line came to advertise a layout the parser had already stopped
// accepting.
console.log(`Columns: ${ROSTER_COLUMNS.join(" | ")}  (row ${4})`);
console.log(
  "Weeks worked may be left blank for a full month. Tax, social contribution " +
    "and net pay are NOT columns: they are computed from gross by the published " +
    "rule set, inside the circuit."
);
console.log(
  "The two key columns are left blank on purpose: they are real wallet keys, one " +
    "employee at a time. Each employee copies both from their own dashboard."
);
console.log(
  "Only the salaries reach the chain, and only as private inputs folded into the public total."
);
console.log(
  "The period is published as-is: it is the key a past month stays provable under."
);
process.exit(0);
