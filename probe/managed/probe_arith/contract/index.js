import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(1152921504606846975n, 8);

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_3 = __compactRuntime.CompactTypeBoolean;

const _descriptor_4 = new __compactRuntime.CompactTypeBytes(32);

class _Either_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_3.fromValue(value_0),
      left: _descriptor_4.fromValue(value_0),
      right: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_left).concat(_descriptor_4.toValue(value_0.left).concat(_descriptor_4.toValue(value_0.right)));
  }
}

const _descriptor_5 = new _Either_0();

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_4.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.bytes);
  }
}

const _descriptor_7 = new _ContractAddress_0();

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      line: (...args_1) => {
        if (args_1.length !== 11) {
          throw new __compactRuntime.CompactError(`line: expected 11 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const gross_0 = args_1[1];
        const t1_0 = args_1[2];
        const t2_0 = args_1[3];
        const r1_0 = args_1[4];
        const r2_0 = args_1[5];
        const r3_0 = args_1[6];
        const maxBase_0 = args_1[7];
        const cr_0 = args_1[8];
        const taxQ_0 = args_1[9];
        const contribQ_0 = args_1[10];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('line',
                                     'argument 1 (as invoked from Typescript)',
                                     'probe_arith.compact line 13 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(gross_0) === 'bigint' && gross_0 >= 0n && gross_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('line',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'probe_arith.compact line 13 char 1',
                                     'Uint<0..1152921504606846976>',
                                     gross_0)
        }
        if (!(typeof(t1_0) === 'bigint' && t1_0 >= 0n && t1_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('line',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'probe_arith.compact line 13 char 1',
                                     'Uint<0..1152921504606846976>',
                                     t1_0)
        }
        if (!(typeof(t2_0) === 'bigint' && t2_0 >= 0n && t2_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('line',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'probe_arith.compact line 13 char 1',
                                     'Uint<0..1152921504606846976>',
                                     t2_0)
        }
        if (!(typeof(r1_0) === 'bigint' && r1_0 >= 0n && r1_0 <= 65535n)) {
          __compactRuntime.typeError('line',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'probe_arith.compact line 13 char 1',
                                     'Uint<0..65536>',
                                     r1_0)
        }
        if (!(typeof(r2_0) === 'bigint' && r2_0 >= 0n && r2_0 <= 65535n)) {
          __compactRuntime.typeError('line',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'probe_arith.compact line 13 char 1',
                                     'Uint<0..65536>',
                                     r2_0)
        }
        if (!(typeof(r3_0) === 'bigint' && r3_0 >= 0n && r3_0 <= 65535n)) {
          __compactRuntime.typeError('line',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'probe_arith.compact line 13 char 1',
                                     'Uint<0..65536>',
                                     r3_0)
        }
        if (!(typeof(maxBase_0) === 'bigint' && maxBase_0 >= 0n && maxBase_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('line',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'probe_arith.compact line 13 char 1',
                                     'Uint<0..1152921504606846976>',
                                     maxBase_0)
        }
        if (!(typeof(cr_0) === 'bigint' && cr_0 >= 0n && cr_0 <= 65535n)) {
          __compactRuntime.typeError('line',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'probe_arith.compact line 13 char 1',
                                     'Uint<0..65536>',
                                     cr_0)
        }
        if (!(typeof(taxQ_0) === 'bigint' && taxQ_0 >= 0n && taxQ_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('line',
                                     'argument 9 (argument 10 as invoked from Typescript)',
                                     'probe_arith.compact line 13 char 1',
                                     'Uint<0..1152921504606846976>',
                                     taxQ_0)
        }
        if (!(typeof(contribQ_0) === 'bigint' && contribQ_0 >= 0n && contribQ_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('line',
                                     'argument 10 (argument 11 as invoked from Typescript)',
                                     'probe_arith.compact line 13 char 1',
                                     'Uint<0..1152921504606846976>',
                                     contribQ_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(gross_0).concat(_descriptor_1.toValue(t1_0).concat(_descriptor_1.toValue(t2_0).concat(_descriptor_2.toValue(r1_0).concat(_descriptor_2.toValue(r2_0).concat(_descriptor_2.toValue(r3_0).concat(_descriptor_1.toValue(maxBase_0).concat(_descriptor_2.toValue(cr_0).concat(_descriptor_1.toValue(taxQ_0).concat(_descriptor_1.toValue(contribQ_0)))))))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment())))))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._line_0(context,
                                      partialProofData,
                                      gross_0,
                                      t1_0,
                                      t2_0,
                                      r1_0,
                                      r2_0,
                                      r3_0,
                                      maxBase_0,
                                      cr_0,
                                      taxQ_0,
                                      contribQ_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = { line: this.circuits.line };
    this.provableCircuits = { line: this.circuits.line };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('line', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(1n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(2n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _line_0(context,
          partialProofData,
          gross_0,
          t1_0,
          t2_0,
          r1_0,
          r2_0,
          r3_0,
          maxBase_0,
          cr_0,
          taxQ_0,
          contribQ_0)
  {
    const b1_0 = gross_0 < t1_0 ? gross_0 : t1_0;
    let t_0;
    const b2_0 = gross_0 <= t1_0 ?
                 0n :
                 (t_0 = gross_0 < t2_0 ? gross_0 : t2_0,
                  (__compactRuntime.assert(t_0 >= t1_0,
                                           'result of subtraction would be negative'),
                   t_0 - t1_0));
    const b3_0 = gross_0 <= t2_0 ?
                 0n :
                 (__compactRuntime.assert(gross_0 >= t2_0,
                                          'result of subtraction would be negative'),
                  gross_0 - t2_0);
    const taxN_0 = b1_0 * r1_0 + b2_0 * r2_0 + b3_0 * r3_0;
    let t_1;
    __compactRuntime.assert((t_1 = taxQ_0 * 10000n, t_1 <= taxN_0),
                            'tax quotient too small');
    __compactRuntime.assert(taxN_0 < (taxQ_0 + 1n) * 10000n,
                            'tax quotient too large');
    const base_0 = gross_0 < maxBase_0 ? gross_0 : maxBase_0;
    const contribN_0 = base_0 * cr_0;
    let t_2;
    __compactRuntime.assert((t_2 = contribQ_0 * 10000n, t_2 <= contribN_0),
                            'contribution quotient too small');
    __compactRuntime.assert(contribN_0 < (contribQ_0 + 1n) * 10000n,
                            'contribution quotient too large');
    let t_3;
    __compactRuntime.assert((t_3 = taxQ_0 + contribQ_0, t_3 <= gross_0),
                            'tax and contribution exceed gross');
    let t_4;
    const net_0 = (t_4 = (__compactRuntime.assert(gross_0 >= taxQ_0,
                                                  'result of subtraction would be negative'),
                          gross_0 - taxQ_0),
                   (__compactRuntime.assert(t_4 >= contribQ_0,
                                            'result of subtraction would be negative'),
                    t_4 - contribQ_0));
    const tmp_0 = taxQ_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = contribQ_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(1n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_2 = net_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(2n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get taxOut() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_8.toValue(0n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get contribOut() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_8.toValue(1n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get netOut() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_8.toValue(2n),
                                                                                                   alignment: _descriptor_8.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({ });
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
