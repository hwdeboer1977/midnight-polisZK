import ExcelJS from "exceljs";
import { bech32m } from "@scure/base";
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
  "Weeks worked",
  "Coin public key",
  "Encryption public key",
] as const;

/**
 * Weeks worked when the column is left blank.
 *
 * A full month. Recorded in the commitment so a claim can reason about partial
 * months later; it does NOT prorate the salary, because no proration rule has
 * been agreed and inventing one here would silently change what people are
 * paid.
 */
export const FULL_MONTH_WEEKS = 4;

/**
 * Both keys, because a shielded coin needs both to arrive.
 *
 * The coin public key names the recipient inside the circuit — it is what
 * `payeeFor` commits to. The encryption public key is what the coin's
 * ciphertext is encrypted to, and without it the payment still happens and the
 * employee's wallet can never see it: paid, and unreachable. The employee reads
 * both off their own dashboard and sends them to their employer; neither is a
 * secret, and neither lets the employer spend anything.
 */
export const KEY_COLUMNS = { coin: 5, encryption: 6 } as const;

/**
 * Decodes a Bech32m key to hex, the form contracts and the SDK both work in.
 *
 * Validated at upload rather than at payday. Midnight keys carry a Bech32m
 * checksum, so a mistyped one fails here — while the roster is still on screen
 * and one cell away from being fixed. The same typo caught at payday has
 * already cost a filing and a funding round, and a wrong-but-valid key is not
 * detectable at all, which is exactly why the recoverable case should not also
 * be left to chance.
 */
export function keyToHex(key: string): string {
  const value = key.trim();
  if (/^[0-9a-fA-F]{64}$/.test(value)) return value.toLowerCase();

  // Midnight's strings run past bech32's default 90-character limit.
  const { words } = bech32m.decode(value as `${string}1${string}`, 1023);
  return Array.from(bech32m.fromWords(words), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * How many employees payroll.compact carries.
 *
 * Must match the `Vector<N, …>` sizes in the contract exactly — the circuit
 * rejects any other length — so changing it means editing the contract,
 * recompiling and redeploying.
 */
export const ROSTER_SIZE = 2;

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
  /**
   * Gross, in minor units (1e-6 pEUR).
   *
   * The only money figure the employer supplies. Tax, contribution and net are
   * derived from it by the published rule set — in the circuit, not here — so
   * there is no column an employer could understate independently of gross.
   */
  salaryMinor: bigint;
  /** Weeks worked in the period. Committed to, not applied to the salary. */
  weeks: number;
  /** Hex, 32 bytes. Hashed into `payeeFor`; the preimage stays here. */
  coinPublicKey: string;
  /** Hex. Never reaches the chain — it is an input to building the coin. */
  encryptionPublicKey: string;
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

  // Check the header names before reading a single row.
  //
  // A workbook from an older template has the right columns in the wrong
  // places, and every value then fails the validation for whatever column it
  // has landed in: a coin public key gets rejected for not being a number of
  // weeks, and the last column reads as missing because it was never there.
  // Each of those messages is accurate and none of them is the problem, which
  // is the worst way for a file to fail — the reader chases six symptoms
  // instead of one cause.
  const headerMismatch = ROSTER_COLUMNS.map((expected, i) => ({
    column: i + 1,
    expected,
    found: text(readCell(headerRow, i + 1)),
  })).filter(({ expected, found }) => normalized(found) !== normalized(expected));

  if (headerMismatch.length > 0) {
    const first = headerMismatch[0]!;
    problems.push({
      row: headerRow,
      message:
        `column ${first.column} is "${first.found || "(empty)"}" but should be ` +
        `"${first.expected}" — this workbook was made for an older template. ` +
        `Generate a fresh one with \`npm run roster:template\` and copy your rows across, ` +
        `or insert the missing columns.`,
    });
    return { rows, problems, period: null, totalMinor: 0n };
  }

  const period = readPeriod(readCell, normalized, text, headerRow, problems);

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return; // period block and header

    const cell = (n: number) => readCell(rowNumber, n);

    const fullName = String(cell(1) ?? "").trim();
    const address = String(cell(2) ?? "").trim();
    const rawSalary = cell(3);
    const rawWeeks = cell(4);
    const rawCoinKey = String(cell(KEY_COLUMNS.coin) ?? "").trim();
    const rawEncKey = String(cell(KEY_COLUMNS.encryption) ?? "").trim();

    // A blank line in the middle of a roster is a mistake worth reporting; a
    // fully blank trailing line is just spreadsheet padding.
    if (
      !fullName &&
      !address &&
      !rawCoinKey &&
      !rawEncKey &&
      (rawSalary === null || rawSalary === undefined || rawSalary === "")
    ) {
      return;
    }

    // Blank means a full month rather than an error: most rows are, and making
    // every employer type "4" on every line would be noise that invites typos.
    let weeks = FULL_MONTH_WEEKS;
    const weeksText = String(rawWeeks ?? "").trim();
    if (weeksText !== "") {
      const parsed = Number(weeksText);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        problems.push({
          row: rowNumber,
          message: `"${weeksText}" is not a whole number of weeks from 1 to 5`,
        });
      } else {
        weeks = parsed;
      }
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

    // Both keys are required, not optional-with-a-fallback. A slot filed
    // without them cannot be paid to anyone who can spend it, and the failure
    // would land after filing and funding rather than here.
    let coinPublicKey = "";
    let encryptionPublicKey = "";
    try {
      if (!rawCoinKey) throw new Error("missing coin public key");
      coinPublicKey = keyToHex(rawCoinKey);
      if (coinPublicKey.length !== 64) {
        throw new Error("coin public key is not 32 bytes");
      }
    } catch (error) {
      problems.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    try {
      if (!rawEncKey) throw new Error("missing encryption public key");
      encryptionPublicKey = keyToHex(rawEncKey);
    } catch (error) {
      problems.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    // Two employees sharing a key is a copy-paste slip, and it pays one person
    // twice while stranding the other's salary in a key they do not hold.
    if (coinPublicKey && rows.some((row) => row.coinPublicKey === coinPublicKey)) {
      problems.push({
        row: rowNumber,
        message: "coin public key is already used by another employee",
      });
    }

    rows.push({
      index: rows.length,
      fullName,
      address,
      salaryMinor,
      weeks,
      coinPublicKey,
      encryptionPublicKey,
    });
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
export interface TemplateRow {
  fullName: string;
  address: string;
  salary: string;
  weeks?: number;
  coinPublicKey?: string;
  encryptionPublicKey?: string;
}

/** Writes the template to disk. The CLI's `npm run roster:template`. */
export async function writeRosterTemplate(
  filePath: string,
  sample: TemplateRow[] = [],
  period?: { year: number; month: number }
): Promise<void> {
  const workbook = await buildRosterTemplate(sample, period);
  await workbook.xlsx.writeFile(filePath);
}

/**
 * The blank workbook, built rather than written.
 *
 * Split out so the browser can offer the same file as a download. It used to be
 * reachable only by running `npm run roster:template`, which was printed as
 * instructions on a page an employer opens and a developer does not — the same
 * mistake as the explorer note on the setup page.
 */
export async function buildRosterTemplate(
  sample: TemplateRow[] = [],
  period?: { year: number; month: number }
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "midnight-polisZK";
  const sheet = workbook.addWorksheet("Roster");

  sheet.getColumn(1).width = 26;
  sheet.getColumn(2).width = 42;
  sheet.getColumn(3).width = 22;
  sheet.getColumn(3).numFmt = "#,##0.00";
  // Bech32m keys are long. Narrower and Excel shows a column of ####.
  sheet.getColumn(4).width = 14;
  sheet.getColumn(KEY_COLUMNS.coin).width = 64;
  sheet.getColumn(KEY_COLUMNS.encryption).width = 64;

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

  // Said once, in the file, because whoever collects the keys is not
  // necessarily the person who read the dashboard explaining them. It goes
  // ABOVE the header: `parseRosterWorkbook` skips everything up to the header
  // row, and a line of prose below it parses as one more employee.
  const help = sheet.getCell(`A${HEADER_ROW - 1}`);
  help.value =
    "Tax, social contribution and net pay are NOT columns: they are computed " +
    "from gross by the published rule set, inside the circuit. Weeks may be " +
    "left blank for a full month. " +
    "Each employee sends you both keys from their own dashboard — neither is a " +
    "secret, and neither lets you spend their salary. Without them the payment " +
    "is made and their wallet can never find it.";
  help.font = { italic: true, size: 10 };

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
    row.getCell(4).value = sample[i]?.weeks ?? null;
    // Text, so Excel cannot decide a long key is a number and round it.
    row.getCell(KEY_COLUMNS.coin).value = sample[i]?.coinPublicKey ?? null;
    row.getCell(KEY_COLUMNS.encryption).value = sample[i]?.encryptionPublicKey ?? null;
  }

  return workbook;
}
