import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  setParamsFor(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  assignEmployer(context: __compactRuntime.CircuitContext<PS>,
                 newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  revoke(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  transferEmployer(context: __compactRuntime.CircuitContext<PS>,
                   newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  setPayroll(context: __compactRuntime.CircuitContext<PS>,
             period_0: bigint,
             gross_0: bigint[],
             weeks_0: bigint[],
             taxQ_0: bigint[],
             socialQ_0: bigint[],
             nonces_0: Uint8Array[],
             sealedOpenings_0: Uint8Array[],
             payees_0: Uint8Array[],
             params_0: { version: bigint,
                         validFrom: bigint,
                         threshold1: bigint,
                         threshold2: bigint,
                         rate1: bigint,
                         rate2: bigint,
                         rate3: bigint,
                         maxContribBase: bigint,
                         contribRate: bigint
                       }): __compactRuntime.CircuitResults<PS, []>;
  fundEmployee(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               index_0: bigint,
               gross_0: bigint,
               tax_0: bigint,
               social_0: bigint,
               net_0: bigint,
               weeks_0: bigint,
               nonce_0: Uint8Array,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  payEmployee(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              index_0: bigint,
              gross_0: bigint,
              tax_0: bigint,
              social_0: bigint,
              net_0: bigint,
              weeks_0: bigint,
              nonce_0: Uint8Array,
              coin_0: { nonce: Uint8Array,
                        color: Uint8Array,
                        value: bigint,
                        mt_index: bigint
                      },
              payee_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  endEmployment(context: __compactRuntime.CircuitContext<PS>,
                period_0: bigint,
                index_0: bigint,
                attestation_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  fundWithholding(context: __compactRuntime.CircuitContext<PS>,
                  period_0: bigint,
                  taxCoin_0: { nonce: Uint8Array,
                               color: Uint8Array,
                               value: bigint
                             },
                  socialCoin_0: { nonce: Uint8Array,
                                  color: Uint8Array,
                                  value: bigint
                                }): __compactRuntime.CircuitResults<PS, []>;
  remitTax(context: __compactRuntime.CircuitContext<PS>,
           period_0: bigint,
           coin_0: { nonce: Uint8Array,
                     color: Uint8Array,
                     value: bigint,
                     mt_index: bigint
                   }): __compactRuntime.CircuitResults<PS, []>;
  remitSocial(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              coin_0: { nonce: Uint8Array,
                        color: Uint8Array,
                        value: bigint,
                        mt_index: bigint
                      }): __compactRuntime.CircuitResults<PS, []>;
  payPeriod(context: __compactRuntime.CircuitContext<PS>,
            period_0: bigint,
            gross_0: bigint[],
            tax_0: bigint[],
            social_0: bigint[],
            net_0: bigint[],
            weeks_0: bigint[],
            nonces_0: Uint8Array[],
            coins_0: { nonce: Uint8Array,
                       color: Uint8Array,
                       value: bigint,
                       mt_index: bigint
                     }[],
            payees_0: { bytes: Uint8Array }[]): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  setParamsFor(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  assignEmployer(context: __compactRuntime.CircuitContext<PS>,
                 newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  revoke(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  transferEmployer(context: __compactRuntime.CircuitContext<PS>,
                   newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  setPayroll(context: __compactRuntime.CircuitContext<PS>,
             period_0: bigint,
             gross_0: bigint[],
             weeks_0: bigint[],
             taxQ_0: bigint[],
             socialQ_0: bigint[],
             nonces_0: Uint8Array[],
             sealedOpenings_0: Uint8Array[],
             payees_0: Uint8Array[],
             params_0: { version: bigint,
                         validFrom: bigint,
                         threshold1: bigint,
                         threshold2: bigint,
                         rate1: bigint,
                         rate2: bigint,
                         rate3: bigint,
                         maxContribBase: bigint,
                         contribRate: bigint
                       }): __compactRuntime.CircuitResults<PS, []>;
  fundEmployee(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               index_0: bigint,
               gross_0: bigint,
               tax_0: bigint,
               social_0: bigint,
               net_0: bigint,
               weeks_0: bigint,
               nonce_0: Uint8Array,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  payEmployee(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              index_0: bigint,
              gross_0: bigint,
              tax_0: bigint,
              social_0: bigint,
              net_0: bigint,
              weeks_0: bigint,
              nonce_0: Uint8Array,
              coin_0: { nonce: Uint8Array,
                        color: Uint8Array,
                        value: bigint,
                        mt_index: bigint
                      },
              payee_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  endEmployment(context: __compactRuntime.CircuitContext<PS>,
                period_0: bigint,
                index_0: bigint,
                attestation_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  fundWithholding(context: __compactRuntime.CircuitContext<PS>,
                  period_0: bigint,
                  taxCoin_0: { nonce: Uint8Array,
                               color: Uint8Array,
                               value: bigint
                             },
                  socialCoin_0: { nonce: Uint8Array,
                                  color: Uint8Array,
                                  value: bigint
                                }): __compactRuntime.CircuitResults<PS, []>;
  remitTax(context: __compactRuntime.CircuitContext<PS>,
           period_0: bigint,
           coin_0: { nonce: Uint8Array,
                     color: Uint8Array,
                     value: bigint,
                     mt_index: bigint
                   }): __compactRuntime.CircuitResults<PS, []>;
  remitSocial(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              coin_0: { nonce: Uint8Array,
                        color: Uint8Array,
                        value: bigint,
                        mt_index: bigint
                      }): __compactRuntime.CircuitResults<PS, []>;
  payPeriod(context: __compactRuntime.CircuitContext<PS>,
            period_0: bigint,
            gross_0: bigint[],
            tax_0: bigint[],
            social_0: bigint[],
            net_0: bigint[],
            weeks_0: bigint[],
            nonces_0: Uint8Array[],
            coins_0: { nonce: Uint8Array,
                       color: Uint8Array,
                       value: bigint,
                       mt_index: bigint
                     }[],
            payees_0: { bytes: Uint8Array }[]): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  bandsFor(gross_0: bigint, threshold1_0: bigint, threshold2_0: bigint): bigint[];
  terminationCommitment(finalPeriod_0: bigint,
                        monthsWorked_0: bigint,
                        claimKeyHash_0: Uint8Array,
                        nonce_0: Uint8Array): Uint8Array;
  payeeHash(payee_0: { bytes: Uint8Array },
            period_0: bigint,
            instance_0: Uint8Array): Uint8Array;
  commitmentFor(gross_0: bigint,
                tax_0: bigint,
                social_0: bigint,
                net_0: bigint,
                weeks_0: bigint,
                period_0: bigint,
                employer_0: { bytes: Uint8Array },
                paramsHash_0: Uint8Array,
                nonce_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  setParamsFor(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               hash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  assignEmployer(context: __compactRuntime.CircuitContext<PS>,
                 newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  revoke(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  transferEmployer(context: __compactRuntime.CircuitContext<PS>,
                   newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  setPayroll(context: __compactRuntime.CircuitContext<PS>,
             period_0: bigint,
             gross_0: bigint[],
             weeks_0: bigint[],
             taxQ_0: bigint[],
             socialQ_0: bigint[],
             nonces_0: Uint8Array[],
             sealedOpenings_0: Uint8Array[],
             payees_0: Uint8Array[],
             params_0: { version: bigint,
                         validFrom: bigint,
                         threshold1: bigint,
                         threshold2: bigint,
                         rate1: bigint,
                         rate2: bigint,
                         rate3: bigint,
                         maxContribBase: bigint,
                         contribRate: bigint
                       }): __compactRuntime.CircuitResults<PS, []>;
  fundEmployee(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               index_0: bigint,
               gross_0: bigint,
               tax_0: bigint,
               social_0: bigint,
               net_0: bigint,
               weeks_0: bigint,
               nonce_0: Uint8Array,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  payEmployee(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              index_0: bigint,
              gross_0: bigint,
              tax_0: bigint,
              social_0: bigint,
              net_0: bigint,
              weeks_0: bigint,
              nonce_0: Uint8Array,
              coin_0: { nonce: Uint8Array,
                        color: Uint8Array,
                        value: bigint,
                        mt_index: bigint
                      },
              payee_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  endEmployment(context: __compactRuntime.CircuitContext<PS>,
                period_0: bigint,
                index_0: bigint,
                attestation_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  fundWithholding(context: __compactRuntime.CircuitContext<PS>,
                  period_0: bigint,
                  taxCoin_0: { nonce: Uint8Array,
                               color: Uint8Array,
                               value: bigint
                             },
                  socialCoin_0: { nonce: Uint8Array,
                                  color: Uint8Array,
                                  value: bigint
                                }): __compactRuntime.CircuitResults<PS, []>;
  remitTax(context: __compactRuntime.CircuitContext<PS>,
           period_0: bigint,
           coin_0: { nonce: Uint8Array,
                     color: Uint8Array,
                     value: bigint,
                     mt_index: bigint
                   }): __compactRuntime.CircuitResults<PS, []>;
  remitSocial(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              coin_0: { nonce: Uint8Array,
                        color: Uint8Array,
                        value: bigint,
                        mt_index: bigint
                      }): __compactRuntime.CircuitResults<PS, []>;
  payPeriod(context: __compactRuntime.CircuitContext<PS>,
            period_0: bigint,
            gross_0: bigint[],
            tax_0: bigint[],
            social_0: bigint[],
            net_0: bigint[],
            weeks_0: bigint[],
            nonces_0: Uint8Array[],
            coins_0: { nonce: Uint8Array,
                       color: Uint8Array,
                       value: bigint,
                       mt_index: bigint
                     }[],
            payees_0: { bytes: Uint8Array }[]): __compactRuntime.CircuitResults<PS, []>;
  bandsFor(context: __compactRuntime.CircuitContext<PS>,
           gross_0: bigint,
           threshold1_0: bigint,
           threshold2_0: bigint): __compactRuntime.CircuitResults<PS, bigint[]>;
  terminationCommitment(context: __compactRuntime.CircuitContext<PS>,
                        finalPeriod_0: bigint,
                        monthsWorked_0: bigint,
                        claimKeyHash_0: Uint8Array,
                        nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  payeeHash(context: __compactRuntime.CircuitContext<PS>,
            payee_0: { bytes: Uint8Array },
            period_0: bigint,
            instance_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  commitmentFor(context: __compactRuntime.CircuitContext<PS>,
                gross_0: bigint,
                tax_0: bigint,
                social_0: bigint,
                net_0: bigint,
                weeks_0: bigint,
                period_0: bigint,
                employer_0: { bytes: Uint8Array },
                paramsHash_0: Uint8Array,
                nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly platform: { bytes: Uint8Array };
  readonly taxTreasury: { bytes: Uint8Array };
  readonly socialTreasury: { bytes: Uint8Array };
  readonly employer: { bytes: Uint8Array };
  readonly employerAssigned: boolean;
  readonly revoked: boolean;
  periods: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: bigint): boolean;
    [Symbol.iterator](): Iterator<bigint>
  };
  readonly latestPeriod: bigint;
  employeeCountFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  totalPayrollFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  totalTaxFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  totalSocialFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  totalNetFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  paramsHashFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  commitmentsFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): {
      isEmpty(): boolean;
      size(): bigint;
      member(key_1: bigint): boolean;
      lookup(key_1: bigint): Uint8Array;
      [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
    }
  };
  sealedFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): {
      isEmpty(): boolean;
      size(): bigint;
      member(key_1: bigint): boolean;
      lookup(key_1: bigint): Uint8Array;
      [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
    }
  };
  payeeFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): {
      isEmpty(): boolean;
      size(): bigint;
      member(key_1: bigint): boolean;
      lookup(key_1: bigint): Uint8Array;
      [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
    }
  };
  fundedFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): {
      isEmpty(): boolean;
      size(): bigint;
      member(key_1: bigint): boolean;
      lookup(key_1: bigint): boolean;
      [Symbol.iterator](): Iterator<[bigint, boolean]>
    }
  };
  paidFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): {
      isEmpty(): boolean;
      size(): bigint;
      member(key_1: bigint): boolean;
      lookup(key_1: bigint): boolean;
      [Symbol.iterator](): Iterator<[bigint, boolean]>
    }
  };
  terminationFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): {
      isEmpty(): boolean;
      size(): bigint;
      member(key_1: bigint): boolean;
      lookup(key_1: bigint): Uint8Array;
      [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
    }
  };
  fileRoundFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  readonly coinsReceived: bigint;
  coinOrdinalFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): {
      isEmpty(): boolean;
      size(): bigint;
      member(key_1: bigint): boolean;
      lookup(key_1: bigint): bigint;
      [Symbol.iterator](): Iterator<[bigint, bigint]>
    }
  };
  readonly payToken: Uint8Array;
  readonly payTokenSet: boolean;
  readonly taxPool: bigint;
  readonly socialPool: bigint;
  readonly taxRemitted: bigint;
  readonly socialRemitted: bigint;
  withheldFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): boolean;
    [Symbol.iterator](): Iterator<[bigint, boolean]>
  };
  taxCoinFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  socialCoinFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
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
