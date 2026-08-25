import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  setVault(context: __compactRuntime.CircuitContext<PS>,
           target_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  sendToUser(context: __compactRuntime.CircuitContext<PS>,
             coin_0: { nonce: Uint8Array,
                       color: Uint8Array,
                       value: bigint,
                       mt_index: bigint
                     },
             to_0: { bytes: Uint8Array },
             amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  sendToContract(context: __compactRuntime.CircuitContext<PS>,
                 coin_0: { nonce: Uint8Array,
                           color: Uint8Array,
                           value: bigint,
                           mt_index: bigint
                         },
                 to_0: { bytes: Uint8Array },
                 amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  sendToStoredVault(context: __compactRuntime.CircuitContext<PS>,
                    coin_0: { nonce: Uint8Array,
                              color: Uint8Array,
                              value: bigint,
                              mt_index: bigint
                            },
                    amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  setVault(context: __compactRuntime.CircuitContext<PS>,
           target_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  sendToUser(context: __compactRuntime.CircuitContext<PS>,
             coin_0: { nonce: Uint8Array,
                       color: Uint8Array,
                       value: bigint,
                       mt_index: bigint
                     },
             to_0: { bytes: Uint8Array },
             amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  sendToContract(context: __compactRuntime.CircuitContext<PS>,
                 coin_0: { nonce: Uint8Array,
                           color: Uint8Array,
                           value: bigint,
                           mt_index: bigint
                         },
                 to_0: { bytes: Uint8Array },
                 amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  sendToStoredVault(context: __compactRuntime.CircuitContext<PS>,
                    coin_0: { nonce: Uint8Array,
                              color: Uint8Array,
                              value: bigint,
                              mt_index: bigint
                            },
                    amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  setVault(context: __compactRuntime.CircuitContext<PS>,
           target_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  sendToUser(context: __compactRuntime.CircuitContext<PS>,
             coin_0: { nonce: Uint8Array,
                       color: Uint8Array,
                       value: bigint,
                       mt_index: bigint
                     },
             to_0: { bytes: Uint8Array },
             amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  sendToContract(context: __compactRuntime.CircuitContext<PS>,
                 coin_0: { nonce: Uint8Array,
                           color: Uint8Array,
                           value: bigint,
                           mt_index: bigint
                         },
                 to_0: { bytes: Uint8Array },
                 amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  sendToStoredVault(context: __compactRuntime.CircuitContext<PS>,
                    coin_0: { nonce: Uint8Array,
                              color: Uint8Array,
                              value: bigint,
                              mt_index: bigint
                            },
                    amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly sentToUser: bigint;
  readonly sentToContract: bigint;
  readonly vault: { bytes: Uint8Array };
  readonly vaultSet: boolean;
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
