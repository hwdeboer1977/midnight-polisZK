import { randomUUID } from "crypto";
import type { Response } from "express";

/**
 * Long operations, as jobs the client polls.
 *
 * Everything the platform routes do — deploying, syncing a wallet, proving —
 * takes minutes, which is far longer than an HTTP request should stay open.
 * Each starts a job, answers 202 with its id, and reports progress at
 * /api/job/:id.
 *
 * Lifted out of `demo-server.ts` unchanged in behaviour, including the single
 * `busy` flag: concurrent runs would race for the same wallet coins, and two
 * transactions spending one coin means one of them fails after several minutes
 * of proving.
 *
 * In memory, so a restart forgets everything in flight. That is honest for what
 * this is — the chain is the record, and a job's result is a convenience — but
 * it is the first thing to change if this ever runs behind more than one
 * process, since a second instance would not know this one is busy.
 */
export type Job =
  | { status: "running"; log: string[]; startedAt: string }
  | { status: "done"; log: string[]; startedAt: string; result: unknown }
  | { status: "failed"; log: string[]; startedAt: string; error: string };

const jobs = new Map<string, Job>();

/** One at a time: concurrent runs would race for the same wallet coins. */
let busy = false;

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

/**
 * Starts one job and answers with its id.
 *
 * The `log` callback the work receives appends to the job's transcript, so a
 * caller polling sees progress rather than a silent three minutes.
 */
export function startJob(
  res: Response,
  label: string,
  work: (log: (line: string) => void) => Promise<unknown>
): void {
  if (busy) {
    res.status(409).json({
      error: "Another operation is already running — it spends the same wallet. Try again shortly.",
    });
    return;
  }

  const id = randomUUID();
  const startedAt = new Date().toISOString();
  const log: string[] = [];
  jobs.set(id, { status: "running", log, startedAt });
  busy = true;

  console.log(`▶ ${label} (${id})`);

  void work((line) => {
    log.push(line);
  })
    .then((result) => {
      jobs.set(id, { status: "done", log, startedAt, result });
      console.log(`✔ ${label}`);
    })
    .catch((cause: unknown) => {
      const error = cause instanceof Error ? cause.message : String(cause);
      jobs.set(id, { status: "failed", log, startedAt, error });
      console.log(`✘ ${label}: ${error}`);
    })
    .finally(() => {
      busy = false;
    });

  res.status(202).json({ jobId: id });
}
