import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  line(context: __compactRuntime.CircuitContext<PS>,
       gross_0: bigint,
       t1_0: bigint,
       t2_0: bigint,
       r1_0: bigint,
       r2_0: bigint,
       r3_0: bigint,
       maxBase_0: bigint,
       cr_0: bigint,
       taxQ_0: bigint,
       contribQ_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  line(context: __compactRuntime.CircuitContext<PS>,
       gross_0: bigint,
       t1_0: bigint,
       t2_0: bigint,
       r1_0: bigint,
       r2_0: bigint,
       r3_0: bigint,
       maxBase_0: bigint,
       cr_0: bigint,
       taxQ_0: bigint,
       contribQ_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  line(context: __compactRuntime.CircuitContext<PS>,
       gross_0: bigint,
       t1_0: bigint,
       t2_0: bigint,
       r1_0: bigint,
       r2_0: bigint,
       r3_0: bigint,
       maxBase_0: bigint,
       cr_0: bigint,
       taxQ_0: bigint,
       contribQ_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly taxOut: bigint;
  readonly contribOut: bigint;
  readonly netOut: bigint;
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
