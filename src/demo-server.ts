import "dotenv/config";
import { createServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import chalk from "chalk";
import { onboardEmployer, type OnboardResult } from "./utils/onboarding.js";

/**
 * Self-service onboarding for the demo.
 *
 * ⚠️  DEMO ONLY. This process holds the platform's own signing key and will
 * deploy a contract and spend fees for anyone who can reach it. There is no
 * authentication, no rate limiting and no approval step, so it binds to
 * localhost and refuses to start otherwise. In production this becomes an
 * authenticated endpoint on a real backend, where a human approves a company
 * before any contract is deployed.
 *
 * Onboarding takes minutes, which is far too long to hold an HTTP request open,
 * so the work runs as a job the client polls.
 */
const HOST = "127.0.0.1";
const PORT = Number(process.env.DEMO_SERVER_PORT ?? 8787);

type Job =
  | { status: "running"; log: string[]; startedAt: string }
  | { status: "done"; log: string[]; startedAt: string; result: OnboardResult }
  | { status: "failed"; log: string[]; startedAt: string; error: string };

const jobs = new Map<string, Job>();

/** One at a time: concurrent deploys would race for the same wallet coins. */
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

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);

  if (req.method === "OPTIONS") return json(res, 204, {});

  if (req.method === "GET" && url.pathname.startsWith("/api/onboard/")) {
    const job = jobs.get(url.pathname.slice("/api/onboard/".length));
    return job ? json(res, 200, job) : json(res, 404, { error: "Unknown job" });
  }

  if (req.method === "POST" && url.pathname === "/api/onboard") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8_000) req.destroy();
    });
    req.on("end", () => {
      let parsed: { instance?: string; employerKey?: string };
      try {
        parsed = JSON.parse(body || "{}");
      } catch {
        return json(res, 400, { error: "Body must be JSON" });
      }

      const { instance, employerKey } = parsed;
      if (!instance || !employerKey) {
        return json(res, 400, { error: "instance and employerKey are required" });
      }
      if (busy) {
        return json(res, 409, {
          error: "Another onboarding is already running — try again in a minute",
        });
      }

      const id = randomUUID();
      const job: Job = { status: "running", log: [], startedAt: new Date().toISOString() };
      jobs.set(id, job);
      busy = true;

      console.log(chalk.blue(`▶ onboarding "${instance}" for ${employerKey.slice(0, 16)}…`));

      void onboardEmployer(instance, employerKey, (line) => {
        const current = jobs.get(id);
        if (current) current.log.push(line);
        console.log(chalk.gray(`   ${line}`));
      })
        .then((result) => {
          jobs.set(id, { ...job, status: "done", result });
          console.log(chalk.green(`✔ ${result.key} -> ${result.contractAddress}`));
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
    });
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log();
  console.log(chalk.yellow.bold("⚠️  DEMO ONBOARDING SERVICE — not for production"));
  console.log(
    chalk.gray(
      "   Holds the platform signing key and deploys contracts on request,\n" +
        "   with no authentication. Bound to localhost only."
    )
  );
  console.log();
  console.log(chalk.cyan(`   http://${HOST}:${PORT}/api/onboard`));
  console.log(chalk.gray(`   network: ${process.env.MIDNIGHT_NETWORK ?? "local"}`));
  console.log();
});
