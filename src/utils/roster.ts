import ExcelJS from "exceljs";

/**
 * The employer's roster spreadsheet.
 *
 * Only the salary ever reaches the chain, and then only as a private circuit
 * input folded into the public total. Names and addresses stay on the
 * employer's machine — they are here because payroll needs them, not because
 * the contract does.
 */
export const ROSTER_COLUMNS = [
  "Full name",
  "Address",
  "Monthly gross salary",
] as const;

/** payroll.compact fixes the roster at ten employees. */
export const ROSTER_SIZE = 10;

export interface RosterRow {
  index: number;
  fullName: string;
  address: string;
  /** Minor units (cents), as the contract counts them. */
  salaryMinor: bigint;
}

export interface RosterProblem {
  row: number;
  message: string;
}

export interface ParsedRoster {
  rows: RosterRow[];
  problems: RosterProblem[];
  totalMinor: bigint;
}

/**
 * Accepts "3500", "3500.00", "3,500.00", "€3.500,00" and similar, returning
 * minor units. Spreadsheets hand back numbers or strings depending on how the
 * cell was typed, and a payroll file that silently loses cents is worse than
 * one that refuses to load.
 */
export function parseSalary(raw: unknown): bigint {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) throw new Error("salary is not a finite number");
    if (raw < 0) throw new Error("salary is negative");
    return BigInt(Math.round(raw * 100));
  }

  let text = String(raw ?? "").trim();
  if (text === "") throw new Error("salary is empty");
  text = text.replace(/[^0-9.,-]/g, "");
  if (text.startsWith("-")) throw new Error("salary is negative");

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  // Whichever separator comes last is the decimal one; the other groups digits.
  if (lastComma > lastDot) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    text = text.replace(/,/g, "");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error(`"${String(raw)}" is not a salary amount`);
  }

  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
}

/** Reads the first worksheet, expecting a header row plus one row per employee. */
export async function parseRosterWorkbook(
  input: string | ArrayBuffer
): Promise<ParsedRoster> {
  const workbook = new ExcelJS.Workbook();
  if (typeof input === "string") {
    await workbook.xlsx.readFile(input);
  } else {
    await workbook.xlsx.load(input);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook has no worksheets");

  const rows: RosterRow[] = [];
  const problems: RosterProblem[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header

    const cell = (n: number) => {
      const value = row.getCell(n).value;
      // Formulas and rich text arrive as objects rather than primitives.
      if (value && typeof value === "object") {
        if ("result" in value) return (value as { result: unknown }).result;
        if ("richText" in value) {
          return (value as { richText: { text: string }[] }).richText
            .map((part) => part.text)
            .join("");
        }
      }
      return value;
    };

    const fullName = String(cell(1) ?? "").trim();
    const address = String(cell(2) ?? "").trim();
    const rawSalary = cell(3);

    // A blank line in the middle of a roster is a mistake worth reporting; a
    // fully blank trailing line is just spreadsheet padding.
    if (!fullName && !address && (rawSalary === null || rawSalary === undefined || rawSalary === "")) {
      return;
    }

    if (!fullName) problems.push({ row: rowNumber, message: "missing full name" });
    if (!address) problems.push({ row: rowNumber, message: "missing address" });

    let salaryMinor = 0n;
    try {
      salaryMinor = parseSalary(rawSalary);
    } catch (error) {
      problems.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    rows.push({ index: rows.length, fullName, address, salaryMinor });
  });

  if (rows.length !== ROSTER_SIZE) {
    problems.push({
      row: 0,
      message: `expected ${ROSTER_SIZE} employees, found ${rows.length}`,
    });
  }

  return {
    rows,
    problems,
    totalMinor: rows.reduce((sum, row) => sum + row.salaryMinor, 0n),
  };
}

/** Writes a blank roster with the expected header, for employers to fill in. */
export async function writeRosterTemplate(
  filePath: string,
  sample: { fullName: string; address: string; salary: string }[] = []
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "midnight-polisZK";
  const sheet = workbook.addWorksheet("Roster");

  sheet.columns = [
    { header: ROSTER_COLUMNS[0], key: "fullName", width: 26 },
    { header: ROSTER_COLUMNS[1], key: "address", width: 42 },
    { header: ROSTER_COLUMNS[2], key: "salary", width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (let i = 0; i < ROSTER_SIZE; i += 1) {
    const row = sample[i];
    sheet.addRow({
      fullName: row?.fullName ?? "",
      address: row?.address ?? "",
      salary: row?.salary ?? "",
    });
  }

  sheet.getColumn(3).numFmt = "#,##0.00";
  await workbook.xlsx.writeFile(filePath);
}
