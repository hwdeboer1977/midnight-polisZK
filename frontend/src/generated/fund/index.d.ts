import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  publishParams(context: __compactRuntime.CircuitContext<PS>,
                params_0: { version: bigint,
                            validFrom: bigint,
                            maxMonthlyGross: bigint,
                            rate: bigint,
                            minMonths: bigint
                          }): __compactRuntime.CircuitResults<PS, []>;
  publishRoot(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              root_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  fundBenefits(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               source_0: Uint8Array,
               amount_0: bigint,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  claim(context: __compactRuntime.CircuitContext<PS>,
        path_0: { leaf: Uint8Array,
                  path: { sibling: { field: bigint }, goes_left: boolean }[]
                },
        leaf_0: { commitment: Uint8Array,
                  payeeBinding: Uint8Array,
                  claimKeyHash: Uint8Array,
                  finalPeriod: bigint,
                  monthsWorked: bigint,
                  instance: Uint8Array
                },
        gross_0: bigint,
        tax_0: bigint,
        social_0: bigint,
        net_0: bigint,
        weeks_0: bigint,
        employer_0: { bytes: Uint8Array },
        payrollParamsHash_0: Uint8Array,
        nonce_0: Uint8Array,
        claimKey_0: Uint8Array,
        window_0: bigint,
        params_0: { version: bigint,
                    validFrom: bigint,
                    maxMonthlyGross: bigint,
                    rate: bigint,
                    minMonths: bigint
                  },
        taxParams_0: { version: bigint,
                       validFrom: bigint,
                       threshold1: bigint,
                       threshold2: bigint,
                       rate1: bigint,
                       rate2: bigint,
                       rate3: bigint,
                       maxContribBase: bigint,
                       contribRate: bigint
                     },
        benefitQ_0: bigint,
        benefitTaxQ_0: bigint,
        benefitSocialQ_0: bigint,
        coin_0: { nonce: Uint8Array,
                  color: Uint8Array,
                  value: bigint,
                  mt_index: bigint
                }): __compactRuntime.CircuitResults<PS, []>;
  remitBenefitTax(context: __compactRuntime.CircuitContext<PS>,
                  coin_0: { nonce: Uint8Array,
                            color: Uint8Array,
                            value: bigint,
                            mt_index: bigint
                          }): __compactRuntime.CircuitResults<PS, []>;
  remitBenefitSocial(context: __compactRuntime.CircuitContext<PS>,
                     coin_0: { nonce: Uint8Array,
                               color: Uint8Array,
                               value: bigint,
                               mt_index: bigint
                             }): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  publishParams(context: __compactRuntime.CircuitContext<PS>,
                params_0: { version: bigint,
                            validFrom: bigint,
                            maxMonthlyGross: bigint,
                            rate: bigint,
                            minMonths: bigint
                          }): __compactRuntime.CircuitResults<PS, []>;
  publishRoot(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              root_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  fundBenefits(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               source_0: Uint8Array,
               amount_0: bigint,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  claim(context: __compactRuntime.CircuitContext<PS>,
        path_0: { leaf: Uint8Array,
                  path: { sibling: { field: bigint }, goes_left: boolean }[]
                },
        leaf_0: { commitment: Uint8Array,
                  payeeBinding: Uint8Array,
                  claimKeyHash: Uint8Array,
                  finalPeriod: bigint,
                  monthsWorked: bigint,
                  instance: Uint8Array
                },
        gross_0: bigint,
        tax_0: bigint,
        social_0: bigint,
        net_0: bigint,
        weeks_0: bigint,
        employer_0: { bytes: Uint8Array },
        payrollParamsHash_0: Uint8Array,
        nonce_0: Uint8Array,
        claimKey_0: Uint8Array,
        window_0: bigint,
        params_0: { version: bigint,
                    validFrom: bigint,
                    maxMonthlyGross: bigint,
                    rate: bigint,
                    minMonths: bigint
                  },
        taxParams_0: { version: bigint,
                       validFrom: bigint,
                       threshold1: bigint,
                       threshold2: bigint,
                       rate1: bigint,
                       rate2: bigint,
                       rate3: bigint,
                       maxContribBase: bigint,
                       contribRate: bigint
                     },
        benefitQ_0: bigint,
        benefitTaxQ_0: bigint,
        benefitSocialQ_0: bigint,
        coin_0: { nonce: Uint8Array,
                  color: Uint8Array,
                  value: bigint,
                  mt_index: bigint
                }): __compactRuntime.CircuitResults<PS, []>;
  remitBenefitTax(context: __compactRuntime.CircuitContext<PS>,
                  coin_0: { nonce: Uint8Array,
                            color: Uint8Array,
                            value: bigint,
                            mt_index: bigint
                          }): __compactRuntime.CircuitResults<PS, []>;
  remitBenefitSocial(context: __compactRuntime.CircuitContext<PS>,
                     coin_0: { nonce: Uint8Array,
                               color: Uint8Array,
                               value: bigint,
                               mt_index: bigint
                             }): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  leafDigest(leaf_0: { commitment: Uint8Array,
                       payeeBinding: Uint8Array,
                       claimKeyHash: Uint8Array,
                       finalPeriod: bigint,
                       monthsWorked: bigint,
                       instance: Uint8Array
                     }): Uint8Array;
  treeLeaf(digest_0: Uint8Array): bigint;
  treeNode(leftNode_0: bigint, rightNode_0: bigint): bigint;
  pathRoot(path_0: { leaf: Uint8Array,
                     path: { sibling: { field: bigint }, goes_left: boolean }[]
                   }): bigint;
  taxParamsHash(params_0: { version: bigint,
                            validFrom: bigint,
                            threshold1: bigint,
                            threshold2: bigint,
                            rate1: bigint,
                            rate2: bigint,
                            rate3: bigint,
                            maxContribBase: bigint,
                            contribRate: bigint
                          }): Uint8Array;
  claimKeyHash(claimKey_0: Uint8Array): Uint8Array;
  claimNullifier(claimKey_0: Uint8Array, window_0: bigint, fund_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  publishParams(context: __compactRuntime.CircuitContext<PS>,
                params_0: { version: bigint,
                            validFrom: bigint,
                            maxMonthlyGross: bigint,
                            rate: bigint,
                            minMonths: bigint
                          }): __compactRuntime.CircuitResults<PS, []>;
  publishRoot(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              root_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  fundBenefits(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               source_0: Uint8Array,
               amount_0: bigint,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  claim(context: __compactRuntime.CircuitContext<PS>,
        path_0: { leaf: Uint8Array,
                  path: { sibling: { field: bigint }, goes_left: boolean }[]
                },
        leaf_0: { commitment: Uint8Array,
                  payeeBinding: Uint8Array,
                  claimKeyHash: Uint8Array,
                  finalPeriod: bigint,
                  monthsWorked: bigint,
                  instance: Uint8Array
                },
        gross_0: bigint,
        tax_0: bigint,
        social_0: bigint,
        net_0: bigint,
        weeks_0: bigint,
        employer_0: { bytes: Uint8Array },
        payrollParamsHash_0: Uint8Array,
        nonce_0: Uint8Array,
        claimKey_0: Uint8Array,
        window_0: bigint,
        params_0: { version: bigint,
                    validFrom: bigint,
                    maxMonthlyGross: bigint,
                    rate: bigint,
                    minMonths: bigint
                  },
        taxParams_0: { version: bigint,
                       validFrom: bigint,
                       threshold1: bigint,
                       threshold2: bigint,
                       rate1: bigint,
                       rate2: bigint,
                       rate3: bigint,
                       maxContribBase: bigint,
                       contribRate: bigint
                     },
        benefitQ_0: bigint,
        benefitTaxQ_0: bigint,
        benefitSocialQ_0: bigint,
        coin_0: { nonce: Uint8Array,
                  color: Uint8Array,
                  value: bigint,
                  mt_index: bigint
                }): __compactRuntime.CircuitResults<PS, []>;
  remitBenefitTax(context: __compactRuntime.CircuitContext<PS>,
                  coin_0: { nonce: Uint8Array,
                            color: Uint8Array,
                            value: bigint,
                            mt_index: bigint
                          }): __compactRuntime.CircuitResults<PS, []>;
  remitBenefitSocial(context: __compactRuntime.CircuitContext<PS>,
                     coin_0: { nonce: Uint8Array,
                               color: Uint8Array,
                               value: bigint,
                               mt_index: bigint
                             }): __compactRuntime.CircuitResults<PS, []>;
  leafDigest(context: __compactRuntime.CircuitContext<PS>,
             leaf_0: { commitment: Uint8Array,
                       payeeBinding: Uint8Array,
                       claimKeyHash: Uint8Array,
                       finalPeriod: bigint,
                       monthsWorked: bigint,
                       instance: Uint8Array
                     }): __compactRuntime.CircuitResults<PS, Uint8Array>;
  treeLeaf(context: __compactRuntime.CircuitContext<PS>, digest_0: Uint8Array): __compactRuntime.CircuitResults<PS, bigint>;
  treeNode(context: __compactRuntime.CircuitContext<PS>,
           leftNode_0: bigint,
           rightNode_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  pathRoot(context: __compactRuntime.CircuitContext<PS>,
           path_0: { leaf: Uint8Array,
                     path: { sibling: { field: bigint }, goes_left: boolean }[]
                   }): __compactRuntime.CircuitResults<PS, bigint>;
  taxParamsHash(context: __compactRuntime.CircuitContext<PS>,
                params_0: { version: bigint,
                            validFrom: bigint,
                            threshold1: bigint,
                            threshold2: bigint,
                            rate1: bigint,
                            rate2: bigint,
                            rate3: bigint,
                            maxContribBase: bigint,
                            contribRate: bigint
                          }): __compactRuntime.CircuitResults<PS, Uint8Array>;
  claimKeyHash(context: __compactRuntime.CircuitContext<PS>,
               claimKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  claimNullifier(context: __compactRuntime.CircuitContext<PS>,
                 claimKey_0: Uint8Array,
                 window_0: bigint,
                 fund_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly platform: { bytes: Uint8Array };
  readonly taxTreasury: { bytes: Uint8Array };
  readonly socialTreasury: { bytes: Uint8Array };
  paramsFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  readonly latestVersion: bigint;
  rootFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  rootAuthor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { bytes: Uint8Array };
    [Symbol.iterator](): Iterator<[Uint8Array, { bytes: Uint8Array }]>
  };
  spent: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly claimsPaid: bigint;
  readonly taxPool: bigint;
  readonly socialPool: bigint;
  readonly taxRemitted: bigint;
  readonly socialRemitted: bigint;
  readonly benefitToken: Uint8Array;
  readonly benefitTokenSet: boolean;
  readonly coinsReceived: bigint;
  contributedFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  contributionSourceFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  readonly contributedTotal: bigint;
  readonly contributionCount: bigint;
  readonly poolOrdinal: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               taxTo_0: { bytes: Uint8Array },
               socialTo_0: { bytes: Uint8Array }): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
