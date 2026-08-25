import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  publish(context: __compactRuntime.CircuitContext<PS>,
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
}

export type ProvableCircuits<PS> = {
  publish(context: __compactRuntime.CircuitContext<PS>,
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
}

export type PureCircuits = {
  paramsHash(params_0: { version: bigint,
                         validFrom: bigint,
                         threshold1: bigint,
                         threshold2: bigint,
                         rate1: bigint,
                         rate2: bigint,
                         rate3: bigint,
                         maxContribBase: bigint,
                         contribRate: bigint
                       }): Uint8Array;
}

export type Circuits<PS> = {
  publish(context: __compactRuntime.CircuitContext<PS>,
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
  paramsHash(context: __compactRuntime.CircuitContext<PS>,
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
}

export type Ledger = {
  readonly authority: { bytes: Uint8Array };
  paramsFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { version: bigint,
                             validFrom: bigint,
                             threshold1: bigint,
                             threshold2: bigint,
                             rate1: bigint,
                             rate2: bigint,
                             rate3: bigint,
                             maxContribBase: bigint,
                             contribRate: bigint
                           };
    [Symbol.iterator](): Iterator<[bigint, { version: bigint,
  validFrom: bigint,
  threshold1: bigint,
  threshold2: bigint,
  rate1: bigint,
  rate2: bigint,
  rate3: bigint,
  maxContribBase: bigint,
  contribRate: bigint
}]>
  };
  versions: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: bigint): boolean;
    [Symbol.iterator](): Iterator<bigint>
  };
  readonly latestVersion: bigint;
  readonly versionCount: bigint;
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
