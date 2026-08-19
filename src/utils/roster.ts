import ExcelJS from "exceljs";
import { PEUR_DECIMALS, PEUR_SCALE } from "./constructor-args.js";

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

/**
 * The period the roster is for, written above the table as Year and Month.
 *
 * It lives in the workbook rather than being typed at submit time because the
 * period is a property of the file — the same spreadsheet re-submitted months
 * later should still mean the month it was prepared for. Typing it separately
 * is how March's salaries end up filed under June.
 *
 * Two cells rather than one YYYYMM number: a person filling a spreadsheet
 * writes 2026 and 3, and the six-digit form is where the transposition typos
 * live. They are joined into YYYYMM here, once.
 */
export const PERIOD_LABELS = { year: "Year", month: "Month" } as const;

/** 2026, 3 -> 202603. The form payroll.compact keys its ledger by. */
export function toPeriod(year: number, month: number): number {
  return year * 100 + month;
}

/** 202603 -> "March 2026". */
export function periodName(period: number | bigint): string {
  const n = Number(period);
  const month = MONTH_NAMES[(n % 100) - 1];
  return month ? `${month} ${Math.floor(n / 100)}` : String(period);
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export interface RosterRow {
  index: number;
  fullName: string;
  address: string;
  /** Minor units (1e-6 pEUR), as the contract counts them. */
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
  /** YYYYMM read from the sheet, or null if it is missing or unreadable. */
  period: number | null;
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
    // Scaled by PEUR_SCALE, not by 100. A cell typed as a number and a cell
    // typed as text must land on the same minor unit; this branch was still on
    // cents while the string branch below had moved to 1e-6, so the same salary
    // parsed 10,000x smaller depending only on how Excel stored the cell.
    return BigInt(Math.round(raw * Number(PEUR_SCALE)));
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

  if (!new RegExp(`^\\d+(\\.\\d{1,${PEUR_DECIMALS}})?$`).test(text)) {
    throw new Error(`"${String(raw)}" is not a salary amount`);
  }

  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole!) * PEUR_SCALE + BigInt(fraction.padEnd(PEUR_DECIMALS, "0"));
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

  /** Formulas and rich text arrive as objects rather than primitives. */
  const readCell = (rowNumber: number, column: number): unknown => {
    const value = sheet.getRow(rowNumber).getCell(column).value;
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

  const text = (value: unknown) => String(value ?? "").trim();
  const normalized = (value: unknown) => text(value).toLowerCase().replace(/[^a-z]/g, "");

  // The employee table no longer starts at a fixed row: the period block sits
  // above it. Find the header by its first column rather than counting rows, so
  // a roster saved from the older single-table template still loads.
  let headerRow = 0;
  const firstColumn = normalized(ROSTER_COLUMNS[0]);
  for (let n = 1; n <= Math.min(sheet.rowCount, 50); n += 1) {
    if (normalized(readCell(n, 1)) === firstColumn) {
      headerRow = n;
      break;
    }
  }
  if (headerRow === 0) {
    throw new Error(
      `No "${ROSTER_COLUMNS[0]}" header found — is this a roster workbook?`
    );
  }

  const period = readPeriod(readCell, normalized, text, headerRow, problems);

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return; // period block and header

    const cell = (n: number) => readCell(rowNumber, n);

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
    period,
    totalMinor: rows.reduce((sum, row) => sum + row.salaryMinor, 0n),
  };
}

/**
 * Reads the Year and Month cells sitting above the employee table.
 *
 * Located by their labels rather than by fixed coordinates, so inserting a
 * title row or a company name above them does not silently shift the period
 * onto whatever cell happens to be there instead.
 *
 * A missing period is a problem, not a throw: the caller can still show the
 * roster and let someone supply the month, and refusing to render the file at
 * all would make a one-cell omission look like a corrupt workbook.
 */
function readPeriod(
  readCell: (row: number, column: number) => unknown,
  normalized: (value: unknown) => string,
  text: (value: unknown) => string,
  headerRow: number,
  problems: RosterProblem[]
): number | null {
  const find = (label: string): { raw: unknown; row: number } | null => {
    for (let row = 1; row < headerRow; row += 1) {
      for (let column = 1; column <= 4; column += 1) {
        if (normalized(readCell(row, column)) === normalized(label)) {
          // The value sits beside the label, or under it.
          const beside = readCell(row, column + 1);
          if (text(beside) !== "") return { raw: beside, row };
          return { raw: readCell(row + 1, column), row: row + 1 };
        }
      }
    }
    return null;
  };

  const yearCell = find(PERIOD_LABELS.year);
  const monthCell = find(PERIOD_LABELS.month);

  if (!yearCell || !monthCell) {
    problems.push({
      row: 0,
      message:
        `no ${PERIOD_LABELS.year}/${PERIOD_LABELS.month} cells above the table — ` +
        "regenerate the template with `npm run roster:template`",
    });
    return null;
  }

  const year = Number(text(yearCell.raw));
  const month = Number(text(monthCell.raw));

  if (!Number.isInteger(year) || year < 2000 || year > 2999) {
    problems.push({ row: yearCell.row, message: `"${text(yearCell.raw)}" is not a year` });
    return null;
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    problems.push({ row: monthCell.row, message: `"${text(monthCell.raw)}" is not a month 1-12` });
    return null;
  }

  return toPeriod(year, month);
}

/**
 * Writes a blank roster with the period block and the expected header, for
 * employers to fill in.
 *
 * Layout, which `parseRosterWorkbook` locates by label rather than by row:
 *
 *   1  Payroll period   Year   <year>
 *   2                   Month  <month>
 *   3  (blank)
 *   4  Full name | Address | Monthly gross salary
 *   5+ one row per employee
 */
export async function writeRosterTemplate(
  filePath: string,
  sample: { fullName: string; address: string; salary: string }[] = [],
  period?: { year: number; month: number }
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "midnight-polisZK";
  const sheet = workbook.addWorksheet("Roster");

  sheet.getColumn(1).width = 26;
  sheet.getColumn(2).width = 42;
  sheet.getColumn(3).width = 22;
  sheet.getColumn(3).numFmt = "#,##0.00";

  sheet.getCell("A1").value = "Payroll period";
  sheet.getCell("A1").font = { bold: true };
  sheet.getCell("B1").value = PERIOD_LABELS.year;
  sheet.getCell("C1").value = period?.year ?? null;
  sheet.getCell("B2").value = PERIOD_LABELS.month;
  sheet.getCell("C2").value = period?.month ?? null;
  sheet.getCell("B1").font = { bold: true };
  sheet.getCell("B2").font = { bold: true };
  sheet.getCell("C1").numFmt = "0";
  sheet.getCell("C2").numFmt = "0";

  // Rejected in the spreadsheet as well as in the circuit. A month of 13 is
  // cheaper to catch here, before ten proofs have been generated for it.
  sheet.getCell("C2").dataValidation = {
    type: "whole",
    operator: "between",
    formulae: [1, 12],
    allowBlank: false,
    showErrorMessage: true,
    errorTitle: "Month",
    error: "Use a month number from 1 to 12.",
  };
  sheet.getCell("C1").dataValidation = {
    type: "whole",
    operator: "between",
    formulae: [2000, 2999],
    allowBlank: false,
    showErrorMessage: true,
    errorTitle: "Year",
    error: "Use a four-digit year, e.g. 2026.",
  };

  const HEADER_ROW = 4;
  const header = sheet.getRow(HEADER_ROW);
  ROSTER_COLUMNS.forEach((label, i) => {
    header.getCell(i + 1).value = label;
  });
  header.font = { bold: true };

  for (let i = 0; i < ROSTER_SIZE; i += 1) {
    const row = sheet.getRow(HEADER_ROW + 1 + i);
    row.getCell(1).value = sample[i]?.fullName ?? null;
    row.getCell(2).value = sample[i]?.address ?? null;
    // Written as a number so the file round-trips through Excel as one: a
    // salary stored as text is the shape that used to parse on a different
    // scale from a salary stored as a number.
    const salary = sample[i]?.salary;
    row.getCell(3).value = salary ? Number(salary) : null;
  }

  await workbook.xlsx.writeFile(filePath);
}
