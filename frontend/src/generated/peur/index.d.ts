import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  mintTo(context: __compactRuntime.CircuitContext<PS>,
         amount_0: bigint,
         recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  mint(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  mintTo(context: __compactRuntime.CircuitContext<PS>,
         amount_0: bigint,
         recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  mint(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  mintTo(context: __compactRuntime.CircuitContext<PS>,
         amount_0: bigint,
         recipient_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  mint(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly issuer: { bytes: Uint8Array };
  readonly tokenId: Uint8Array;
  readonly totalSupply: bigint;
  readonly mintCounter: bigint;
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
