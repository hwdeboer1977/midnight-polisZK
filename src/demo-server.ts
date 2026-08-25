import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import chalk from "chalk";
import { fundAndPay } from "./utils/payroll-run.js";
import { onboardEmployer } from "./utils/onboarding.js";
import {
  EMPLOYER_ALLOWANCE,
  fundEmployer,
  mintExtra,
  mintToRecipient,
} from "./utils/funding.js";
import { parsePeurAmount } from "./utils/constructor-args.js";
import { EnvironmentManager } from "./utils/environment.js";
import {
  findRegistration,
  listRegistrations,
  type Registration,
} from "./utils/registry.js";

/**
 * Self-service onboarding and funding for the demo.
 *
 * ⚠️  DEMO ONLY. This process holds the platform's own signing key. It will
 * deploy a contract, spend fees and mint pEUR for anyone who can reach it: there
 * is no authentication, no rate limiting and no approval step, so it binds to
 * localhost and refuses to start otherwise. In production this becomes an
 * authenticated endpoint on a real backend, where a human approves a company
 * before any contract is deployed or any allowance is issued.
 *
 * What does bound the damage is on chain rather than here. Funding is refused
 * unless the contract itself names the requesting key as its employer, and the
 * starter allowance is recorded so it can only be drawn once.
 *
 * Every operation takes minutes — far too long to hold an HTTP request open —
 * so each runs as a job the client polls at /api/job/:id.
 */
const HOST = "127.0.0.1";
const PORT = Number(process.env.DEMO_SERVER_PORT ?? 8787);

/** Read once at startup so an unknown MIDNIGHT_NETWORK fails here, not per request. */
const network = EnvironmentManager.getNetworkConfig();

type Job =
  | { status: "running"; log: string[]; startedAt: string }
  | { status: "done"; log: string[]; startedAt: string; result: unknown }
  | { status: "failed"; log: string[]; startedAt: string; error: string };

const jobs = new Map<string, Job>();

/** One at a time: concurrent runs would race for the same wallet coins. */
let busy = false;

function json(res: ServerResponse, code: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
    // The dev server proxies /api, so this is only needed if the page is opened
    // from a different origin during a demo.
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
  });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8_000) {
        req.destroy();
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/**
 * Shapes a registration for the wire.
 *
 * `id` stays behind: it is a database detail, and a client that keys off it
 * would break the moment these rows are rebuilt from `deployment.json`. The
 * pair that actually identifies a registration is `(networkId, instance)`.
 *
 * `effectiveStatus` is the field worth sending. It folds an elapsed term into
 * the answer, so a caller never compares an expiry against its own clock and
 * reaches a different conclusion than the platform did.
 */
function toJson(row: Registration) {
  return {
    companyName: row.companyName,
    instance: row.instance,
    networkId: row.networkId,
    contractAddress: row.contractAddress,
    employerKey: row.employerKey,
    registeredAt: row.registeredAt.toISOString(),
    termMonths: row.termMonths,
    expiresAt: row.expiresAt.toISOString(),
    status: row.status,
    effectiveStatus: row.effectiveStatus,
  };
}

/**
 * Runs one operation as a polled job.
 *
 * The wallet is a single resource, so a second request while one is in flight is
 * refused rather than queued — waiting silently behind a job that takes minutes
 * is indistinguishable from a hang.
 */
function startJob(
  res: ServerResponse,
  label: string,
  run: (log: (line: string) => void) => Promise<unknown>
) {
  if (busy) {
    return json(res, 409, {
      error: "Another operation is already running — try again in a minute",
    });
  }

  const id = randomUUID();
  const job: Job = { status: "running", log: [], startedAt: new Date().toISOString() };
  jobs.set(id, job);
  busy = true;

  console.log(chalk.blue(`▶ ${label}`));

  void run((line) => {
    const current = jobs.get(id);
    if (current) current.log.push(line);
    console.log(chalk.gray(`   ${line}`));
  })
    .then((result) => {
      jobs.set(id, { ...job, status: "done", result });
      console.log(chalk.green(`✔ ${label}`));
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      jobs.set(id, { ...job, status: "failed", error: message });
      console.log(chalk.red(`✘ ${message}`));
    })
    .finally(() => {
      busy = false;
    });

  return json(res, 202, { jobId: id });
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);

  if (req.method === "OPTIONS") return json(res, 204, {});

  if (req.method === "GET" && url.pathname.startsWith("/api/job/")) {
    const job = jobs.get(url.pathname.slice("/api/job/".length));
    return job ? json(res, 200, job) : json(res, 404, { error: "Unknown job" });
  }

  /**
   * The platform's record of who is registered.
   *
   * Read-only on purpose. Registrations are written by onboarding and ended by
   * an operator at the CLI; exposing a write here would put the commercial
   * relationship behind the same unauthenticated door as the demo faucet.
   *
   * Nothing this returns is authoritative over the chain. It answers "did this
   * company buy the service, and does that still stand" — not "who controls
   * this payroll", which only the contract can answer.
   */
  /**
   * Funds and pays a filed period.
   *
   * ⚠️ Signs with the platform wallet, so it only works where the employer IS
   * the operator. It exists because circuits with coin operations cannot
   * currently be proven through the browser — see `payroll-run.ts`.
   *
   * The request carries salaries and the payroll passphrase. Both stay on this
   * machine — the service is bound to 127.0.0.1 — but this is the one place
   * where "the roster never leaves your browser" stops being literally true,
   * and it should be read as such rather than glossed over.
   */
  if (req.method === "POST" && url.pathname === "/api/payroll/run") {
    void (async () => {
      try {
        const body = JSON.parse(await readBody(req)) as {
          instance?: string;
          period?: number;
          slots?: {
            salary?: string;
            gross?: string;
            tax?: string;
            social?: string;
            net?: string;
            weeks?: number;
            salaryNonce?: string;
            coinNonce?: string;
            payee?: string;
            payeeEnc?: string;
          }[];
        };

        if (!body.instance || !body.period || !body.slots?.length) {
          return json(res, 400, {
            error: "instance, period and slots are all required",
          });
        }

        const hex = (value: string | undefined, field: string) => {
          if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
            throw new Error(`${field} must be 64 hex characters`);
          }
          return Uint8Array.from(Buffer.from(value, "hex"));
        };

        // Note what is absent: the payroll passphrase. This takes only the
        // material for the period being paid, so a compromised service learns
        // one month's amounts rather than every period and every employee key.
        const slots = body.slots.map((slot, i) => ({
          // `gross` is what the page sends; `salary` is the older name, kept so
          // a request built against the previous shape fails on the missing
          // withholding fields rather than silently funding a wrong figure.
          salary: BigInt(slot.gross ?? slot.salary ?? "0"),
          tax: BigInt(slot.tax ?? "0"),
          social: BigInt(slot.social ?? "0"),
          net: BigInt(slot.net ?? "0"),
          weeks: Number(slot.weeks ?? 4),
          salaryNonce: hex(slot.salaryNonce, `slots[${i}].salaryNonce`),
          coinNonce: hex(slot.coinNonce, `slots[${i}].coinNonce`),
          payee: hex(slot.payee, `slots[${i}].payee`),
          // Not run through `hex()`: an encryption public key is not 32 bytes,
          // and the mapping wants it as the hex string the SDK compares against.
          payeeEnc: (slot.payeeEnc ?? "").toLowerCase(),
        }));

        if (slots.some((slot) => slot.net <= 0n)) {
          return json(res, 400, {
            error:
              "every slot needs gross, tax, social and net — the commitment binds " +
              "all four, so the gross alone cannot open it",
          });
        }

        if (slots.some((slot) => !/^[0-9a-f]+$/.test(slot.payeeEnc))) {
          return json(res, 400, {
            error: "every slot needs a hex payeeEnc (the payee's encryption public key)",
          });
        }

        startJob(res, `fund+pay ${body.instance} ${body.period}`, (log) =>
          fundAndPay(body.instance!, body.period!, slots, log)
        );
      } catch (error) {
        json(res, 400, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/registrations") {
    void (async () => {
      // Defaults to the network this server is pointed at. The same company on
      // two networks is two registrations against two different chains, so
      // answering across all of them by default would invite reading one for
      // the other; `?network=all` asks for that explicitly.
      const requested = url.searchParams.get("network")?.trim();
      const networkId =
        requested === "all" ? undefined : requested || network.networkId;
      const instance = url.searchParams.get("instance")?.trim();

      try {
        if (instance) {
          if (!networkId) {
            return json(res, 400, {
              error: "An instance lookup needs one network — drop network=all",
            });
          }
          const row = await findRegistration(networkId, instance);
          return row
            ? json(res, 200, toJson(row))
            : json(res, 404, {
                error: `No registration "${instance}" on ${networkId}`,
              });
        }

        const rows = await listRegistrations(networkId);
        return json(res, 200, {
          networkId: networkId ?? "all",
          registrations: rows.map(toJson),
        });
      } catch (cause) {
        // A database that is down is an outage of this service, not a bad
        // request. The caller can do nothing but retry, so 503 rather than 500
        // — and say which command starts it, since this is a demo.
        const message = cause instanceof Error ? cause.message : String(cause);
        console.log(chalk.red(`✘ registrations: ${message}`));
        return json(res, 503, {
          error: "The registration database is unavailable — start it with `npm run db:up`",
          detail: message,
        });
      }
    })();
    return;
  }

  if (req.method === "POST") {
    void (async () => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse((await readBody(req)) || "{}");
      } catch {
        return json(res, 400, { error: "Body must be JSON" });
      }

      if (url.pathname === "/api/onboard") {
        const instance = parsed.instance as string | undefined;
        const employerKey = parsed.employerKey as string | undefined;
        const companyName = parsed.companyName as string | undefined;
        if (!instance || !employerKey) {
          return json(res, 400, { error: "instance and employerKey are required" });
        }
        return startJob(res, `onboarding "${instance}"`, (log) =>
          onboardEmployer(instance, employerKey, log, companyName)
        );
      }

      if (url.pathname === "/api/claim") {
        const coinPublicKey = parsed.coinPublicKey as string | undefined;
        const encryptionPublicKey = parsed.encryptionPublicKey as string | undefined;
        if (!coinPublicKey || !encryptionPublicKey) {
          return json(res, 400, {
            // Both, because a coin minted without the encryption key is
            // undetectable by its recipient and cannot be recovered.
            error: "coinPublicKey and encryptionPublicKey are required",
          });
        }
        return startJob(res, `funding ${coinPublicKey.slice(0, 16)}…`, (log) =>
          fundEmployer(coinPublicKey, encryptionPublicKey, EMPLOYER_ALLOWANCE, log)
        );
      }

      // The open faucet: mints pEUR to the caller, any amount, no questions.
      // Distinct from /api/claim, which is the registered employer's once-only
      // starter allowance and whose restrictions are deliberate.
      if (url.pathname === "/api/faucet") {
        const coinPublicKey = parsed.coinPublicKey as string | undefined;
        const encryptionPublicKey = parsed.encryptionPublicKey as string | undefined;
        if (!coinPublicKey || !encryptionPublicKey) {
          return json(res, 400, {
            error: "coinPublicKey and encryptionPublicKey are required",
          });
        }

        let amount: bigint;
        try {
          amount = parsePeurAmount(String(parsed.amount ?? ""));
        } catch (cause) {
          return json(res, 400, {
            error: cause instanceof Error ? cause.message : String(cause),
          });
        }

        return startJob(res, `minting to ${coinPublicKey.slice(0, 16)}…`, (log) =>
          mintToRecipient(coinPublicKey, encryptionPublicKey, amount, log)
        );
      }

      if (url.pathname === "/api/mint") {
        let amount: bigint;
        try {
          amount = parsePeurAmount(String(parsed.amount ?? ""));
        } catch (cause) {
          return json(res, 400, {
            error: cause instanceof Error ? cause.message : String(cause),
          });
        }
        return startJob(res, `minting ${amount} minor units`, (log) =>
          mintExtra(amount, log)
        );
      }

      return json(res, 404, { error: "Not found" });
    })();
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log();
  console.log(chalk.yellow.bold("⚠️  DEMO SERVICE — not for production"));
  console.log(
    chalk.gray(
      "   Holds the platform signing key. Deploys contracts and mints pEUR\n" +
        "   on request, with no authentication. Bound to localhost only."
    )
  );
  console.log();
  console.log(chalk.cyan(`   POST http://${HOST}:${PORT}/api/onboard`));
  console.log(chalk.cyan(`   POST http://${HOST}:${PORT}/api/claim`));
  console.log(chalk.cyan(`   POST http://${HOST}:${PORT}/api/mint`));
  console.log(chalk.cyan(`   POST http://${HOST}:${PORT}/api/faucet`));
  console.log(chalk.cyan(`   GET  http://${HOST}:${PORT}/api/registrations`));
  console.log(chalk.gray(`   network: ${network.networkId}`));
  console.log();
});
