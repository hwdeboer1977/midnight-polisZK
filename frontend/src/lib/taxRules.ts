// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { fetchContractState } from "./chain";
import { loadContract } from "./contracts";
import { forNetwork, loadDeployments } from "./deployments";
import type { TaxParams } from "../generated/tax-params";

/**
 * The published tax rules, read from the registry rather than the bundle.
 *
 * Every rate shown anywhere else in this app comes from `DUTCH_V1` — a constant
 * compiled into the JavaScript. That is fine for arithmetic the page does on
 * the employer's own machine, and it is not evidence of anything: a bundle can
 * say whatever it was built to say. The registry is the copy that was published
 * on chain, under an authority key, append-only, and it is the copy the payroll
 * contract's recorded hashes actually point at.
 *
 * So this module reads the chain and the page shows both, side by side. Where
 * they agree, the constant is confirmed. Where they disagree, the page says so
 * rather than quietly rendering the local answer.
 */

/** One published version, with the hash a payroll contract records for it. */
export interface PublishedRuleSet {
  version: number;
  /** YYYYMM this version first applies to. */
  validFrom: number;
  params: TaxParams;
  /** `persistentHash<TaxParams>`, hex — what `setParamsFor` writes per month. */
  hash: string;
}

/** Which months one payroll contract may file, and under which rules. */
export interface ContractWindow {
  /** Instance name, or "payroll" for the deployment's own contract. */
  label: string;
  address: string;
  /** Months with a rule set recorded, oldest first. */
  months: number[];
  /**
   * Months pointing at a hash no published version produces.
   *
   * Should always be empty. It is read and shown because the alternative is a
   * page that asserts agreement without checking it — and this is the one check
   * that makes the registry more than decoration.
   */
  unmatched: number[];
}

export interface TaxRules {
  /** Registry address, or null when this build has none configured. */
  registry: string | null;
  /** The key allowed to publish a version. */
  authority: string | null;
  versions: PublishedRuleSet[];
  /** Highest version published, which is the one in force. */
  latest: PublishedRuleSet | null;
  windows: ContractWindow[];
}

const hex = (bytes: Uint8Array): string =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

/** The chain's bigint struct in the shape the local arithmetic takes. */
function toTaxParams(raw: {
  version: bigint;
  validFrom: bigint;
  threshold1: bigint;
  threshold2: bigint;
  rate1: bigint;
  rate2: bigint;
  rate3: bigint;
  maxContribBase: bigint;
  contribRate: bigint;
}): TaxParams {
  return {
    version: Number(raw.version),
    validFrom: Number(raw.validFrom),
    threshold1: raw.threshold1,
    threshold2: raw.threshold2,
    rate1: Number(raw.rate1),
    rate2: Number(raw.rate2),
    rate3: Number(raw.rate3),
    maxContribBase: raw.maxContribBase,
    contribRate: Number(raw.contribRate),
  };
}

/**
 * Reads the registry, then every payroll contract's rule window.
 *
 * The windows are read second and independently: a registry with a version
 * published and a contract with no month recorded is a real and undramatic
 * state — it means nobody has opened a month on that contract yet — and the
 * page has to be able to say exactly that rather than fail as a whole.
 */
export async function readTaxRules(networkId: string): Promise<TaxRules> {
  const deployments = await loadDeployments();
  const here = forNetwork(deployments, networkId);
  const registryEntry = here.find(([, d]) => d.contractName === "taxparams");
  const payrolls = here.filter(([, d]) => d.contractName === "payroll" && !d.retired);

  const out: TaxRules = {
    registry: registryEntry?.[1].contractAddress ?? null,
    authority: null,
    versions: [],
    latest: null,
    windows: [],
  };

  if (registryEntry) {
    // `pureCircuits` is not on the shared ContractModule type — that type
    // exists to describe "something with a ledger", which is all every other
    // caller needs. Hashing is this module's one extra requirement.
    const module = (await loadContract("taxparams")) as any;
    const state = await fetchContractState(networkId, registryEntry[1].contractAddress);
    if (state) {
      const ledger = module.ledger(state.data);
      out.authority = hex(ledger.authority.bytes);
      for (const [, raw] of ledger.paramsFor as Iterable<[bigint, any]>) {
        const params = toTaxParams(raw);
        out.versions.push({
          version: params.version,
          validFrom: params.validFrom,
          params,
          // Hashed with the registry's own circuit, not a reimplementation —
          // the whole point is to compare against what the contract computed.
          hash: hex(module.pureCircuits.paramsHash(raw)),
        });
      }
      out.versions.sort((a, b) => a.version - b.version);
      const latestVersion = Number(ledger.latestVersion);
      out.latest = out.versions.find((v) => v.version === latestVersion) ?? null;
    }
  }

  const published = new Set(out.versions.map((v) => v.hash));
  const payroll = (await loadContract("payroll")) as any;
  for (const [label, deployment] of payrolls) {
    try {
      const state = await fetchContractState(networkId, deployment.contractAddress);
      if (!state) continue;
      const ledger = payroll.ledger(state.data);
      const months: number[] = [];
      const unmatched: number[] = [];
      for (const [period, recorded] of ledger.paramsHashFor as Iterable<
        [bigint, Uint8Array]
      >) {
        months.push(Number(period));
        // Only meaningful once at least one version has been read; an empty
        // registry would otherwise mark every month as foreign.
        if (published.size > 0 && !published.has(hex(recorded))) {
          unmatched.push(Number(period));
        }
      }
      months.sort((a, b) => a - b);
      unmatched.sort((a, b) => a - b);
      out.windows.push({
        label,
        address: deployment.contractAddress,
        months,
        unmatched,
      });
    } catch {
      // A contract this build cannot decode is not a reason to show no rules.
      // It is already counted as unreadable on the public page.
    }
  }

  return out;
}
