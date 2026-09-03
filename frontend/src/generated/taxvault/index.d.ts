import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  deposit(context: __compactRuntime.CircuitContext<PS>,
          period_0: bigint,
          source_0: Uint8Array,
          amount_0: bigint,
          coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  transferAuthority(context: __compactRuntime.CircuitContext<PS>,
                    newAuthority_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>,
           amount_0: bigint,
           coin_0: { nonce: Uint8Array,
                     color: Uint8Array,
                     value: bigint,
                     mt_index: bigint
                   }): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  deposit(context: __compactRuntime.CircuitContext<PS>,
          period_0: bigint,
          source_0: Uint8Array,
          amount_0: bigint,
          coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  transferAuthority(context: __compactRuntime.CircuitContext<PS>,
                    newAuthority_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>,
           amount_0: bigint,
           coin_0: { nonce: Uint8Array,
                     color: Uint8Array,
                     value: bigint,
                     mt_index: bigint
                   }): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  deposit(context: __compactRuntime.CircuitContext<PS>,
          period_0: bigint,
          source_0: Uint8Array,
          amount_0: bigint,
          coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  transferAuthority(context: __compactRuntime.CircuitContext<PS>,
                    newAuthority_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>,
           amount_0: bigint,
           coin_0: { nonce: Uint8Array,
                     color: Uint8Array,
                     value: bigint,
                     mt_index: bigint
                   }): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly authority: { bytes: Uint8Array };
  readonly token: Uint8Array;
  receivedFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  sourceFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  readonly heldTotal: bigint;
  readonly receivedTotal: bigint;
  readonly withdrawnTotal: bigint;
  readonly depositCount: bigint;
  readonly withdrawalCount: bigint;
  readonly coinsReceived: bigint;
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
               withdrawTo_0: { bytes: Uint8Array },
               holds_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
