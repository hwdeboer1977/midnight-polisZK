import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  assignEmployer(context: __compactRuntime.CircuitContext<PS>,
                 newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  transferEmployer(context: __compactRuntime.CircuitContext<PS>,
                   newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  setPayroll(context: __compactRuntime.CircuitContext<PS>,
             period_0: bigint,
             salaries_0: bigint[],
             nonces_0: Uint8Array[],
             sealedOpenings_0: Uint8Array[],
             payees_0: Uint8Array[]): __compactRuntime.CircuitResults<PS, []>;
  fundEmployee(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               index_0: bigint,
               salary_0: bigint,
               nonce_0: Uint8Array,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  payEmployee(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              index_0: bigint,
              salary_0: bigint,
              nonce_0: Uint8Array,
              coin_0: { nonce: Uint8Array,
                        color: Uint8Array,
                        value: bigint,
                        mt_index: bigint
                      },
              payee_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  payPeriod(context: __compactRuntime.CircuitContext<PS>,
            period_0: bigint,
            salaries_0: bigint[],
            nonces_0: Uint8Array[],
            coins_0: { nonce: Uint8Array,
                       color: Uint8Array,
                       value: bigint,
                       mt_index: bigint
                     }[],
            payees_0: { bytes: Uint8Array }[]): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  assignEmployer(context: __compactRuntime.CircuitContext<PS>,
                 newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  transferEmployer(context: __compactRuntime.CircuitContext<PS>,
                   newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  setPayroll(context: __compactRuntime.CircuitContext<PS>,
             period_0: bigint,
             salaries_0: bigint[],
             nonces_0: Uint8Array[],
             sealedOpenings_0: Uint8Array[],
             payees_0: Uint8Array[]): __compactRuntime.CircuitResults<PS, []>;
  fundEmployee(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               index_0: bigint,
               salary_0: bigint,
               nonce_0: Uint8Array,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  payEmployee(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              index_0: bigint,
              salary_0: bigint,
              nonce_0: Uint8Array,
              coin_0: { nonce: Uint8Array,
                        color: Uint8Array,
                        value: bigint,
                        mt_index: bigint
                      },
              payee_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  payPeriod(context: __compactRuntime.CircuitContext<PS>,
            period_0: bigint,
            salaries_0: bigint[],
            nonces_0: Uint8Array[],
            coins_0: { nonce: Uint8Array,
                       color: Uint8Array,
                       value: bigint,
                       mt_index: bigint
                     }[],
            payees_0: { bytes: Uint8Array }[]): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  payeeHash(payee_0: { bytes: Uint8Array }): Uint8Array;
  commitmentFor(amount_0: bigint, nonce_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  assignEmployer(context: __compactRuntime.CircuitContext<PS>,
                 newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  transferEmployer(context: __compactRuntime.CircuitContext<PS>,
                   newEmployer_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  setPayroll(context: __compactRuntime.CircuitContext<PS>,
             period_0: bigint,
             salaries_0: bigint[],
             nonces_0: Uint8Array[],
             sealedOpenings_0: Uint8Array[],
             payees_0: Uint8Array[]): __compactRuntime.CircuitResults<PS, []>;
  fundEmployee(context: __compactRuntime.CircuitContext<PS>,
               period_0: bigint,
               index_0: bigint,
               salary_0: bigint,
               nonce_0: Uint8Array,
               coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  payEmployee(context: __compactRuntime.CircuitContext<PS>,
              period_0: bigint,
              index_0: bigint,
              salary_0: bigint,
              nonce_0: Uint8Array,
              coin_0: { nonce: Uint8Array,
                        color: Uint8Array,
                        value: bigint,
                        mt_index: bigint
                      },
              payee_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  payPeriod(context: __compactRuntime.CircuitContext<PS>,
            period_0: bigint,
            salaries_0: bigint[],
            nonces_0: Uint8Array[],
            coins_0: { nonce: Uint8Array,
                       color: Uint8Array,
                       value: bigint,
                       mt_index: bigint
                     }[],
            payees_0: { bytes: Uint8Array }[]): __compactRuntime.CircuitResults<PS, []>;
  payeeHash(context: __compactRuntime.CircuitContext<PS>,
            payee_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, Uint8Array>;
  commitmentFor(context: __compactRuntime.CircuitContext<PS>,
                amount_0: bigint,
                nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly platform: { bytes: Uint8Array };
  readonly employer: { bytes: Uint8Array };
  readonly employerAssigned: boolean;
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
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
