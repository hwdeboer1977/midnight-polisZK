/**
 * Turning a node rejection into something an employer can act on.
 *
 * A transaction that the node refuses comes back as a JSON-RPC envelope, and
 * the useful part of it is one number. The shape substrate sends is
 *
 *     { code: 1010, message: "Invalid Transaction", data: "Custom error: 241" }
 *
 * where 1010 only says "the pool rejected it" and `241` says which of two
 * hundred-odd ledger rules was broken. By the time that reaches a `catch` in a
 * component it has usually been flattened to a string, and every failure looks
 * the same: a spent coin, a stale merkle root and a duplicate commitment all
 * render as one unreadable line with a number buried in it.
 *
 * ── Why a table and not a message per call site ──────────────────────────────
 *
 * The same five codes can come out of filing, funding and paying, and the
 * advice for each does not depend on which one was running. Writing it at the
 * three call sites would mean three copies drifting apart; writing it here
 * means `submitTx` is the only place that has to know.
 *
 * ── Why 103 is in the table but not the answer ───────────────────────────────
 *
 * 103 was a catch-all `Zswap` rejection and is retired: current nodes split it
 * into 239/240/241/250, which say what actually failed. It stays listed because
 * a node that has not been upgraded still emits it, and a fallback that says
 * "one of these four things" beats a bare number. It is deliberately the least
 * specific entry — if a current node is in use, one of the other four answers.
 *
 * ── What this does NOT claim ─────────────────────────────────────────────────
 *
 * Which wrapper the connector puts around the node's reply is not pinned down
 * here, because it is not ours and has changed shape before. So the extractor
 * reads defensively: it walks the `cause` chain, looks at `data` and `message`
 * on anything object-shaped, and accepts either the wire spelling
 * (`Custom error: N`), the Rust spelling (`InvalidTransaction::Custom(N)`) or
 * the enum name (`Zswap(UnknownMerkleRoot)`). Finding nothing is an expected
 * outcome, not a bug — `describeSubmitError` then returns the original message
 * unchanged, which is exactly what the call sites did before.
 */

/** One ledger rejection, in the terms of the person who hit it. */
export interface NodeErrorExplanation {
  /** The `Custom error: N` u8. */
  code: number;
  /** The node's own name for it, kept so a log line can be searched for. */
  name: string;
  /** What went wrong, without the vocabulary of the ledger. */
  what: string;
  /** What to do about it. */
  fix: string;
}

/**
 * The Zswap rejections a payroll run can realistically provoke.
 *
 * Deliberately not the whole 0-255 table. Every entry here is one this app can
 * cause by spending shielded coins — a wrong balance, a stale read, a repeated
 * nonce. Codes that only a validator or a governance transaction can trigger
 * would be noise, and a table nobody trusts to be relevant gets ignored.
 *
 * Extending it is adding a row: the neighbours most likely to be wanted next
 * are 242 and 244 (intent TTL expired, intent already exists), which show up
 * when a transaction is built and then submitted much later.
 */
const LEDGER_ERRORS: Record<number, NodeErrorExplanation> = {
  103: {
    code: 103,
    name: "Zswap",
    what:
      "The network refused the shielded part of this transaction. This node " +
      "reports the old catch-all code, so it will not say which of the four " +
      "causes it was: a coin that was already spent, a coin built twice from " +
      "the same nonce, a stale view of the coin tree, or an internal fault.",
    fix:
      "Reload the page so the coins are read fresh, then try again. If it " +
      "repeats, the funding step and the payment step are probably reading " +
      "different views of the tree.",
  },
  239: {
    code: 239,
    name: "Zswap.Invalid.NullifierAlreadyPresent",
    what:
      "One of the coins this payment spends has already been spent. The page " +
      "is working from a view of the wallet that the chain has moved past.",
    fix:
      "Reload the page to re-read the coins, then run the payment again. If a " +
      "payment was already submitted for this period, check the contract " +
      "state before resending — it may have gone through.",
  },
  240: {
    code: 240,
    name: "Zswap.Invalid.CommitmentAlreadyPresent",
    what:
      "This transaction would create a coin that already exists. Two coins " +
      "were derived from the same nonce, so they are the same coin twice.",
    fix:
      "Re-run the step that created the coin so a fresh nonce is drawn. If it " +
      "recurs for one particular slot, the nonce derivation for that slot is " +
      "producing a repeat — see `openings.ts`.",
  },
  241: {
    code: 241,
    name: "Zswap.Invalid.UnknownMerkleRoot",
    what:
      "The proof was built against a version of the coin tree the node does " +
      "not recognise. The leaf positions used to build it came from a " +
      "different view than the one that proved it.",
    fix:
      "Wait for the new coins to be indexed and try again. If it is " +
      "reproducible, the leaf positions and the proof are being read through " +
      "different providers — `fetchContractLeaves` takes the proving provider " +
      "precisely so they cannot be.",
  },
  250: {
    code: 250,
    name: "Zswap.Invalid.MerkleTreeError",
    what:
      "The node hit an internal fault in the shielded coin tree while " +
      "checking this transaction. Nothing about the payment itself is known " +
      "to be wrong.",
    fix: "Rebuild and resubmit the transaction. If it repeats, check the node's logs.",
  },
};

/** How the u8 is spelled by the layers that might have stringified it. */
const CODE_PATTERNS: RegExp[] = [
  /Custom\s*error\s*:\s*(\d{1,3})/i,
  /Custom\s*\(\s*(\d{1,3})\s*\)/i,
];

/**
 * Enum names, for the layers that pass the Rust spelling through instead.
 *
 * The node's own `Description` field is `Transaction Error:Invalid(Zswap(...))`,
 * so a caller that forwards the text rather than the code still lands here.
 */
const NAME_PATTERNS: Array<[RegExp, number]> = [
  [/NullifierAlreadyPresent/i, 239],
  [/CommitmentAlreadyPresent/i, 240],
  [/UnknownMerkleRoot/i, 241],
  [/Zswap\s*\(\s*MerkleTreeError/i, 250],
];

/**
 * Every string worth searching inside a thrown value.
 *
 * Errors arrive wrapped — an `Error` whose `cause` is a connector error whose
 * `data` holds the node's reply — and the number can be at any depth. The seen
 * set is not paranoia: `cause` chains can loop, and a stack overflow while
 * reporting an error would replace a bad message with no message.
 */
function errorText(cause: unknown, seen = new Set<unknown>(), depth = 0): string[] {
  if (cause == null || depth > 8 || seen.has(cause)) return [];
  seen.add(cause);

  if (typeof cause === "string") return [cause];
  if (typeof cause !== "object") return [String(cause)];

  const parts: string[] = [];
  const record = cause as Record<string, unknown>;
  for (const key of ["message", "data", "reason", "error", "detail"]) {
    const value = record[key];
    if (typeof value === "string") parts.push(value);
    else if (value != null) parts.push(...errorText(value, seen, depth + 1));
  }
  if (record.cause != null) parts.push(...errorText(record.cause, seen, depth + 1));

  // Last resort for a shape none of the above named. Guarded because a value
  // holding a cycle or a BigInt throws here, and this is error handling: it has
  // to be the one thing that cannot itself fail.
  if (parts.length === 0) {
    try {
      parts.push(JSON.stringify(cause));
    } catch {
      parts.push(String(cause));
    }
  }
  return parts;
}

/**
 * The ledger error code inside a thrown value, if there is one.
 *
 * Exported for callers that want to branch rather than print — retry logic, or
 * a test asserting a particular rejection.
 */
export function nodeErrorCode(cause: unknown): number | null {
  const texts = errorText(cause);
  for (const text of texts) {
    for (const pattern of CODE_PATTERNS) {
      const found = text.match(pattern);
      // The wire field is a u8; anything outside that range matched something
      // else that happened to look like a code.
      if (found) {
        const code = Number(found[1]);
        if (code >= 0 && code <= 255) return code;
      }
    }
  }
  for (const text of texts) {
    for (const [pattern, code] of NAME_PATTERNS) {
      if (pattern.test(text)) return code;
    }
  }
  return null;
}

/** The table entry for a thrown value, when it names one we explain. */
export function explainNodeError(cause: unknown): NodeErrorExplanation | null {
  const code = nodeErrorCode(cause);
  return code == null ? null : (LEDGER_ERRORS[code] ?? null);
}

/**
 * The message to show for a failed submission.
 *
 * Falls back to `cause instanceof Error ? cause.message : String(cause)` — the
 * idiom every call site already uses — so wiring this in can only add detail,
 * never remove any. The original text is kept on the end even when the code is
 * recognised: the explanation is for the employer, the raw line is for whoever
 * they end up sending the screenshot to.
 */
export function describeSubmitError(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : String(cause);
  const known = explainNodeError(cause);
  if (!known) return raw;
  return `${known.what} ${known.fix} (node error ${known.code}, ${known.name}: ${raw})`;
}
