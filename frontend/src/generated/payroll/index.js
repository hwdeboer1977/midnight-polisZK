import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_1 = new _ZswapCoinPublicKey_0();

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(1152921504606846975n, 8);

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_5 = new __compactRuntime.CompactTypeVector(3, _descriptor_3);

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_7 = __compactRuntime.CompactTypeBoolean;

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_9 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _QualifiedShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_9.alignment().concat(_descriptor_8.alignment())));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_0.fromValue(value_0),
      color: _descriptor_0.fromValue(value_0),
      value: _descriptor_9.fromValue(value_0),
      mt_index: _descriptor_8.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.nonce).concat(_descriptor_0.toValue(value_0.color).concat(_descriptor_9.toValue(value_0.value).concat(_descriptor_8.toValue(value_0.mt_index))));
  }
}

const _descriptor_10 = new _QualifiedShieldedCoinInfo_0();

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_11 = new _ContractAddress_0();

const _descriptor_12 = new __compactRuntime.CompactTypeVector(2, _descriptor_3);

const _descriptor_13 = new __compactRuntime.CompactTypeVector(2, _descriptor_4);

const _descriptor_14 = new __compactRuntime.CompactTypeVector(2, _descriptor_0);

const _descriptor_15 = new __compactRuntime.CompactTypeVector(2, _descriptor_10);

const _descriptor_16 = new __compactRuntime.CompactTypeVector(2, _descriptor_1);

class _ShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_9.alignment()));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_0.fromValue(value_0),
      color: _descriptor_0.fromValue(value_0),
      value: _descriptor_9.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.nonce).concat(_descriptor_0.toValue(value_0.color).concat(_descriptor_9.toValue(value_0.value)));
  }
}

const _descriptor_17 = new _ShieldedCoinInfo_0();

const _descriptor_18 = new __compactRuntime.CompactTypeVector(2, _descriptor_17);

const _descriptor_19 = new __compactRuntime.CompactTypeBytes(100);

const _descriptor_20 = new __compactRuntime.CompactTypeVector(2, _descriptor_19);

class _TaxParams_0 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_6.alignment().concat(_descriptor_6.alignment().concat(_descriptor_6.alignment().concat(_descriptor_3.alignment().concat(_descriptor_6.alignment()))))))));
  }
  fromValue(value_0) {
    return {
      version: _descriptor_6.fromValue(value_0),
      validFrom: _descriptor_2.fromValue(value_0),
      threshold1: _descriptor_3.fromValue(value_0),
      threshold2: _descriptor_3.fromValue(value_0),
      rate1: _descriptor_6.fromValue(value_0),
      rate2: _descriptor_6.fromValue(value_0),
      rate3: _descriptor_6.fromValue(value_0),
      maxContribBase: _descriptor_3.fromValue(value_0),
      contribRate: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.version).concat(_descriptor_2.toValue(value_0.validFrom).concat(_descriptor_3.toValue(value_0.threshold1).concat(_descriptor_3.toValue(value_0.threshold2).concat(_descriptor_6.toValue(value_0.rate1).concat(_descriptor_6.toValue(value_0.rate2).concat(_descriptor_6.toValue(value_0.rate3).concat(_descriptor_3.toValue(value_0.maxContribBase).concat(_descriptor_6.toValue(value_0.contribRate)))))))));
  }
}

const _descriptor_21 = new _TaxParams_0();

class _Either_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_1.alignment().concat(_descriptor_11.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_7.fromValue(value_0),
      left: _descriptor_1.fromValue(value_0),
      right: _descriptor_11.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_left).concat(_descriptor_1.toValue(value_0.left).concat(_descriptor_11.toValue(value_0.right)));
  }
}

const _descriptor_22 = new _Either_0();

const _descriptor_23 = __compactRuntime.CompactTypeField;

class _PayrollCommitment_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))))))));
  }
  fromValue(value_0) {
    return {
      gross: _descriptor_3.fromValue(value_0),
      tax: _descriptor_3.fromValue(value_0),
      social: _descriptor_3.fromValue(value_0),
      net: _descriptor_3.fromValue(value_0),
      weeks: _descriptor_4.fromValue(value_0),
      period: _descriptor_2.fromValue(value_0),
      employer: _descriptor_1.fromValue(value_0),
      paramsHash: _descriptor_0.fromValue(value_0),
      nonce: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.gross).concat(_descriptor_3.toValue(value_0.tax).concat(_descriptor_3.toValue(value_0.social).concat(_descriptor_3.toValue(value_0.net).concat(_descriptor_4.toValue(value_0.weeks).concat(_descriptor_2.toValue(value_0.period).concat(_descriptor_1.toValue(value_0.employer).concat(_descriptor_0.toValue(value_0.paramsHash).concat(_descriptor_0.toValue(value_0.nonce)))))))));
  }
}

const _descriptor_24 = new _PayrollCommitment_0();

class _Termination_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_6.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      finalPeriod: _descriptor_2.fromValue(value_0),
      monthsWorked: _descriptor_6.fromValue(value_0),
      nonce: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.finalPeriod).concat(_descriptor_6.toValue(value_0.monthsWorked).concat(_descriptor_0.toValue(value_0.nonce)));
  }
}

const _descriptor_25 = new _Termination_0();

class _PayeeBinding_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      payee: _descriptor_1.fromValue(value_0),
      period: _descriptor_2.fromValue(value_0),
      instance: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.payee).concat(_descriptor_2.toValue(value_0.period).concat(_descriptor_0.toValue(value_0.instance)));
  }
}

const _descriptor_26 = new _PayeeBinding_0();

const _descriptor_27 = new __compactRuntime.CompactTypeBytes(21);

class _CoinPreimage_0 {
  alignment() {
    return _descriptor_27.alignment().concat(_descriptor_17.alignment().concat(_descriptor_7.alignment().concat(_descriptor_0.alignment())));
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_27.fromValue(value_0),
      info: _descriptor_17.fromValue(value_0),
      dataType: _descriptor_7.fromValue(value_0),
      data: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_27.toValue(value_0.domain_sep).concat(_descriptor_17.toValue(value_0.info).concat(_descriptor_7.toValue(value_0.dataType).concat(_descriptor_0.toValue(value_0.data))));
  }
}

const _descriptor_28 = new _CoinPreimage_0();

const _descriptor_29 = new __compactRuntime.CompactTypeVector(2, _descriptor_23);

class _Maybe_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_17.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_7.fromValue(value_0),
      value: _descriptor_17.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_some).concat(_descriptor_17.toValue(value_0.value));
  }
}

const _descriptor_30 = new _Maybe_0();

class _ShieldedSendResult_0 {
  alignment() {
    return _descriptor_30.alignment().concat(_descriptor_17.alignment());
  }
  fromValue(value_0) {
    return {
      change: _descriptor_30.fromValue(value_0),
      sent: _descriptor_17.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_30.toValue(value_0.change).concat(_descriptor_17.toValue(value_0.sent));
  }
}

const _descriptor_31 = new _ShieldedSendResult_0();

class _Either_1 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_7.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_32 = new _Either_1();

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
      setParamsFor: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`setParamsFor: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const period_0 = args_1[1];
        const hash_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('setParamsFor',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 402 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
          __compactRuntime.typeError('setParamsFor',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'payroll.compact line 402 char 1',
                                     'Uint<0..4294967296>',
                                     period_0)
        }
        if (!(hash_0.buffer instanceof ArrayBuffer && hash_0.BYTES_PER_ELEMENT === 1 && hash_0.length === 32)) {
          __compactRuntime.typeError('setParamsFor',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'payroll.compact line 402 char 1',
                                     'Bytes<32>',
                                     hash_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(period_0).concat(_descriptor_0.toValue(hash_0)),
            alignment: _descriptor_2.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._setParamsFor_0(context,
                                              partialProofData,
                                              period_0,
                                              hash_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      assignEmployer: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`assignEmployer: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const newEmployer_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('assignEmployer',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 440 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(newEmployer_0) === 'object' && newEmployer_0.bytes.buffer instanceof ArrayBuffer && newEmployer_0.bytes.BYTES_PER_ELEMENT === 1 && newEmployer_0.bytes.length === 32)) {
          __compactRuntime.typeError('assignEmployer',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'payroll.compact line 440 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     newEmployer_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(newEmployer_0),
            alignment: _descriptor_1.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._assignEmployer_0(context,
                                                partialProofData,
                                                newEmployer_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      revokeEmployer: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`revokeEmployer: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('revokeEmployer',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 505 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._revokeEmployer_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      transferSeat: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`transferSeat: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const isPlatform_0 = args_1[1];
        const newHolder_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('transferSeat',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 555 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(isPlatform_0) === 'boolean')) {
          __compactRuntime.typeError('transferSeat',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'payroll.compact line 555 char 1',
                                     'Boolean',
                                     isPlatform_0)
        }
        if (!(typeof(newHolder_0) === 'object' && newHolder_0.bytes.buffer instanceof ArrayBuffer && newHolder_0.bytes.BYTES_PER_ELEMENT === 1 && newHolder_0.bytes.length === 32)) {
          __compactRuntime.typeError('transferSeat',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'payroll.compact line 555 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     newHolder_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_7.toValue(isPlatform_0).concat(_descriptor_1.toValue(newHolder_0)),
            alignment: _descriptor_7.alignment().concat(_descriptor_1.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._transferSeat_0(context,
                                              partialProofData,
                                              isPlatform_0,
                                              newHolder_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      setPayroll: (...args_1) => {
        if (args_1.length !== 10) {
          throw new __compactRuntime.CompactError(`setPayroll: expected 10 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const period_0 = args_1[1];
        const gross_0 = args_1[2];
        const weeks_0 = args_1[3];
        const taxQ_0 = args_1[4];
        const socialQ_0 = args_1[5];
        const nonces_0 = args_1[6];
        const sealedOpenings_0 = args_1[7];
        const payees_0 = args_1[8];
        const params_0 = args_1[9];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('setPayroll',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 583 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
          __compactRuntime.typeError('setPayroll',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'payroll.compact line 583 char 1',
                                     'Uint<0..4294967296>',
                                     period_0)
        }
        if (!(Array.isArray(gross_0) && gross_0.length === 2 && gross_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 1152921504606846975n))) {
          __compactRuntime.typeError('setPayroll',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'payroll.compact line 583 char 1',
                                     'Vector<2, Uint<0..1152921504606846976>>',
                                     gross_0)
        }
        if (!(Array.isArray(weeks_0) && weeks_0.length === 2 && weeks_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
          __compactRuntime.typeError('setPayroll',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'payroll.compact line 583 char 1',
                                     'Vector<2, Uint<0..256>>',
                                     weeks_0)
        }
        if (!(Array.isArray(taxQ_0) && taxQ_0.length === 2 && taxQ_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 1152921504606846975n))) {
          __compactRuntime.typeError('setPayroll',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'payroll.compact line 583 char 1',
                                     'Vector<2, Uint<0..1152921504606846976>>',
                                     taxQ_0)
        }
        if (!(Array.isArray(socialQ_0) && socialQ_0.length === 2 && socialQ_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 1152921504606846975n))) {
          __compactRuntime.typeError('setPayroll',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'payroll.compact line 583 char 1',
                                     'Vector<2, Uint<0..1152921504606846976>>',
                                     socialQ_0)
        }
        if (!(Array.isArray(nonces_0) && nonces_0.length === 2 && nonces_0.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 32))) {
          __compactRuntime.typeError('setPayroll',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'payroll.compact line 583 char 1',
                                     'Vector<2, Bytes<32>>',
                                     nonces_0)
        }
        if (!(Array.isArray(sealedOpenings_0) && sealedOpenings_0.length === 2 && sealedOpenings_0.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 100))) {
          __compactRuntime.typeError('setPayroll',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'payroll.compact line 583 char 1',
                                     'Vector<2, Bytes<100>>',
                                     sealedOpenings_0)
        }
        if (!(Array.isArray(payees_0) && payees_0.length === 2 && payees_0.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 32))) {
          __compactRuntime.typeError('setPayroll',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'payroll.compact line 583 char 1',
                                     'Vector<2, Bytes<32>>',
                                     payees_0)
        }
        if (!(typeof(params_0) === 'object' && typeof(params_0.version) === 'bigint' && params_0.version >= 0n && params_0.version <= 65535n && typeof(params_0.validFrom) === 'bigint' && params_0.validFrom >= 0n && params_0.validFrom <= 4294967295n && typeof(params_0.threshold1) === 'bigint' && params_0.threshold1 >= 0n && params_0.threshold1 <= 1152921504606846975n && typeof(params_0.threshold2) === 'bigint' && params_0.threshold2 >= 0n && params_0.threshold2 <= 1152921504606846975n && typeof(params_0.rate1) === 'bigint' && params_0.rate1 >= 0n && params_0.rate1 <= 65535n && typeof(params_0.rate2) === 'bigint' && params_0.rate2 >= 0n && params_0.rate2 <= 65535n && typeof(params_0.rate3) === 'bigint' && params_0.rate3 >= 0n && params_0.rate3 <= 65535n && typeof(params_0.maxContribBase) === 'bigint' && params_0.maxContribBase >= 0n && params_0.maxContribBase <= 1152921504606846975n && typeof(params_0.contribRate) === 'bigint' && params_0.contribRate >= 0n && params_0.contribRate <= 65535n)) {
          __compactRuntime.typeError('setPayroll',
                                     'argument 9 (argument 10 as invoked from Typescript)',
                                     'payroll.compact line 583 char 1',
                                     'struct TaxParams<version: Uint<0..65536>, validFrom: Uint<0..4294967296>, threshold1: Uint<0..1152921504606846976>, threshold2: Uint<0..1152921504606846976>, rate1: Uint<0..65536>, rate2: Uint<0..65536>, rate3: Uint<0..65536>, maxContribBase: Uint<0..1152921504606846976>, contribRate: Uint<0..65536>>',
                                     params_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(period_0).concat(_descriptor_12.toValue(gross_0).concat(_descriptor_13.toValue(weeks_0).concat(_descriptor_12.toValue(taxQ_0).concat(_descriptor_12.toValue(socialQ_0).concat(_descriptor_14.toValue(nonces_0).concat(_descriptor_20.toValue(sealedOpenings_0).concat(_descriptor_14.toValue(payees_0).concat(_descriptor_21.toValue(params_0))))))))),
            alignment: _descriptor_2.alignment().concat(_descriptor_12.alignment().concat(_descriptor_13.alignment().concat(_descriptor_12.alignment().concat(_descriptor_12.alignment().concat(_descriptor_14.alignment().concat(_descriptor_20.alignment().concat(_descriptor_14.alignment().concat(_descriptor_21.alignment()))))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._setPayroll_0(context,
                                            partialProofData,
                                            period_0,
                                            gross_0,
                                            weeks_0,
                                            taxQ_0,
                                            socialQ_0,
                                            nonces_0,
                                            sealedOpenings_0,
                                            payees_0,
                                            params_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      fundEmployee: (...args_1) => {
        if (args_1.length !== 10) {
          throw new __compactRuntime.CompactError(`fundEmployee: expected 10 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const period_0 = args_1[1];
        const index_0 = args_1[2];
        const gross_0 = args_1[3];
        const tax_0 = args_1[4];
        const social_0 = args_1[5];
        const net_0 = args_1[6];
        const weeks_0 = args_1[7];
        const nonce_0 = args_1[8];
        const coin_0 = args_1[9];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('fundEmployee',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 831 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
          __compactRuntime.typeError('fundEmployee',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'payroll.compact line 831 char 1',
                                     'Uint<0..4294967296>',
                                     period_0)
        }
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0n && index_0 <= 255n)) {
          __compactRuntime.typeError('fundEmployee',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'payroll.compact line 831 char 1',
                                     'Uint<0..256>',
                                     index_0)
        }
        if (!(typeof(gross_0) === 'bigint' && gross_0 >= 0n && gross_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('fundEmployee',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'payroll.compact line 831 char 1',
                                     'Uint<0..1152921504606846976>',
                                     gross_0)
        }
        if (!(typeof(tax_0) === 'bigint' && tax_0 >= 0n && tax_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('fundEmployee',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'payroll.compact line 831 char 1',
                                     'Uint<0..1152921504606846976>',
                                     tax_0)
        }
        if (!(typeof(social_0) === 'bigint' && social_0 >= 0n && social_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('fundEmployee',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'payroll.compact line 831 char 1',
                                     'Uint<0..1152921504606846976>',
                                     social_0)
        }
        if (!(typeof(net_0) === 'bigint' && net_0 >= 0n && net_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('fundEmployee',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'payroll.compact line 831 char 1',
                                     'Uint<0..1152921504606846976>',
                                     net_0)
        }
        if (!(typeof(weeks_0) === 'bigint' && weeks_0 >= 0n && weeks_0 <= 255n)) {
          __compactRuntime.typeError('fundEmployee',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'payroll.compact line 831 char 1',
                                     'Uint<0..256>',
                                     weeks_0)
        }
        if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
          __compactRuntime.typeError('fundEmployee',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'payroll.compact line 831 char 1',
                                     'Bytes<32>',
                                     nonce_0)
        }
        if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('fundEmployee',
                                     'argument 9 (argument 10 as invoked from Typescript)',
                                     'payroll.compact line 831 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     coin_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(period_0).concat(_descriptor_4.toValue(index_0).concat(_descriptor_3.toValue(gross_0).concat(_descriptor_3.toValue(tax_0).concat(_descriptor_3.toValue(social_0).concat(_descriptor_3.toValue(net_0).concat(_descriptor_4.toValue(weeks_0).concat(_descriptor_0.toValue(nonce_0).concat(_descriptor_17.toValue(coin_0))))))))),
            alignment: _descriptor_2.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_17.alignment()))))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._fundEmployee_0(context,
                                              partialProofData,
                                              period_0,
                                              index_0,
                                              gross_0,
                                              tax_0,
                                              social_0,
                                              net_0,
                                              weeks_0,
                                              nonce_0,
                                              coin_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      fundPeriod: (...args_1) => {
        if (args_1.length !== 11) {
          throw new __compactRuntime.CompactError(`fundPeriod: expected 11 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const period_0 = args_1[1];
        const gross_0 = args_1[2];
        const tax_0 = args_1[3];
        const social_0 = args_1[4];
        const net_0 = args_1[5];
        const weeks_0 = args_1[6];
        const nonces_0 = args_1[7];
        const netCoins_0 = args_1[8];
        const taxCoin_0 = args_1[9];
        const socialCoin_0 = args_1[10];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('fundPeriod',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 914 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
          __compactRuntime.typeError('fundPeriod',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'payroll.compact line 914 char 1',
                                     'Uint<0..4294967296>',
                                     period_0)
        }
        if (!(Array.isArray(gross_0) && gross_0.length === 2 && gross_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 1152921504606846975n))) {
          __compactRuntime.typeError('fundPeriod',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'payroll.compact line 914 char 1',
                                     'Vector<2, Uint<0..1152921504606846976>>',
                                     gross_0)
        }
        if (!(Array.isArray(tax_0) && tax_0.length === 2 && tax_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 1152921504606846975n))) {
          __compactRuntime.typeError('fundPeriod',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'payroll.compact line 914 char 1',
                                     'Vector<2, Uint<0..1152921504606846976>>',
                                     tax_0)
        }
        if (!(Array.isArray(social_0) && social_0.length === 2 && social_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 1152921504606846975n))) {
          __compactRuntime.typeError('fundPeriod',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'payroll.compact line 914 char 1',
                                     'Vector<2, Uint<0..1152921504606846976>>',
                                     social_0)
        }
        if (!(Array.isArray(net_0) && net_0.length === 2 && net_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 1152921504606846975n))) {
          __compactRuntime.typeError('fundPeriod',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'payroll.compact line 914 char 1',
                                     'Vector<2, Uint<0..1152921504606846976>>',
                                     net_0)
        }
        if (!(Array.isArray(weeks_0) && weeks_0.length === 2 && weeks_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
          __compactRuntime.typeError('fundPeriod',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'payroll.compact line 914 char 1',
                                     'Vector<2, Uint<0..256>>',
                                     weeks_0)
        }
        if (!(Array.isArray(nonces_0) && nonces_0.length === 2 && nonces_0.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 32))) {
          __compactRuntime.typeError('fundPeriod',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'payroll.compact line 914 char 1',
                                     'Vector<2, Bytes<32>>',
                                     nonces_0)
        }
        if (!(Array.isArray(netCoins_0) && netCoins_0.length === 2 && netCoins_0.every((t) => typeof(t) === 'object' && t.nonce.buffer instanceof ArrayBuffer && t.nonce.BYTES_PER_ELEMENT === 1 && t.nonce.length === 32 && t.color.buffer instanceof ArrayBuffer && t.color.BYTES_PER_ELEMENT === 1 && t.color.length === 32 && typeof(t.value) === 'bigint' && t.value >= 0n && t.value <= 340282366920938463463374607431768211455n))) {
          __compactRuntime.typeError('fundPeriod',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'payroll.compact line 914 char 1',
                                     'Vector<2, struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>>',
                                     netCoins_0)
        }
        if (!(typeof(taxCoin_0) === 'object' && taxCoin_0.nonce.buffer instanceof ArrayBuffer && taxCoin_0.nonce.BYTES_PER_ELEMENT === 1 && taxCoin_0.nonce.length === 32 && taxCoin_0.color.buffer instanceof ArrayBuffer && taxCoin_0.color.BYTES_PER_ELEMENT === 1 && taxCoin_0.color.length === 32 && typeof(taxCoin_0.value) === 'bigint' && taxCoin_0.value >= 0n && taxCoin_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('fundPeriod',
                                     'argument 9 (argument 10 as invoked from Typescript)',
                                     'payroll.compact line 914 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     taxCoin_0)
        }
        if (!(typeof(socialCoin_0) === 'object' && socialCoin_0.nonce.buffer instanceof ArrayBuffer && socialCoin_0.nonce.BYTES_PER_ELEMENT === 1 && socialCoin_0.nonce.length === 32 && socialCoin_0.color.buffer instanceof ArrayBuffer && socialCoin_0.color.BYTES_PER_ELEMENT === 1 && socialCoin_0.color.length === 32 && typeof(socialCoin_0.value) === 'bigint' && socialCoin_0.value >= 0n && socialCoin_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('fundPeriod',
                                     'argument 10 (argument 11 as invoked from Typescript)',
                                     'payroll.compact line 914 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     socialCoin_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(period_0).concat(_descriptor_12.toValue(gross_0).concat(_descriptor_12.toValue(tax_0).concat(_descriptor_12.toValue(social_0).concat(_descriptor_12.toValue(net_0).concat(_descriptor_13.toValue(weeks_0).concat(_descriptor_14.toValue(nonces_0).concat(_descriptor_18.toValue(netCoins_0).concat(_descriptor_17.toValue(taxCoin_0).concat(_descriptor_17.toValue(socialCoin_0)))))))))),
            alignment: _descriptor_2.alignment().concat(_descriptor_12.alignment().concat(_descriptor_12.alignment().concat(_descriptor_12.alignment().concat(_descriptor_12.alignment().concat(_descriptor_13.alignment().concat(_descriptor_14.alignment().concat(_descriptor_18.alignment().concat(_descriptor_17.alignment().concat(_descriptor_17.alignment())))))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._fundPeriod_0(context,
                                            partialProofData,
                                            period_0,
                                            gross_0,
                                            tax_0,
                                            social_0,
                                            net_0,
                                            weeks_0,
                                            nonces_0,
                                            netCoins_0,
                                            taxCoin_0,
                                            socialCoin_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      payEmployee: (...args_1) => {
        if (args_1.length !== 11) {
          throw new __compactRuntime.CompactError(`payEmployee: expected 11 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const period_0 = args_1[1];
        const index_0 = args_1[2];
        const gross_0 = args_1[3];
        const tax_0 = args_1[4];
        const social_0 = args_1[5];
        const net_0 = args_1[6];
        const weeks_0 = args_1[7];
        const nonce_0 = args_1[8];
        const coin_0 = args_1[9];
        const payee_0 = args_1[10];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('payEmployee',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 1015 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
          __compactRuntime.typeError('payEmployee',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'payroll.compact line 1015 char 1',
                                     'Uint<0..4294967296>',
                                     period_0)
        }
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0n && index_0 <= 255n)) {
          __compactRuntime.typeError('payEmployee',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'payroll.compact line 1015 char 1',
                                     'Uint<0..256>',
                                     index_0)
        }
        if (!(typeof(gross_0) === 'bigint' && gross_0 >= 0n && gross_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('payEmployee',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'payroll.compact line 1015 char 1',
                                     'Uint<0..1152921504606846976>',
                                     gross_0)
        }
        if (!(typeof(tax_0) === 'bigint' && tax_0 >= 0n && tax_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('payEmployee',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'payroll.compact line 1015 char 1',
                                     'Uint<0..1152921504606846976>',
                                     tax_0)
        }
        if (!(typeof(social_0) === 'bigint' && social_0 >= 0n && social_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('payEmployee',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'payroll.compact line 1015 char 1',
                                     'Uint<0..1152921504606846976>',
                                     social_0)
        }
        if (!(typeof(net_0) === 'bigint' && net_0 >= 0n && net_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('payEmployee',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'payroll.compact line 1015 char 1',
                                     'Uint<0..1152921504606846976>',
                                     net_0)
        }
        if (!(typeof(weeks_0) === 'bigint' && weeks_0 >= 0n && weeks_0 <= 255n)) {
          __compactRuntime.typeError('payEmployee',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'payroll.compact line 1015 char 1',
                                     'Uint<0..256>',
                                     weeks_0)
        }
        if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
          __compactRuntime.typeError('payEmployee',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'payroll.compact line 1015 char 1',
                                     'Bytes<32>',
                                     nonce_0)
        }
        if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n && typeof(coin_0.mt_index) === 'bigint' && coin_0.mt_index >= 0n && coin_0.mt_index <= 18446744073709551615n)) {
          __compactRuntime.typeError('payEmployee',
                                     'argument 9 (argument 10 as invoked from Typescript)',
                                     'payroll.compact line 1015 char 1',
                                     'struct QualifiedShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>, mt_index: Uint<0..18446744073709551616>>',
                                     coin_0)
        }
        if (!(typeof(payee_0) === 'object' && payee_0.bytes.buffer instanceof ArrayBuffer && payee_0.bytes.BYTES_PER_ELEMENT === 1 && payee_0.bytes.length === 32)) {
          __compactRuntime.typeError('payEmployee',
                                     'argument 10 (argument 11 as invoked from Typescript)',
                                     'payroll.compact line 1015 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     payee_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(period_0).concat(_descriptor_4.toValue(index_0).concat(_descriptor_3.toValue(gross_0).concat(_descriptor_3.toValue(tax_0).concat(_descriptor_3.toValue(social_0).concat(_descriptor_3.toValue(net_0).concat(_descriptor_4.toValue(weeks_0).concat(_descriptor_0.toValue(nonce_0).concat(_descriptor_10.toValue(coin_0).concat(_descriptor_1.toValue(payee_0)))))))))),
            alignment: _descriptor_2.alignment().concat(_descriptor_4.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_10.alignment().concat(_descriptor_1.alignment())))))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._payEmployee_0(context,
                                             partialProofData,
                                             period_0,
                                             index_0,
                                             gross_0,
                                             tax_0,
                                             social_0,
                                             net_0,
                                             weeks_0,
                                             nonce_0,
                                             coin_0,
                                             payee_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      endEmployment: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`endEmployment: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const period_0 = args_1[1];
        const index_0 = args_1[2];
        const attestation_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('endEmployment',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 1097 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
          __compactRuntime.typeError('endEmployment',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'payroll.compact line 1097 char 1',
                                     'Uint<0..4294967296>',
                                     period_0)
        }
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0n && index_0 <= 255n)) {
          __compactRuntime.typeError('endEmployment',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'payroll.compact line 1097 char 1',
                                     'Uint<0..256>',
                                     index_0)
        }
        if (!(attestation_0.buffer instanceof ArrayBuffer && attestation_0.BYTES_PER_ELEMENT === 1 && attestation_0.length === 32)) {
          __compactRuntime.typeError('endEmployment',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'payroll.compact line 1097 char 1',
                                     'Bytes<32>',
                                     attestation_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(period_0).concat(_descriptor_4.toValue(index_0).concat(_descriptor_0.toValue(attestation_0))),
            alignment: _descriptor_2.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._endEmployment_0(context,
                                               partialProofData,
                                               period_0,
                                               index_0,
                                               attestation_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      fundWithholding: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`fundWithholding: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const period_0 = args_1[1];
        const taxCoin_0 = args_1[2];
        const socialCoin_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('fundWithholding',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 1133 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
          __compactRuntime.typeError('fundWithholding',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'payroll.compact line 1133 char 1',
                                     'Uint<0..4294967296>',
                                     period_0)
        }
        if (!(typeof(taxCoin_0) === 'object' && taxCoin_0.nonce.buffer instanceof ArrayBuffer && taxCoin_0.nonce.BYTES_PER_ELEMENT === 1 && taxCoin_0.nonce.length === 32 && taxCoin_0.color.buffer instanceof ArrayBuffer && taxCoin_0.color.BYTES_PER_ELEMENT === 1 && taxCoin_0.color.length === 32 && typeof(taxCoin_0.value) === 'bigint' && taxCoin_0.value >= 0n && taxCoin_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('fundWithholding',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'payroll.compact line 1133 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     taxCoin_0)
        }
        if (!(typeof(socialCoin_0) === 'object' && socialCoin_0.nonce.buffer instanceof ArrayBuffer && socialCoin_0.nonce.BYTES_PER_ELEMENT === 1 && socialCoin_0.nonce.length === 32 && socialCoin_0.color.buffer instanceof ArrayBuffer && socialCoin_0.color.BYTES_PER_ELEMENT === 1 && socialCoin_0.color.length === 32 && typeof(socialCoin_0.value) === 'bigint' && socialCoin_0.value >= 0n && socialCoin_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('fundWithholding',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'payroll.compact line 1133 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     socialCoin_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(period_0).concat(_descriptor_17.toValue(taxCoin_0).concat(_descriptor_17.toValue(socialCoin_0))),
            alignment: _descriptor_2.alignment().concat(_descriptor_17.alignment().concat(_descriptor_17.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._fundWithholding_0(context,
                                                 partialProofData,
                                                 period_0,
                                                 taxCoin_0,
                                                 socialCoin_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      remit: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`remit: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const period_0 = args_1[1];
        const isTax_0 = args_1[2];
        const treasury_0 = args_1[3];
        const coin_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('remit',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 1230 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
          __compactRuntime.typeError('remit',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'payroll.compact line 1230 char 1',
                                     'Uint<0..4294967296>',
                                     period_0)
        }
        if (!(typeof(isTax_0) === 'boolean')) {
          __compactRuntime.typeError('remit',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'payroll.compact line 1230 char 1',
                                     'Boolean',
                                     isTax_0)
        }
        if (!(typeof(treasury_0) === 'object' && treasury_0.bytes.buffer instanceof ArrayBuffer && treasury_0.bytes.BYTES_PER_ELEMENT === 1 && treasury_0.bytes.length === 32)) {
          __compactRuntime.typeError('remit',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'payroll.compact line 1230 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     treasury_0)
        }
        if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n && typeof(coin_0.mt_index) === 'bigint' && coin_0.mt_index >= 0n && coin_0.mt_index <= 18446744073709551615n)) {
          __compactRuntime.typeError('remit',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'payroll.compact line 1230 char 1',
                                     'struct QualifiedShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>, mt_index: Uint<0..18446744073709551616>>',
                                     coin_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(period_0).concat(_descriptor_7.toValue(isTax_0).concat(_descriptor_1.toValue(treasury_0).concat(_descriptor_10.toValue(coin_0)))),
            alignment: _descriptor_2.alignment().concat(_descriptor_7.alignment().concat(_descriptor_1.alignment().concat(_descriptor_10.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._remit_0(context,
                                       partialProofData,
                                       period_0,
                                       isTax_0,
                                       treasury_0,
                                       coin_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      payPeriod: (...args_1) => {
        if (args_1.length !== 10) {
          throw new __compactRuntime.CompactError(`payPeriod: expected 10 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const period_0 = args_1[1];
        const gross_0 = args_1[2];
        const tax_0 = args_1[3];
        const social_0 = args_1[4];
        const net_0 = args_1[5];
        const weeks_0 = args_1[6];
        const nonces_0 = args_1[7];
        const coins_0 = args_1[8];
        const payees_0 = args_1[9];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('payPeriod',
                                     'argument 1 (as invoked from Typescript)',
                                     'payroll.compact line 1296 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
          __compactRuntime.typeError('payPeriod',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'payroll.compact line 1296 char 1',
                                     'Uint<0..4294967296>',
                                     period_0)
        }
        if (!(Array.isArray(gross_0) && gross_0.length === 2 && gross_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 1152921504606846975n))) {
          __compactRuntime.typeError('payPeriod',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'payroll.compact line 1296 char 1',
                                     'Vector<2, Uint<0..1152921504606846976>>',
                                     gross_0)
        }
        if (!(Array.isArray(tax_0) && tax_0.length === 2 && tax_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 1152921504606846975n))) {
          __compactRuntime.typeError('payPeriod',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'payroll.compact line 1296 char 1',
                                     'Vector<2, Uint<0..1152921504606846976>>',
                                     tax_0)
        }
        if (!(Array.isArray(social_0) && social_0.length === 2 && social_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 1152921504606846975n))) {
          __compactRuntime.typeError('payPeriod',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'payroll.compact line 1296 char 1',
                                     'Vector<2, Uint<0..1152921504606846976>>',
                                     social_0)
        }
        if (!(Array.isArray(net_0) && net_0.length === 2 && net_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 1152921504606846975n))) {
          __compactRuntime.typeError('payPeriod',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'payroll.compact line 1296 char 1',
                                     'Vector<2, Uint<0..1152921504606846976>>',
                                     net_0)
        }
        if (!(Array.isArray(weeks_0) && weeks_0.length === 2 && weeks_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 255n))) {
          __compactRuntime.typeError('payPeriod',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'payroll.compact line 1296 char 1',
                                     'Vector<2, Uint<0..256>>',
                                     weeks_0)
        }
        if (!(Array.isArray(nonces_0) && nonces_0.length === 2 && nonces_0.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 32))) {
          __compactRuntime.typeError('payPeriod',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'payroll.compact line 1296 char 1',
                                     'Vector<2, Bytes<32>>',
                                     nonces_0)
        }
        if (!(Array.isArray(coins_0) && coins_0.length === 2 && coins_0.every((t) => typeof(t) === 'object' && t.nonce.buffer instanceof ArrayBuffer && t.nonce.BYTES_PER_ELEMENT === 1 && t.nonce.length === 32 && t.color.buffer instanceof ArrayBuffer && t.color.BYTES_PER_ELEMENT === 1 && t.color.length === 32 && typeof(t.value) === 'bigint' && t.value >= 0n && t.value <= 340282366920938463463374607431768211455n && typeof(t.mt_index) === 'bigint' && t.mt_index >= 0n && t.mt_index <= 18446744073709551615n))) {
          __compactRuntime.typeError('payPeriod',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'payroll.compact line 1296 char 1',
                                     'Vector<2, struct QualifiedShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>, mt_index: Uint<0..18446744073709551616>>>',
                                     coins_0)
        }
        if (!(Array.isArray(payees_0) && payees_0.length === 2 && payees_0.every((t) => typeof(t) === 'object' && t.bytes.buffer instanceof ArrayBuffer && t.bytes.BYTES_PER_ELEMENT === 1 && t.bytes.length === 32))) {
          __compactRuntime.typeError('payPeriod',
                                     'argument 9 (argument 10 as invoked from Typescript)',
                                     'payroll.compact line 1296 char 1',
                                     'Vector<2, struct ZswapCoinPublicKey<bytes: Bytes<32>>>',
                                     payees_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(period_0).concat(_descriptor_12.toValue(gross_0).concat(_descriptor_12.toValue(tax_0).concat(_descriptor_12.toValue(social_0).concat(_descriptor_12.toValue(net_0).concat(_descriptor_13.toValue(weeks_0).concat(_descriptor_14.toValue(nonces_0).concat(_descriptor_15.toValue(coins_0).concat(_descriptor_16.toValue(payees_0))))))))),
            alignment: _descriptor_2.alignment().concat(_descriptor_12.alignment().concat(_descriptor_12.alignment().concat(_descriptor_12.alignment().concat(_descriptor_12.alignment().concat(_descriptor_13.alignment().concat(_descriptor_14.alignment().concat(_descriptor_15.alignment().concat(_descriptor_16.alignment()))))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._payPeriod_0(context,
                                           partialProofData,
                                           period_0,
                                           gross_0,
                                           tax_0,
                                           social_0,
                                           net_0,
                                           weeks_0,
                                           nonces_0,
                                           coins_0,
                                           payees_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      bandsFor(context, ...args_1) {
        return { result: pureCircuits.bandsFor(...args_1), context };
      },
      terminationCommitment(context, ...args_1) {
        return { result: pureCircuits.terminationCommitment(...args_1), context };
      },
      payeeHash(context, ...args_1) {
        return { result: pureCircuits.payeeHash(...args_1), context };
      },
      commitmentFor(context, ...args_1) {
        return { result: pureCircuits.commitmentFor(...args_1), context };
      }
    };
    this.impureCircuits = {
      setParamsFor: this.circuits.setParamsFor,
      assignEmployer: this.circuits.assignEmployer,
      revokeEmployer: this.circuits.revokeEmployer,
      transferSeat: this.circuits.transferSeat,
      setPayroll: this.circuits.setPayroll,
      fundEmployee: this.circuits.fundEmployee,
      fundPeriod: this.circuits.fundPeriod,
      payEmployee: this.circuits.payEmployee,
      endEmployment: this.circuits.endEmployment,
      fundWithholding: this.circuits.fundWithholding,
      remit: this.circuits.remit,
      payPeriod: this.circuits.payPeriod
    };
    this.provableCircuits = {
      setParamsFor: this.circuits.setParamsFor,
      assignEmployer: this.circuits.assignEmployer,
      revokeEmployer: this.circuits.revokeEmployer,
      transferSeat: this.circuits.transferSeat,
      setPayroll: this.circuits.setPayroll,
      fundEmployee: this.circuits.fundEmployee,
      fundPeriod: this.circuits.fundPeriod,
      payEmployee: this.circuits.payEmployee,
      endEmployment: this.circuits.endEmployment,
      fundWithholding: this.circuits.fundWithholding,
      remit: this.circuits.remit,
      payPeriod: this.circuits.payPeriod
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const taxTo_0 = args_0[1];
    const socialTo_0 = args_0[2];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(typeof(taxTo_0) === 'object' && taxTo_0.bytes.buffer instanceof ArrayBuffer && taxTo_0.bytes.BYTES_PER_ELEMENT === 1 && taxTo_0.bytes.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'payroll.compact line 381 char 1',
                                 'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                 taxTo_0)
    }
    if (!(typeof(socialTo_0) === 'object' && socialTo_0.bytes.buffer instanceof ArrayBuffer && socialTo_0.bytes.BYTES_PER_ELEMENT === 1 && socialTo_0.bytes.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'payroll.compact line 381 char 1',
                                 'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                 socialTo_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    let stateValue_3 = __compactRuntime.StateValue.newArray();
    stateValue_3 = stateValue_3.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_3 = stateValue_3.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_3 = stateValue_3.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_3 = stateValue_3.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(stateValue_3);
    let stateValue_2 = __compactRuntime.StateValue.newArray();
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_2 = stateValue_2.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(stateValue_2);
    let stateValue_1 = __compactRuntime.StateValue.newArray();
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_1 = stateValue_1.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(stateValue_1);
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('setParamsFor', new __compactRuntime.ContractOperation());
    state_0.setOperation('assignEmployer', new __compactRuntime.ContractOperation());
    state_0.setOperation('revokeEmployer', new __compactRuntime.ContractOperation());
    state_0.setOperation('transferSeat', new __compactRuntime.ContractOperation());
    state_0.setOperation('setPayroll', new __compactRuntime.ContractOperation());
    state_0.setOperation('fundEmployee', new __compactRuntime.ContractOperation());
    state_0.setOperation('fundPeriod', new __compactRuntime.ContractOperation());
    state_0.setOperation('payEmployee', new __compactRuntime.ContractOperation());
    state_0.setOperation('endEmployment', new __compactRuntime.ContractOperation());
    state_0.setOperation('fundWithholding', new __compactRuntime.ContractOperation());
    state_0.setOperation('remit', new __compactRuntime.ContractOperation());
    state_0.setOperation('payPeriod', new __compactRuntime.ContractOperation());
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
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue({ bytes: new Uint8Array(32) }),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(1n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue({ bytes: new Uint8Array(32) }),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(2n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue({ bytes: new Uint8Array(32) }),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(3n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue({ bytes: new Uint8Array(32) }),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(false),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(1n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue({ bytes: new Uint8Array(32) }),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(2n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(false),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(3n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(5n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(6n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(7n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(8n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(9n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(10n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(11n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(12n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(13n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(14n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(1n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(2n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(3n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(5n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(6n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(7n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(false),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(8n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(9n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(10n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(11n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(12n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(13n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(14n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = this._ownPublicKey_0(context, partialProofData);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(false),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(2n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(false),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_1 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_1),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(7n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(false),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_2 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_2),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(1n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(taxTo_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(2n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(socialTo_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_3 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(8n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_3),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_4 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(9n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_4),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_5 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(10n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_5),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_6 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(11n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_6),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _some_0(value_0) { return { is_some: true, value: value_0 }; }
  _none_0() {
    return { is_some: false,
             value:
               { nonce: new Uint8Array(32), color: new Uint8Array(32), value: 0n } };
  }
  _left_0(value_0) {
    return { is_left: true, left: value_0, right: { bytes: new Uint8Array(32) } };
  }
  _right_0(value_0) {
    return { is_left: false, left: { bytes: new Uint8Array(32) }, right: value_0 };
  }
  _receiveShielded_0(context, partialProofData, coin_0) {
    const recipient_0 = this._right_0(_descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                 partialProofData,
                                                                                                 [
                                                                                                  { dup: { n: 2 } },
                                                                                                  { idx: { cached: true,
                                                                                                           pushPath: false,
                                                                                                           path: [
                                                                                                                  { tag: 'value',
                                                                                                                    value: { value: _descriptor_4.toValue(0n),
                                                                                                                             alignment: _descriptor_4.alignment() } }] } },
                                                                                                  { popeq: { cached: true,
                                                                                                             result: undefined } }]).value));
    this._createZswapOutput_0(context, partialProofData, coin_0, recipient_0);
    const tmp_0 = this._coinCommitment_0(coin_0, recipient_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    return [];
  }
  _sendShielded_0(context, partialProofData, input_0, recipient_0, value_0) {
    const selfAddr_0 = _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                  partialProofData,
                                                                                  [
                                                                                   { dup: { n: 2 } },
                                                                                   { idx: { cached: true,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_4.toValue(0n),
                                                                                                              alignment: _descriptor_4.alignment() } }] } },
                                                                                   { popeq: { cached: true,
                                                                                              result: undefined } }]).value);
    this._createZswapInput_0(context, partialProofData, input_0);
    const tmp_0 = this._coinNullifier_0(this._downcastQualifiedCoin_0(input_0),
                                        selfAddr_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    let t_0;
    const change_0 = (t_0 = input_0.value,
                      (__compactRuntime.assert(t_0 >= value_0,
                                               'result of subtraction would be negative'),
                       t_0 - value_0));
    const output_0 = { nonce:
                         this._upgradeFromTransient_0(this._transientHash_0([__compactRuntime.convertBytesToField(28,
                                                                                                                  new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 107, 101, 114, 110, 101, 108, 58, 110, 111, 110, 99, 101, 95, 101, 118, 111, 108, 118, 101]),
                                                                                                                  '<standard library>'),
                                                                             this._degradeToTransient_0(input_0.nonce)])),
                       color: input_0.color,
                       value: value_0 };
    this._createZswapOutput_0(context, partialProofData, output_0, recipient_0);
    const tmp_1 = this._coinCommitment_0(output_0, recipient_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (!recipient_0.is_left
        &&
        this._equal_0(recipient_0.right.bytes, selfAddr_0.bytes))
    {
      const tmp_2 = this._coinCommitment_0(output_0, recipient_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(1n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    if (this._equal_1(change_0, 0n)) {
      return { change: this._none_0(), sent: output_0 };
    } else {
      const changeCoin_0 = { nonce:
                               this._upgradeFromTransient_0(this._transientHash_0([__compactRuntime.convertBytesToField(30,
                                                                                                                        new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 107, 101, 114, 110, 101, 108, 58, 110, 111, 110, 99, 101, 95, 101, 118, 111, 108, 118, 101, 47, 50]),
                                                                                                                        '<standard library>'),
                                                                                   this._degradeToTransient_0(input_0.nonce)])),
                             color: input_0.color,
                             value: change_0 };
      this._createZswapOutput_0(context,
                                partialProofData,
                                changeCoin_0,
                                this._right_0(selfAddr_0));
      const cm_0 = this._coinCommitment_0(changeCoin_0,
                                          this._right_0(selfAddr_0));
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cm_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(1n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cm_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
      return { change: this._some_0(changeCoin_0), sent: output_0 };
    }
  }
  _downcastQualifiedCoin_0(coin_0) {
    return { nonce: coin_0.nonce, color: coin_0.color, value: coin_0.value };
  }
  _coinCommitment_0(coin_0, recipient_0) {
    return this._persistentHash_1({ domain_sep:
                                      new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 122, 115, 119, 97, 112, 45, 99, 99, 91, 118, 49, 93]),
                                    info: coin_0,
                                    dataType: recipient_0.is_left,
                                    data:
                                      recipient_0.is_left ?
                                      recipient_0.left.bytes :
                                      recipient_0.right.bytes });
  }
  _coinNullifier_0(coin_0, addr_0) {
    return this._persistentHash_1({ domain_sep:
                                      new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 122, 115, 119, 97, 112, 45, 99, 110, 91, 118, 49, 93]),
                                    info: coin_0,
                                    dataType: false,
                                    data: addr_0.bytes });
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_29, value_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_21, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_28, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_25, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_26, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_24, value_0);
    return result_0;
  }
  _degradeToTransient_0(x_0) {
    const result_0 = __compactRuntime.degradeToTransient(x_0);
    return result_0;
  }
  _upgradeFromTransient_0(x_0) {
    const result_0 = __compactRuntime.upgradeFromTransient(x_0);
    return result_0;
  }
  _ownPublicKey_0(context, partialProofData) {
    const result_0 = __compactRuntime.ownPublicKey(context);
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_1.toValue(result_0),
      alignment: _descriptor_1.alignment()
    });
    return result_0;
  }
  _createZswapInput_0(context, partialProofData, coin_0) {
    const result_0 = __compactRuntime.createZswapInput(context, coin_0);
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _createZswapOutput_0(context, partialProofData, coin_0, recipient_0) {
    const result_0 = __compactRuntime.createZswapOutput(context,
                                                        coin_0,
                                                        recipient_0);
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _setParamsFor_0(context, partialProofData, period_0, hash_0) {
    __compactRuntime.assert(this._equal_2(this._ownPublicKey_0(context,
                                                               partialProofData),
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(0n),
                                                                                                                                alignment: _descriptor_4.alignment() } },
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(0n),
                                                                                                                                alignment: _descriptor_4.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'only the platform may set the rule set');
    const p_0 = period_0;
    __compactRuntime.assert(p_0 >= 200001n, 'period must be YYYYMM, e.g. 202603');
    __compactRuntime.assert(p_0 <= 299912n, 'period must be YYYYMM, e.g. 202603');
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(10n),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'that period already has a rule set');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(10n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(hash_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    return [];
  }
  _assignEmployer_0(context, partialProofData, newEmployer_0) {
    __compactRuntime.assert(this._equal_3(this._ownPublicKey_0(context,
                                                               partialProofData),
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(0n),
                                                                                                                                alignment: _descriptor_4.alignment() } },
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(0n),
                                                                                                                                alignment: _descriptor_4.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'only the platform may assign the employer');
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(0n),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'employer already assigned');
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value)
                            ||
                            this._equal_4(newEmployer_0,
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(1n),
                                                                                                                                alignment: _descriptor_4.alignment() } },
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(1n),
                                                                                                                                alignment: _descriptor_4.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'this contract belongs to another employer');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(3n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(newEmployer_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(1n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(newEmployer_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(2n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _revokeEmployer_0(context, partialProofData) {
    __compactRuntime.assert(this._equal_5(this._ownPublicKey_0(context,
                                                               partialProofData),
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(0n),
                                                                                                                                alignment: _descriptor_4.alignment() } },
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(0n),
                                                                                                                                alignment: _descriptor_4.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'only the platform may revoke the employer');
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(0n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'no employer assigned yet');
    const tmp_0 = { bytes: new Uint8Array(32) };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(3n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(false),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _transferSeat_0(context, partialProofData, isPlatform_0, newHolder_0) {
    const pf_0 = isPlatform_0;
    __compactRuntime.assert(pf_0
                            ||
                            _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(0n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'no employer assigned yet');
    const holder_0 = pf_0 ?
                     _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(0n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(0n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     :
                     _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(0n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(3n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value);
    __compactRuntime.assert(this._equal_6(this._ownPublicKey_0(context,
                                                               partialProofData),
                                          holder_0),
                            'only the holder of that seat may transfer it');
    const k_0 = newHolder_0;
    if (pf_0) {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(0n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(0n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(k_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    } else {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(0n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(3n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(k_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(1n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(1n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(k_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    return [];
  }
  _setPayroll_0(context,
                partialProofData,
                period_0,
                gross_0,
                weeks_0,
                taxQ_0,
                socialQ_0,
                nonces_0,
                sealedOpenings_0,
                payees_0,
                params_0)
  {
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(0n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'no employer assigned yet');
    __compactRuntime.assert(this._equal_7(this._ownPublicKey_0(context,
                                                               partialProofData),
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(0n),
                                                                                                                                alignment: _descriptor_4.alignment() } },
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(3n),
                                                                                                                                alignment: _descriptor_4.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'only the employer may set payroll');
    const p_0 = period_0;
    __compactRuntime.assert(p_0 >= 200001n, 'period must be YYYYMM, e.g. 202603');
    __compactRuntime.assert(p_0 <= 299912n, 'period must be YYYYMM, e.g. 202603');
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(10n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no rule set recorded for that period');
    __compactRuntime.assert(this._equal_8(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(1n),
                                                                                                                                alignment: _descriptor_4.alignment() } },
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(10n),
                                                                                                                                alignment: _descriptor_4.alignment() } }] } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                alignment: _descriptor_2.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          this._persistentHash_0(params_0)),
                            'these are not the rules recorded for that period');
    let t_0;
    __compactRuntime.assert((t_0 = params_0.validFrom, t_0 <= p_0),
                            'that rule set does not apply yet');
    const t1_0 = params_0.threshold1;
    const t2_0 = params_0.threshold2;
    const maxBase_0 = params_0.maxContribBase;
    const g0_0 = gross_0[0];
    const a1_0 = g0_0 < t1_0 ? g0_0 : t1_0;
    let t_1;
    const a2_0 = g0_0 <= t1_0 ?
                 0n :
                 (t_1 = g0_0 < t2_0 ? g0_0 : t2_0,
                  (__compactRuntime.assert(t_1 >= t1_0,
                                           'result of subtraction would be negative'),
                   t_1 - t1_0));
    const a3_0 = g0_0 <= t2_0 ?
                 0n :
                 (__compactRuntime.assert(g0_0 >= t2_0,
                                          'result of subtraction would be negative'),
                  g0_0 - t2_0);
    const taxN0_0 = a1_0 * params_0.rate1 + a2_0 * params_0.rate2
                    +
                    a3_0 * params_0.rate3;
    let t_2;
    __compactRuntime.assert((t_2 = taxQ_0[0] * 10000n, t_2 <= taxN0_0),
                            'tax quotient too small');
    __compactRuntime.assert(taxN0_0 < (taxQ_0[0] + 1n) * 10000n,
                            'tax quotient too large');
    const base0_0 = g0_0 < maxBase_0 ? g0_0 : maxBase_0;
    const socN0_0 = base0_0 * params_0.contribRate;
    let t_3;
    __compactRuntime.assert((t_3 = socialQ_0[0] * 10000n, t_3 <= socN0_0),
                            'contribution quotient too small');
    __compactRuntime.assert(socN0_0 < (socialQ_0[0] + 1n) * 10000n,
                            'contribution quotient too large');
    let t_4;
    __compactRuntime.assert((t_4 = taxQ_0[0] + socialQ_0[0], t_4 <= g0_0),
                            'tax and contribution exceed gross');
    let t_6, t_7, t_5;
    const net0_0 = (t_6 = (t_5 = taxQ_0[0],
                           (__compactRuntime.assert(g0_0 >= t_5,
                                                    'result of subtraction would be negative'),
                            g0_0 - t_5)),
                    (t_7 = socialQ_0[0],
                     (__compactRuntime.assert(t_6 >= t_7,
                                              'result of subtraction would be negative'),
                      t_6 - t_7)));
    const g1_0 = gross_0[1];
    const c1_0 = g1_0 < t1_0 ? g1_0 : t1_0;
    let t_8;
    const c2_0 = g1_0 <= t1_0 ?
                 0n :
                 (t_8 = g1_0 < t2_0 ? g1_0 : t2_0,
                  (__compactRuntime.assert(t_8 >= t1_0,
                                           'result of subtraction would be negative'),
                   t_8 - t1_0));
    const c3_0 = g1_0 <= t2_0 ?
                 0n :
                 (__compactRuntime.assert(g1_0 >= t2_0,
                                          'result of subtraction would be negative'),
                  g1_0 - t2_0);
    const taxN1_0 = c1_0 * params_0.rate1 + c2_0 * params_0.rate2
                    +
                    c3_0 * params_0.rate3;
    let t_9;
    __compactRuntime.assert((t_9 = taxQ_0[1] * 10000n, t_9 <= taxN1_0),
                            'tax quotient too small');
    __compactRuntime.assert(taxN1_0 < (taxQ_0[1] + 1n) * 10000n,
                            'tax quotient too large');
    const base1_0 = g1_0 < maxBase_0 ? g1_0 : maxBase_0;
    const socN1_0 = base1_0 * params_0.contribRate;
    let t_10;
    __compactRuntime.assert((t_10 = socialQ_0[1] * 10000n, t_10 <= socN1_0),
                            'contribution quotient too small');
    __compactRuntime.assert(socN1_0 < (socialQ_0[1] + 1n) * 10000n,
                            'contribution quotient too large');
    let t_11;
    __compactRuntime.assert((t_11 = taxQ_0[1] + socialQ_0[1], t_11 <= g1_0),
                            'tax and contribution exceed gross');
    let t_13, t_14, t_12;
    const net1_0 = (t_13 = (t_12 = taxQ_0[1],
                            (__compactRuntime.assert(g1_0 >= t_12,
                                                     'result of subtraction would be negative'),
                             g1_0 - t_12)),
                    (t_14 = socialQ_0[1],
                     (__compactRuntime.assert(t_13 >= t_14,
                                              'result of subtraction would be negative'),
                      t_13 - t_14)));
    const grossTotal_0 = g0_0 + g1_0;
    const taxTotal_0 = taxQ_0[0] + taxQ_0[1];
    const socialTotal_0 = socialQ_0[0] + socialQ_0[1];
    const netTotal_0 = net0_0 + net1_0;
    const net_0 = [net0_0, net1_0];
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(12n),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)
                            ||
                            !_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(12n),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(p_0),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            "this period's withholding is funded — a funded month cannot be re-filed");
    if (_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                  partialProofData,
                                                                  [
                                                                   { dup: { n: 0 } },
                                                                   { idx: { cached: false,
                                                                            pushPath: false,
                                                                            path: [
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_4.toValue(1n),
                                                                                              alignment: _descriptor_4.alignment() } },
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_4.toValue(14n),
                                                                                              alignment: _descriptor_4.alignment() } }] } },
                                                                   { push: { storage: false,
                                                                             value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                          alignment: _descriptor_2.alignment() }).encode() } },
                                                                   'member',
                                                                   { popeq: { cached: true,
                                                                              result: undefined } }]).value))
    {
      this._folder_0(context,
                     partialProofData,
                     ((context, partialProofData, t_15, i_0) =>
                      {
                        const idx_0 = i_0;
                        if (_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(14n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(p_0),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(idx_0),
                                                                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value))
                        {
                          if (_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_4.toValue(1n),
                                                                                                                    alignment: _descriptor_4.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_4.toValue(14n),
                                                                                                                    alignment: _descriptor_4.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_2.toValue(p_0),
                                                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_4.toValue(idx_0),
                                                                                                                    alignment: _descriptor_4.alignment() } }] } },
                                                                                         { popeq: { cached: false,
                                                                                                    result: undefined } }]).value))
                          {
                            __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                              partialProofData,
                                                                                                              [
                                                                                                               { dup: { n: 0 } },
                                                                                                               { idx: { cached: false,
                                                                                                                        pushPath: false,
                                                                                                                        path: [
                                                                                                                               { tag: 'value',
                                                                                                                                 value: { value: _descriptor_4.toValue(2n),
                                                                                                                                          alignment: _descriptor_4.alignment() } },
                                                                                                                               { tag: 'value',
                                                                                                                                 value: { value: _descriptor_4.toValue(0n),
                                                                                                                                          alignment: _descriptor_4.alignment() } },
                                                                                                                               { tag: 'value',
                                                                                                                                 value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                          alignment: _descriptor_2.alignment() } }] } },
                                                                                                               { push: { storage: false,
                                                                                                                         value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(idx_0),
                                                                                                                                                                      alignment: _descriptor_4.alignment() }).encode() } },
                                                                                                               'member',
                                                                                                               { popeq: { cached: true,
                                                                                                                          result: undefined } }]).value)
                                                    &&
                                                    _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                              partialProofData,
                                                                                                              [
                                                                                                               { dup: { n: 0 } },
                                                                                                               { idx: { cached: false,
                                                                                                                        pushPath: false,
                                                                                                                        path: [
                                                                                                                               { tag: 'value',
                                                                                                                                 value: { value: _descriptor_4.toValue(2n),
                                                                                                                                          alignment: _descriptor_4.alignment() } },
                                                                                                                               { tag: 'value',
                                                                                                                                 value: { value: _descriptor_4.toValue(0n),
                                                                                                                                          alignment: _descriptor_4.alignment() } },
                                                                                                                               { tag: 'value',
                                                                                                                                 value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                          alignment: _descriptor_2.alignment() } }] } },
                                                                                                               { idx: { cached: false,
                                                                                                                        pushPath: false,
                                                                                                                        path: [
                                                                                                                               { tag: 'value',
                                                                                                                                 value: { value: _descriptor_4.toValue(idx_0),
                                                                                                                                          alignment: _descriptor_4.alignment() } }] } },
                                                                                                               { popeq: { cached: false,
                                                                                                                          result: undefined } }]).value),
                                                    'this period has funded slots that are not paid — settle them before re-filing');
                          }
                        }
                        return t_15;
                      }),
                     [],
                     [0n, 1n]);
    }
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(1n),
                                                                                               alignment: _descriptor_4.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(11n),
                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                           alignment: _descriptor_2.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(1n),
                                                                    alignment: _descriptor_4.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(11n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newMap(
                                                            new __compactRuntime.StateMap()
                                                          ).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(1n),
                                                                                               alignment: _descriptor_4.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(12n),
                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                           alignment: _descriptor_2.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(1n),
                                                                    alignment: _descriptor_4.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(12n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newMap(
                                                            new __compactRuntime.StateMap()
                                                          ).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(1n),
                                                                                               alignment: _descriptor_4.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(13n),
                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                           alignment: _descriptor_2.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(1n),
                                                                    alignment: _descriptor_4.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(13n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newMap(
                                                            new __compactRuntime.StateMap()
                                                          ).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(2n),
                                                                                               alignment: _descriptor_4.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(0n),
                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                           alignment: _descriptor_2.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(0n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newMap(
                                                            new __compactRuntime.StateMap()
                                                          ).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(1n),
                                                                                               alignment: _descriptor_4.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(14n),
                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                           alignment: _descriptor_2.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(1n),
                                                                    alignment: _descriptor_4.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(14n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newMap(
                                                            new __compactRuntime.StateMap()
                                                          ).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(2n),
                                                                                               alignment: _descriptor_4.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(5n),
                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                           alignment: _descriptor_2.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(5n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newMap(
                                                            new __compactRuntime.StateMap()
                                                          ).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(2n),
                                                                                               alignment: _descriptor_4.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(2n),
                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                           alignment: _descriptor_2.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      const tmp_0 = 0n;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    } else {
      const tmp_1 = ((t1) => {
                      if (t1 > 4294967295n) {
                        throw new __compactRuntime.CompactError('payroll.compact line 770 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                      }
                      return t1;
                    })(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_4.toValue(2n),
                                                                                                             alignment: _descriptor_4.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_4.toValue(2n),
                                                                                                             alignment: _descriptor_4.alignment() } }] } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_2.toValue(p_0),
                                                                                                             alignment: _descriptor_2.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value)
                       +
                       1n);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_1),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    const tmp_2 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                            partialProofData,
                                                                            [
                                                                             { dup: { n: 0 } },
                                                                             { idx: { cached: false,
                                                                                      pushPath: false,
                                                                                      path: [
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(0n),
                                                                                                        alignment: _descriptor_4.alignment() } },
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(3n),
                                                                                                        alignment: _descriptor_4.alignment() } }] } },
                                                                             { popeq: { cached: false,
                                                                                        result: undefined } }]).value);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(3n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_2),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    this._folder_1(context,
                   partialProofData,
                   ((context, partialProofData, t_16, i_1) =>
                    {
                      const tmp_3 = i_1;
                      const tmp_4 = this._persistentHash_4({ gross: gross_0[i_1],
                                                             tax: taxQ_0[i_1],
                                                             social:
                                                               socialQ_0[i_1],
                                                             net: net_0[i_1],
                                                             weeks: weeks_0[i_1],
                                                             period: p_0,
                                                             employer:
                                                               _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                         partialProofData,
                                                                                                                         [
                                                                                                                          { dup: { n: 0 } },
                                                                                                                          { idx: { cached: false,
                                                                                                                                   pushPath: false,
                                                                                                                                   path: [
                                                                                                                                          { tag: 'value',
                                                                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                                                                          { tag: 'value',
                                                                                                                                            value: { value: _descriptor_4.toValue(3n),
                                                                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                                                                          { idx: { cached: false,
                                                                                                                                   pushPath: false,
                                                                                                                                   path: [
                                                                                                                                          { tag: 'value',
                                                                                                                                            value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                                                                          { popeq: { cached: false,
                                                                                                                                     result: undefined } }]).value),
                                                             paramsHash:
                                                               _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                         partialProofData,
                                                                                                                         [
                                                                                                                          { dup: { n: 0 } },
                                                                                                                          { idx: { cached: false,
                                                                                                                                   pushPath: false,
                                                                                                                                   path: [
                                                                                                                                          { tag: 'value',
                                                                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                                                                          { tag: 'value',
                                                                                                                                            value: { value: _descriptor_4.toValue(10n),
                                                                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                                                                          { idx: { cached: false,
                                                                                                                                   pushPath: false,
                                                                                                                                   path: [
                                                                                                                                          { tag: 'value',
                                                                                                                                            value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                                                                          { popeq: { cached: false,
                                                                                                                                     result: undefined } }]).value),
                                                             nonce:
                                                               nonces_0[i_1] });
                      __compactRuntime.queryLedgerState(context,
                                                        partialProofData,
                                                        [
                                                         { idx: { cached: false,
                                                                  pushPath: true,
                                                                  path: [
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(1n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(11n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_2.toValue(p_0),
                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                         { push: { storage: false,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_3),
                                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                                         { push: { storage: true,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_4),
                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                         { ins: { cached: false,
                                                                  n: 1 } },
                                                         { ins: { cached: true,
                                                                  n: 3 } }]);
                      const tmp_5 = i_1;
                      const tmp_6 = sealedOpenings_0[i_1];
                      __compactRuntime.queryLedgerState(context,
                                                        partialProofData,
                                                        [
                                                         { idx: { cached: false,
                                                                  pushPath: true,
                                                                  path: [
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(1n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(12n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_2.toValue(p_0),
                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                         { push: { storage: false,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_5),
                                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                                         { push: { storage: true,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_19.toValue(tmp_6),
                                                                                                                alignment: _descriptor_19.alignment() }).encode() } },
                                                         { ins: { cached: false,
                                                                  n: 1 } },
                                                         { ins: { cached: true,
                                                                  n: 3 } }]);
                      const tmp_7 = i_1;
                      const tmp_8 = payees_0[i_1];
                      __compactRuntime.queryLedgerState(context,
                                                        partialProofData,
                                                        [
                                                         { idx: { cached: false,
                                                                  pushPath: true,
                                                                  path: [
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(1n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(13n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_2.toValue(p_0),
                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                         { push: { storage: false,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_7),
                                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                                         { push: { storage: true,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_8),
                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                         { ins: { cached: false,
                                                                  n: 1 } },
                                                         { ins: { cached: true,
                                                                  n: 3 } }]);
                      const tmp_9 = i_1;
                      __compactRuntime.queryLedgerState(context,
                                                        partialProofData,
                                                        [
                                                         { idx: { cached: false,
                                                                  pushPath: true,
                                                                  path: [
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(2n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(0n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_2.toValue(p_0),
                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                         { push: { storage: false,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_9),
                                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                                         { push: { storage: true,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(false),
                                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                                         { ins: { cached: false,
                                                                  n: 1 } },
                                                         { ins: { cached: true,
                                                                  n: 3 } }]);
                      const tmp_10 = i_1;
                      __compactRuntime.queryLedgerState(context,
                                                        partialProofData,
                                                        [
                                                         { idx: { cached: false,
                                                                  pushPath: true,
                                                                  path: [
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(1n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(14n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_2.toValue(p_0),
                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                         { push: { storage: false,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_10),
                                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                                         { push: { storage: true,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(false),
                                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                                         { ins: { cached: false,
                                                                  n: 1 } },
                                                         { ins: { cached: true,
                                                                  n: 3 } }]);
                      return t_16;
                    }),
                   [],
                   [0n, 1n]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(3n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_11 = grossTotal_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(6n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_11),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_12 = taxTotal_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(7n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_12),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_13 = socialTotal_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(8n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_13),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_14 = netTotal_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(9n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_14),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_15 = 2n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(5n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_15),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    if (p_0
        >
        _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                  partialProofData,
                                                                  [
                                                                   { dup: { n: 0 } },
                                                                   { idx: { cached: false,
                                                                            pushPath: false,
                                                                            path: [
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_4.toValue(1n),
                                                                                              alignment: _descriptor_4.alignment() } },
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() } }] } },
                                                                   { popeq: { cached: false,
                                                                              result: undefined } }]).value))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(1n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    return [];
  }
  _fundEmployee_0(context,
                  partialProofData,
                  period_0,
                  index_0,
                  gross_0,
                  tax_0,
                  social_0,
                  net_0,
                  weeks_0,
                  nonce_0,
                  coin_0)
  {
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(0n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'no employer assigned yet');
    __compactRuntime.assert(this._equal_9(this._ownPublicKey_0(context,
                                                               partialProofData),
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(0n),
                                                                                                                                alignment: _descriptor_4.alignment() } },
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_4.toValue(3n),
                                                                                                                                alignment: _descriptor_4.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'only the employer may fund payroll');
    const p_0 = period_0;
    const i_0 = index_0;
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(11n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no payroll filed for that period');
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(11n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(p_0),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(i_0),
                                                                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no such employee in that period');
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(14n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(p_0),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(i_0),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'already funded');
    __compactRuntime.assert(this._equal_10(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(1n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(11n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(i_0),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           this._persistentHash_4({ gross:
                                                                      gross_0,
                                                                    tax: tax_0,
                                                                    social:
                                                                      social_0,
                                                                    net: net_0,
                                                                    weeks:
                                                                      weeks_0,
                                                                    period: p_0,
                                                                    employer:
                                                                      _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                partialProofData,
                                                                                                                                [
                                                                                                                                 { dup: { n: 0 } },
                                                                                                                                 { idx: { cached: false,
                                                                                                                                          pushPath: false,
                                                                                                                                          path: [
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_4.toValue(2n),
                                                                                                                                                            alignment: _descriptor_4.alignment() } },
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_4.toValue(3n),
                                                                                                                                                            alignment: _descriptor_4.alignment() } }] } },
                                                                                                                                 { idx: { cached: false,
                                                                                                                                          pushPath: false,
                                                                                                                                          path: [
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                            alignment: _descriptor_2.alignment() } }] } },
                                                                                                                                 { popeq: { cached: false,
                                                                                                                                            result: undefined } }]).value),
                                                                    paramsHash:
                                                                      _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                partialProofData,
                                                                                                                                [
                                                                                                                                 { dup: { n: 0 } },
                                                                                                                                 { idx: { cached: false,
                                                                                                                                          pushPath: false,
                                                                                                                                          path: [
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_4.toValue(1n),
                                                                                                                                                            alignment: _descriptor_4.alignment() } },
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_4.toValue(10n),
                                                                                                                                                            alignment: _descriptor_4.alignment() } }] } },
                                                                                                                                 { idx: { cached: false,
                                                                                                                                          pushPath: false,
                                                                                                                                          path: [
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                            alignment: _descriptor_2.alignment() } }] } },
                                                                                                                                 { popeq: { cached: false,
                                                                                                                                            result: undefined } }]).value),
                                                                    nonce:
                                                                      nonce_0 })),
                            'the figures and nonce do not open the commitment for that employee');
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(2n),
                                                                                               alignment: _descriptor_4.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(7n),
                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                    { popeq: { cached: false,
                                                                               result: undefined } }]).value))
    {
      const tmp_0 = coin_0.color;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(6n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(7n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    __compactRuntime.assert(this._equal_11(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(2n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(6n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           coin_0.color),
                            'wrong token for this payroll');
    __compactRuntime.assert(this._equal_12(coin_0.value, net_0),
                            'coin does not hold the committed net pay');
    this._receiveShielded_0(context, partialProofData, coin_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(14n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(p_0),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(i_0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 3 } }]);
    const tmp_1 = _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                            partialProofData,
                                                                            [
                                                                             { dup: { n: 0 } },
                                                                             { idx: { cached: false,
                                                                                      pushPath: false,
                                                                                      path: [
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(2n),
                                                                                                        alignment: _descriptor_4.alignment() } },
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(4n),
                                                                                                        alignment: _descriptor_4.alignment() } }] } },
                                                                             { popeq: { cached: false,
                                                                                        result: undefined } }]).value);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(5n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(p_0),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(i_0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_1),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 3 } }]);
    const tmp_2 = ((t1) => {
                    if (t1 > 4294967295n) {
                      throw new __compactRuntime.CompactError('payroll.compact line 879 char 19: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                    }
                    return t1;
                  })(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(2n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(4n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_2),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _fundPeriod_0(context,
                partialProofData,
                period_0,
                gross_0,
                tax_0,
                social_0,
                net_0,
                weeks_0,
                nonces_0,
                netCoins_0,
                taxCoin_0,
                socialCoin_0)
  {
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(0n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'no employer assigned yet');
    __compactRuntime.assert(this._equal_13(this._ownPublicKey_0(context,
                                                                partialProofData),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(3n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'only the employer may fund payroll');
    const p_0 = period_0;
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(11n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no payroll filed for that period');
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(12n),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)
                            ||
                            !_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(12n),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(p_0),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'withholding already funded');
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(2n),
                                                                                               alignment: _descriptor_4.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(7n),
                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                    { popeq: { cached: false,
                                                                               result: undefined } }]).value))
    {
      const tmp_0 = netCoins_0[0].color;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(6n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(7n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    this._folder_2(context,
                   partialProofData,
                   ((context, partialProofData, t_0, i_0) =>
                    {
                      const idx_0 = i_0;
                      __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                        partialProofData,
                                                                                                        [
                                                                                                         { dup: { n: 0 } },
                                                                                                         { idx: { cached: false,
                                                                                                                  pushPath: false,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_4.toValue(1n),
                                                                                                                                    alignment: _descriptor_4.alignment() } },
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_4.toValue(11n),
                                                                                                                                    alignment: _descriptor_4.alignment() } },
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(idx_0),
                                                                                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                                                                                         'member',
                                                                                                         { popeq: { cached: true,
                                                                                                                    result: undefined } }]).value),
                                              'no such employee in that period');
                      __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                         partialProofData,
                                                                                                         [
                                                                                                          { dup: { n: 0 } },
                                                                                                          { idx: { cached: false,
                                                                                                                   pushPath: false,
                                                                                                                   path: [
                                                                                                                          { tag: 'value',
                                                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                                                          { tag: 'value',
                                                                                                                            value: { value: _descriptor_4.toValue(14n),
                                                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                                                          { tag: 'value',
                                                                                                                            value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                                                          { idx: { cached: false,
                                                                                                                   pushPath: false,
                                                                                                                   path: [
                                                                                                                          { tag: 'value',
                                                                                                                            value: { value: _descriptor_4.toValue(idx_0),
                                                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                                                          { popeq: { cached: false,
                                                                                                                     result: undefined } }]).value),
                                              'already funded');
                      __compactRuntime.assert(this._equal_14(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                       partialProofData,
                                                                                                                       [
                                                                                                                        { dup: { n: 0 } },
                                                                                                                        { idx: { cached: false,
                                                                                                                                 pushPath: false,
                                                                                                                                 path: [
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(11n),
                                                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                                                        { idx: { cached: false,
                                                                                                                                 pushPath: false,
                                                                                                                                 path: [
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(idx_0),
                                                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                                                        { popeq: { cached: false,
                                                                                                                                   result: undefined } }]).value),
                                                             this._persistentHash_4({ gross:
                                                                                        gross_0[i_0],
                                                                                      tax:
                                                                                        tax_0[i_0],
                                                                                      social:
                                                                                        social_0[i_0],
                                                                                      net:
                                                                                        net_0[i_0],
                                                                                      weeks:
                                                                                        weeks_0[i_0],
                                                                                      period:
                                                                                        p_0,
                                                                                      employer:
                                                                                        _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                                  partialProofData,
                                                                                                                                                  [
                                                                                                                                                   { dup: { n: 0 } },
                                                                                                                                                   { idx: { cached: false,
                                                                                                                                                            pushPath: false,
                                                                                                                                                            path: [
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_4.toValue(2n),
                                                                                                                                                                              alignment: _descriptor_4.alignment() } },
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_4.toValue(3n),
                                                                                                                                                                              alignment: _descriptor_4.alignment() } }] } },
                                                                                                                                                   { idx: { cached: false,
                                                                                                                                                            pushPath: false,
                                                                                                                                                            path: [
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                                              alignment: _descriptor_2.alignment() } }] } },
                                                                                                                                                   { popeq: { cached: false,
                                                                                                                                                              result: undefined } }]).value),
                                                                                      paramsHash:
                                                                                        _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                                  partialProofData,
                                                                                                                                                  [
                                                                                                                                                   { dup: { n: 0 } },
                                                                                                                                                   { idx: { cached: false,
                                                                                                                                                            pushPath: false,
                                                                                                                                                            path: [
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_4.toValue(1n),
                                                                                                                                                                              alignment: _descriptor_4.alignment() } },
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_4.toValue(10n),
                                                                                                                                                                              alignment: _descriptor_4.alignment() } }] } },
                                                                                                                                                   { idx: { cached: false,
                                                                                                                                                            pushPath: false,
                                                                                                                                                            path: [
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                                              alignment: _descriptor_2.alignment() } }] } },
                                                                                                                                                   { popeq: { cached: false,
                                                                                                                                                              result: undefined } }]).value),
                                                                                      nonce:
                                                                                        nonces_0[i_0] })),
                                              'the figures and nonce do not open the commitment for that employee');
                      __compactRuntime.assert(this._equal_15(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                       partialProofData,
                                                                                                                       [
                                                                                                                        { dup: { n: 0 } },
                                                                                                                        { idx: { cached: false,
                                                                                                                                 pushPath: false,
                                                                                                                                 path: [
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(6n),
                                                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                                                        { popeq: { cached: false,
                                                                                                                                   result: undefined } }]).value),
                                                             netCoins_0[i_0].color),
                                              'wrong token for this payroll');
                      __compactRuntime.assert(this._equal_16(netCoins_0[i_0].value,
                                                             net_0[i_0]),
                                              'coin does not hold the committed net pay');
                      this._receiveShielded_0(context,
                                              partialProofData,
                                              netCoins_0[i_0]);
                      __compactRuntime.queryLedgerState(context,
                                                        partialProofData,
                                                        [
                                                         { idx: { cached: false,
                                                                  pushPath: true,
                                                                  path: [
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(1n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(14n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_2.toValue(p_0),
                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                         { push: { storage: false,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(idx_0),
                                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                                         { push: { storage: true,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                                         { ins: { cached: false,
                                                                  n: 1 } },
                                                         { ins: { cached: true,
                                                                  n: 3 } }]);
                      const tmp_1 = _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                              partialProofData,
                                                                                              [
                                                                                               { dup: { n: 0 } },
                                                                                               { idx: { cached: false,
                                                                                                        pushPath: false,
                                                                                                        path: [
                                                                                                               { tag: 'value',
                                                                                                                 value: { value: _descriptor_4.toValue(2n),
                                                                                                                          alignment: _descriptor_4.alignment() } },
                                                                                                               { tag: 'value',
                                                                                                                 value: { value: _descriptor_4.toValue(4n),
                                                                                                                          alignment: _descriptor_4.alignment() } }] } },
                                                                                               { popeq: { cached: false,
                                                                                                          result: undefined } }]).value);
                      __compactRuntime.queryLedgerState(context,
                                                        partialProofData,
                                                        [
                                                         { idx: { cached: false,
                                                                  pushPath: true,
                                                                  path: [
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(2n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(5n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_2.toValue(p_0),
                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                         { push: { storage: false,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(idx_0),
                                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                                         { push: { storage: true,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_1),
                                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                                         { ins: { cached: false,
                                                                  n: 1 } },
                                                         { ins: { cached: true,
                                                                  n: 3 } }]);
                      const tmp_2 = ((t1) => {
                                      if (t1 > 4294967295n) {
                                        throw new __compactRuntime.CompactError('payroll.compact line 968 char 21: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                                      }
                                      return t1;
                                    })(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                 partialProofData,
                                                                                                 [
                                                                                                  { dup: { n: 0 } },
                                                                                                  { idx: { cached: false,
                                                                                                           pushPath: false,
                                                                                                           path: [
                                                                                                                  { tag: 'value',
                                                                                                                    value: { value: _descriptor_4.toValue(2n),
                                                                                                                             alignment: _descriptor_4.alignment() } },
                                                                                                                  { tag: 'value',
                                                                                                                    value: { value: _descriptor_4.toValue(4n),
                                                                                                                             alignment: _descriptor_4.alignment() } }] } },
                                                                                                  { popeq: { cached: false,
                                                                                                             result: undefined } }]).value)
                                       +
                                       1n);
                      __compactRuntime.queryLedgerState(context,
                                                        partialProofData,
                                                        [
                                                         { idx: { cached: false,
                                                                  pushPath: true,
                                                                  path: [
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(2n),
                                                                                    alignment: _descriptor_4.alignment() } }] } },
                                                         { push: { storage: false,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                                         { push: { storage: true,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_2),
                                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                                         { ins: { cached: false,
                                                                  n: 1 } },
                                                         { ins: { cached: true,
                                                                  n: 1 } }]);
                      return t_0;
                    }),
                   [],
                   [0n, 1n]);
    __compactRuntime.assert(this._equal_17(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(2n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(6n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           taxCoin_0.color),
                            'wrong token for the tax coin');
    __compactRuntime.assert(this._equal_18(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(2n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(6n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           socialCoin_0.color),
                            'wrong token for the contribution coin');
    __compactRuntime.assert(this._equal_19(taxCoin_0.value,
                                           _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(1n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(7n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'tax coin does not hold the tax assessed for that period');
    __compactRuntime.assert(this._equal_20(socialCoin_0.value,
                                           _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(1n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(8n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'contribution coin does not hold the contribution assessed for that period');
    this._receiveShielded_0(context, partialProofData, taxCoin_0);
    const tmp_3 = _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                            partialProofData,
                                                                            [
                                                                             { dup: { n: 0 } },
                                                                             { idx: { cached: false,
                                                                                      pushPath: false,
                                                                                      path: [
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(2n),
                                                                                                        alignment: _descriptor_4.alignment() } },
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(4n),
                                                                                                        alignment: _descriptor_4.alignment() } }] } },
                                                                             { popeq: { cached: false,
                                                                                        result: undefined } }]).value);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(13n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_3),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_4 = ((t1) => {
                    if (t1 > 4294967295n) {
                      throw new __compactRuntime.CompactError('payroll.compact line 990 char 19: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                    }
                    return t1;
                  })(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(2n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(4n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_4),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    this._receiveShielded_0(context, partialProofData, socialCoin_0);
    const tmp_5 = _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                            partialProofData,
                                                                            [
                                                                             { dup: { n: 0 } },
                                                                             { idx: { cached: false,
                                                                                      pushPath: false,
                                                                                      path: [
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(2n),
                                                                                                        alignment: _descriptor_4.alignment() } },
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(4n),
                                                                                                        alignment: _descriptor_4.alignment() } }] } },
                                                                             { popeq: { cached: false,
                                                                                        result: undefined } }]).value);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(14n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_5),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_6 = ((t1) => {
                    if (t1 > 4294967295n) {
                      throw new __compactRuntime.CompactError('payroll.compact line 994 char 19: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                    }
                    return t1;
                  })(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(2n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(4n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_6),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_7 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('payroll.compact line 996 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(2n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(8n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(1n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(7n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_2.toValue(p_0),
                                                                                                           alignment: _descriptor_2.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(8n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_7),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_8 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('payroll.compact line 997 char 16: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(2n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(9n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(1n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(8n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_2.toValue(p_0),
                                                                                                           alignment: _descriptor_2.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(9n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_8),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(12n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    return [];
  }
  _payEmployee_0(context,
                 partialProofData,
                 period_0,
                 index_0,
                 gross_0,
                 tax_0,
                 social_0,
                 net_0,
                 weeks_0,
                 nonce_0,
                 coin_0,
                 payee_0)
  {
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(0n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'no employer assigned yet');
    __compactRuntime.assert(this._equal_21(this._ownPublicKey_0(context,
                                                                partialProofData),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(3n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'only the employer may pay');
    const p_0 = period_0;
    const i_0 = index_0;
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(11n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no payroll filed for that period');
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(11n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(p_0),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(i_0),
                                                                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no such employee in that period');
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(14n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(p_0),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(i_0),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'that slot has not been funded');
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(0n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(p_0),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(i_0),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'already paid');
    __compactRuntime.assert(this._equal_22(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(1n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(11n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(i_0),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           this._persistentHash_4({ gross:
                                                                      gross_0,
                                                                    tax: tax_0,
                                                                    social:
                                                                      social_0,
                                                                    net: net_0,
                                                                    weeks:
                                                                      weeks_0,
                                                                    period: p_0,
                                                                    employer:
                                                                      _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                partialProofData,
                                                                                                                                [
                                                                                                                                 { dup: { n: 0 } },
                                                                                                                                 { idx: { cached: false,
                                                                                                                                          pushPath: false,
                                                                                                                                          path: [
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_4.toValue(2n),
                                                                                                                                                            alignment: _descriptor_4.alignment() } },
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_4.toValue(3n),
                                                                                                                                                            alignment: _descriptor_4.alignment() } }] } },
                                                                                                                                 { idx: { cached: false,
                                                                                                                                          pushPath: false,
                                                                                                                                          path: [
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                            alignment: _descriptor_2.alignment() } }] } },
                                                                                                                                 { popeq: { cached: false,
                                                                                                                                            result: undefined } }]).value),
                                                                    paramsHash:
                                                                      _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                partialProofData,
                                                                                                                                [
                                                                                                                                 { dup: { n: 0 } },
                                                                                                                                 { idx: { cached: false,
                                                                                                                                          pushPath: false,
                                                                                                                                          path: [
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_4.toValue(1n),
                                                                                                                                                            alignment: _descriptor_4.alignment() } },
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_4.toValue(10n),
                                                                                                                                                            alignment: _descriptor_4.alignment() } }] } },
                                                                                                                                 { idx: { cached: false,
                                                                                                                                          pushPath: false,
                                                                                                                                          path: [
                                                                                                                                                 { tag: 'value',
                                                                                                                                                   value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                            alignment: _descriptor_2.alignment() } }] } },
                                                                                                                                 { popeq: { cached: false,
                                                                                                                                            result: undefined } }]).value),
                                                                    nonce:
                                                                      nonce_0 })),
                            'the figures and nonce do not open the commitment for that employee');
    __compactRuntime.assert(this._equal_23(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(1n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(13n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(i_0),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           this._persistentHash_3({ payee:
                                                                      payee_0,
                                                                    period: p_0,
                                                                    instance:
                                                                      _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                 partialProofData,
                                                                                                                                 [
                                                                                                                                  { dup: { n: 2 } },
                                                                                                                                  { idx: { cached: true,
                                                                                                                                           pushPath: false,
                                                                                                                                           path: [
                                                                                                                                                  { tag: 'value',
                                                                                                                                                    value: { value: _descriptor_4.toValue(0n),
                                                                                                                                                             alignment: _descriptor_4.alignment() } }] } },
                                                                                                                                  { popeq: { cached: true,
                                                                                                                                             result: undefined } }]).value).bytes })),
                            'recipient is not the payee filed for that employee');
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(2n),
                                                                                               alignment: _descriptor_4.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(7n),
                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                    { popeq: { cached: false,
                                                                               result: undefined } }]).value))
    {
      const tmp_0 = coin_0.color;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(6n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(7n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    __compactRuntime.assert(this._equal_24(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(2n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(6n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           coin_0.color),
                            'wrong token for this payroll');
    __compactRuntime.assert(this._equal_25(coin_0.value, net_0),
                            'coin does not hold the committed net pay');
    this._sendShielded_0(context,
                         partialProofData,
                         coin_0,
                         this._left_0(payee_0),
                         net_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(0n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(p_0),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(i_0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 3 } }]);
    return [];
  }
  _endEmployment_0(context, partialProofData, period_0, index_0, attestation_0)
  {
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(0n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'no employer assigned yet');
    __compactRuntime.assert(this._equal_26(this._ownPublicKey_0(context,
                                                                partialProofData),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(3n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'only the employer may end employment');
    const p_0 = period_0;
    const i_0 = index_0;
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(11n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no payroll filed for that period');
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(11n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(p_0),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(i_0),
                                                                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no such employee in that period');
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(2n),
                                                                                               alignment: _descriptor_4.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_4.toValue(1n),
                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                    { push: { storage: false,
                                                                              value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                           alignment: _descriptor_2.alignment() }).encode() } },
                                                                    'member',
                                                                    { popeq: { cached: true,
                                                                               result: undefined } }]).value))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(1n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newMap(
                                                            new __compactRuntime.StateMap()
                                                          ).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(p_0),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(i_0),
                                                                                                                                               alignment: _descriptor_4.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'employment has already been ended for that employee');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(1n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(p_0),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(i_0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(attestation_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 3 } }]);
    return [];
  }
  _fundWithholding_0(context,
                     partialProofData,
                     period_0,
                     taxCoin_0,
                     socialCoin_0)
  {
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(0n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'no employer assigned yet');
    __compactRuntime.assert(this._equal_27(this._ownPublicKey_0(context,
                                                                partialProofData),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(3n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'only the employer may fund withholding');
    const p_0 = period_0;
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(11n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no payroll filed for that period');
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(12n),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)
                            ||
                            !_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_4.toValue(12n),
                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(p_0),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'already funded');
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(2n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(7n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'fund an employee first — the pay token is not fixed yet');
    __compactRuntime.assert(this._equal_28(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(2n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(6n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           taxCoin_0.color),
                            'wrong token for the tax coin');
    __compactRuntime.assert(this._equal_29(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(2n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(6n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           socialCoin_0.color),
                            'wrong token for the contribution coin');
    __compactRuntime.assert(this._equal_30(taxCoin_0.value,
                                           _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(1n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(7n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'tax coin does not hold the tax assessed for that period');
    __compactRuntime.assert(this._equal_31(socialCoin_0.value,
                                           _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(1n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(8n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                 alignment: _descriptor_2.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'contribution coin does not hold the contribution assessed for that period');
    this._receiveShielded_0(context, partialProofData, taxCoin_0);
    const tmp_0 = _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                            partialProofData,
                                                                            [
                                                                             { dup: { n: 0 } },
                                                                             { idx: { cached: false,
                                                                                      pushPath: false,
                                                                                      path: [
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(2n),
                                                                                                        alignment: _descriptor_4.alignment() } },
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(4n),
                                                                                                        alignment: _descriptor_4.alignment() } }] } },
                                                                             { popeq: { cached: false,
                                                                                        result: undefined } }]).value);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(13n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_1 = ((t1) => {
                    if (t1 > 4294967295n) {
                      throw new __compactRuntime.CompactError('payroll.compact line 1160 char 19: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                    }
                    return t1;
                  })(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(2n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(4n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_1),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    this._receiveShielded_0(context, partialProofData, socialCoin_0);
    const tmp_2 = _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                            partialProofData,
                                                                            [
                                                                             { dup: { n: 0 } },
                                                                             { idx: { cached: false,
                                                                                      pushPath: false,
                                                                                      path: [
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(2n),
                                                                                                        alignment: _descriptor_4.alignment() } },
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_4.toValue(4n),
                                                                                                        alignment: _descriptor_4.alignment() } }] } },
                                                                             { popeq: { cached: false,
                                                                                        result: undefined } }]).value);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(14n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_2),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_3 = ((t1) => {
                    if (t1 > 4294967295n) {
                      throw new __compactRuntime.CompactError('payroll.compact line 1164 char 19: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                    }
                    return t1;
                  })(_descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(2n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(4n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     1n);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(4n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_3),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_4 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('payroll.compact line 1166 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(2n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(8n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(1n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(7n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_2.toValue(p_0),
                                                                                                           alignment: _descriptor_2.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(8n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_4),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_5 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('payroll.compact line 1167 char 16: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(2n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(9n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(1n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(8n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_2.toValue(p_0),
                                                                                                           alignment: _descriptor_2.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(9n),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_5),
                                                                                              alignment: _descriptor_8.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(2n),
                                                                  alignment: _descriptor_4.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_4.toValue(12n),
                                                                  alignment: _descriptor_4.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    return [];
  }
  _remit_0(context, partialProofData, period_0, isTax_0, treasury_0, coin_0) {
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(0n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'no employer assigned yet');
    __compactRuntime.assert(this._equal_32(this._ownPublicKey_0(context,
                                                                partialProofData),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(3n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value))
                            ||
                            this._equal_33(this._ownPublicKey_0(context,
                                                                partialProofData),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'only the employer or the platform may remit');
    const p_0 = period_0;
    const t_0 = isTax_0;
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(2n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(12n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value)
                            &&
                            _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(2n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(12n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_2.toValue(p_0),
                                                                                                                  alignment: _descriptor_2.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'that period is not funded');
    __compactRuntime.assert(t_0 ?
                            _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(2n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(13n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value)
                            :
                            _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(2n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(14n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no coin recorded for that period');
    const owed_0 = t_0 ?
                   _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(7n),
                                                                                                         alignment: _descriptor_4.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(p_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value)
                   :
                   _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(8n),
                                                                                                         alignment: _descriptor_4.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(p_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
    const frozen_0 = t_0 ?
                     _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(0n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(1n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     :
                     _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(0n),
                                                                                                           alignment: _descriptor_4.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_4.toValue(2n),
                                                                                                           alignment: _descriptor_4.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value);
    __compactRuntime.assert(this._equal_34(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(2n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(6n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           coin_0.color),
                            'wrong token for this payroll');
    __compactRuntime.assert(this._equal_35(coin_0.value, owed_0),
                            "coin does not hold that period's amount");
    __compactRuntime.assert(this._equal_36(treasury_0, frozen_0),
                            "that is not this contract's treasury for that");
    this._sendShielded_0(context,
                         partialProofData,
                         coin_0,
                         this._left_0(treasury_0),
                         owed_0);
    if (t_0) {
      let t_1;
      const tmp_0 = (t_1 = _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                     partialProofData,
                                                                                     [
                                                                                      { dup: { n: 0 } },
                                                                                      { idx: { cached: false,
                                                                                               pushPath: false,
                                                                                               path: [
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_4.toValue(2n),
                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_4.toValue(8n),
                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                      { popeq: { cached: false,
                                                                                                 result: undefined } }]).value),
                     (__compactRuntime.assert(t_1 >= owed_0,
                                              'result of subtraction would be negative'),
                      t_1 - owed_0));
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(8n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_0),
                                                                                                alignment: _descriptor_8.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      const tmp_1 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('payroll.compact line 1272 char 19: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_4.toValue(2n),
                                                                                                             alignment: _descriptor_4.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_4.toValue(10n),
                                                                                                             alignment: _descriptor_4.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value)
                       +
                       owed_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(10n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_1),
                                                                                                alignment: _descriptor_8.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(13n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { rem: { cached: false } },
                                         { ins: { cached: true, n: 2 } }]);
    } else {
      let t_2;
      const tmp_2 = (t_2 = _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                     partialProofData,
                                                                                     [
                                                                                      { dup: { n: 0 } },
                                                                                      { idx: { cached: false,
                                                                                               pushPath: false,
                                                                                               path: [
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_4.toValue(2n),
                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                      { tag: 'value',
                                                                                                        value: { value: _descriptor_4.toValue(9n),
                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                      { popeq: { cached: false,
                                                                                                 result: undefined } }]).value),
                     (__compactRuntime.assert(t_2 >= owed_0,
                                              'result of subtraction would be negative'),
                      t_2 - owed_0));
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(9n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_2),
                                                                                                alignment: _descriptor_8.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      const tmp_3 = ((t1) => {
                      if (t1 > 18446744073709551615n) {
                        throw new __compactRuntime.CompactError('payroll.compact line 1276 char 22: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                      }
                      return t1;
                    })(_descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_4.toValue(2n),
                                                                                                             alignment: _descriptor_4.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_4.toValue(11n),
                                                                                                             alignment: _descriptor_4.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value)
                       +
                       owed_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(11n),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(tmp_3),
                                                                                                alignment: _descriptor_8.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(2n),
                                                                    alignment: _descriptor_4.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_4.toValue(14n),
                                                                    alignment: _descriptor_4.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { rem: { cached: false } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    return [];
  }
  _payPeriod_0(context,
               partialProofData,
               period_0,
               gross_0,
               tax_0,
               social_0,
               net_0,
               weeks_0,
               nonces_0,
               coins_0,
               payees_0)
  {
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(0n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'no employer assigned yet');
    __compactRuntime.assert(this._equal_37(this._ownPublicKey_0(context,
                                                                partialProofData),
                                           _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(0n),
                                                                                                                                 alignment: _descriptor_4.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_4.toValue(3n),
                                                                                                                                 alignment: _descriptor_4.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'only the employer may pay');
    const p_0 = period_0;
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(1n),
                                                                                                                  alignment: _descriptor_4.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_4.toValue(11n),
                                                                                                                  alignment: _descriptor_4.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(p_0),
                                                                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no payroll filed for that period');
    this._folder_3(context,
                   partialProofData,
                   ((context, partialProofData, t_0, i_0) =>
                    {
                      const idx_0 = i_0;
                      __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                        partialProofData,
                                                                                                        [
                                                                                                         { dup: { n: 0 } },
                                                                                                         { idx: { cached: false,
                                                                                                                  pushPath: false,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_4.toValue(1n),
                                                                                                                                    alignment: _descriptor_4.alignment() } },
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_4.toValue(14n),
                                                                                                                                    alignment: _descriptor_4.alignment() } },
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                                                                         { idx: { cached: false,
                                                                                                                  pushPath: false,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_4.toValue(idx_0),
                                                                                                                                    alignment: _descriptor_4.alignment() } }] } },
                                                                                                         { popeq: { cached: false,
                                                                                                                    result: undefined } }]).value),
                                              'a slot has not been funded');
                      __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                         partialProofData,
                                                                                                         [
                                                                                                          { dup: { n: 0 } },
                                                                                                          { idx: { cached: false,
                                                                                                                   pushPath: false,
                                                                                                                   path: [
                                                                                                                          { tag: 'value',
                                                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                                                          { tag: 'value',
                                                                                                                            value: { value: _descriptor_4.toValue(0n),
                                                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                                                          { tag: 'value',
                                                                                                                            value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                                                          { idx: { cached: false,
                                                                                                                   pushPath: false,
                                                                                                                   path: [
                                                                                                                          { tag: 'value',
                                                                                                                            value: { value: _descriptor_4.toValue(idx_0),
                                                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                                                          { popeq: { cached: false,
                                                                                                                     result: undefined } }]).value),
                                              'a slot has already been paid');
                      __compactRuntime.assert(this._equal_38(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                       partialProofData,
                                                                                                                       [
                                                                                                                        { dup: { n: 0 } },
                                                                                                                        { idx: { cached: false,
                                                                                                                                 pushPath: false,
                                                                                                                                 path: [
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(11n),
                                                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                                                        { idx: { cached: false,
                                                                                                                                 pushPath: false,
                                                                                                                                 path: [
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(idx_0),
                                                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                                                        { popeq: { cached: false,
                                                                                                                                   result: undefined } }]).value),
                                                             this._persistentHash_4({ gross:
                                                                                        gross_0[i_0],
                                                                                      tax:
                                                                                        tax_0[i_0],
                                                                                      social:
                                                                                        social_0[i_0],
                                                                                      net:
                                                                                        net_0[i_0],
                                                                                      weeks:
                                                                                        weeks_0[i_0],
                                                                                      period:
                                                                                        p_0,
                                                                                      employer:
                                                                                        _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                                  partialProofData,
                                                                                                                                                  [
                                                                                                                                                   { dup: { n: 0 } },
                                                                                                                                                   { idx: { cached: false,
                                                                                                                                                            pushPath: false,
                                                                                                                                                            path: [
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_4.toValue(2n),
                                                                                                                                                                              alignment: _descriptor_4.alignment() } },
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_4.toValue(3n),
                                                                                                                                                                              alignment: _descriptor_4.alignment() } }] } },
                                                                                                                                                   { idx: { cached: false,
                                                                                                                                                            pushPath: false,
                                                                                                                                                            path: [
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                                              alignment: _descriptor_2.alignment() } }] } },
                                                                                                                                                   { popeq: { cached: false,
                                                                                                                                                              result: undefined } }]).value),
                                                                                      paramsHash:
                                                                                        _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                                  partialProofData,
                                                                                                                                                  [
                                                                                                                                                   { dup: { n: 0 } },
                                                                                                                                                   { idx: { cached: false,
                                                                                                                                                            pushPath: false,
                                                                                                                                                            path: [
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_4.toValue(1n),
                                                                                                                                                                              alignment: _descriptor_4.alignment() } },
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_4.toValue(10n),
                                                                                                                                                                              alignment: _descriptor_4.alignment() } }] } },
                                                                                                                                                   { idx: { cached: false,
                                                                                                                                                            pushPath: false,
                                                                                                                                                            path: [
                                                                                                                                                                   { tag: 'value',
                                                                                                                                                                     value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                                              alignment: _descriptor_2.alignment() } }] } },
                                                                                                                                                   { popeq: { cached: false,
                                                                                                                                                              result: undefined } }]).value),
                                                                                      nonce:
                                                                                        nonces_0[i_0] })),
                                              'the figures and nonce do not open the commitment for that employee');
                      __compactRuntime.assert(this._equal_39(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                       partialProofData,
                                                                                                                       [
                                                                                                                        { dup: { n: 0 } },
                                                                                                                        { idx: { cached: false,
                                                                                                                                 pushPath: false,
                                                                                                                                 path: [
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(13n),
                                                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_2.toValue(p_0),
                                                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                                                        { idx: { cached: false,
                                                                                                                                 pushPath: false,
                                                                                                                                 path: [
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(idx_0),
                                                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                                                        { popeq: { cached: false,
                                                                                                                                   result: undefined } }]).value),
                                                             this._persistentHash_3({ payee:
                                                                                        payees_0[i_0],
                                                                                      period:
                                                                                        p_0,
                                                                                      instance:
                                                                                        _descriptor_11.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                                   partialProofData,
                                                                                                                                                   [
                                                                                                                                                    { dup: { n: 2 } },
                                                                                                                                                    { idx: { cached: true,
                                                                                                                                                             pushPath: false,
                                                                                                                                                             path: [
                                                                                                                                                                    { tag: 'value',
                                                                                                                                                                      value: { value: _descriptor_4.toValue(0n),
                                                                                                                                                                               alignment: _descriptor_4.alignment() } }] } },
                                                                                                                                                    { popeq: { cached: true,
                                                                                                                                                               result: undefined } }]).value).bytes })),
                                              'recipient is not the payee filed for that employee');
                      __compactRuntime.assert(this._equal_40(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                       partialProofData,
                                                                                                                       [
                                                                                                                        { dup: { n: 0 } },
                                                                                                                        { idx: { cached: false,
                                                                                                                                 pushPath: false,
                                                                                                                                 path: [
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_4.toValue(6n),
                                                                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                                                                        { popeq: { cached: false,
                                                                                                                                   result: undefined } }]).value),
                                                             coins_0[i_0].color),
                                              'wrong token for this payroll');
                      __compactRuntime.assert(this._equal_41(coins_0[i_0].value,
                                                             net_0[i_0]),
                                              'coin does not hold the committed net pay');
                      this._sendShielded_0(context,
                                           partialProofData,
                                           coins_0[i_0],
                                           this._left_0(payees_0[i_0]),
                                           net_0[i_0]);
                      __compactRuntime.queryLedgerState(context,
                                                        partialProofData,
                                                        [
                                                         { idx: { cached: false,
                                                                  pushPath: true,
                                                                  path: [
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(2n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_4.toValue(0n),
                                                                                    alignment: _descriptor_4.alignment() } },
                                                                         { tag: 'value',
                                                                           value: { value: _descriptor_2.toValue(p_0),
                                                                                    alignment: _descriptor_2.alignment() } }] } },
                                                         { push: { storage: false,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(idx_0),
                                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                                         { push: { storage: true,
                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                                         { ins: { cached: false,
                                                                  n: 1 } },
                                                         { ins: { cached: true,
                                                                  n: 3 } }]);
                      return t_0;
                    }),
                   [],
                   [0n, 1n]);
    return [];
  }
  _bandsFor_0(gross_0, threshold1_0, threshold2_0) {
    const b1_0 = gross_0 < threshold1_0 ? gross_0 : threshold1_0;
    let t_0;
    const b2_0 = gross_0 <= threshold1_0 ?
                 0n :
                 (t_0 = gross_0 < threshold2_0 ? gross_0 : threshold2_0,
                  (__compactRuntime.assert(t_0 >= threshold1_0,
                                           'result of subtraction would be negative'),
                   t_0 - threshold1_0));
    const b3_0 = gross_0 <= threshold2_0 ?
                 0n :
                 (__compactRuntime.assert(gross_0 >= threshold2_0,
                                          'result of subtraction would be negative'),
                  gross_0 - threshold2_0);
    return [b1_0, b2_0, b3_0];
  }
  _terminationCommitment_0(finalPeriod_0, monthsWorked_0, nonce_0) {
    return this._persistentHash_2({ finalPeriod: finalPeriod_0,
                                    monthsWorked: monthsWorked_0,
                                    nonce: nonce_0 });
  }
  _payeeHash_0(payee_0, period_0, instance_0) {
    return this._persistentHash_3({ payee: payee_0,
                                    period: period_0,
                                    instance: instance_0 });
  }
  _commitmentFor_0(gross_0,
                   tax_0,
                   social_0,
                   net_0,
                   weeks_0,
                   period_0,
                   employer_0,
                   paramsHash_0,
                   nonce_0)
  {
    return this._persistentHash_4({ gross: gross_0,
                                    tax: tax_0,
                                    social: social_0,
                                    net: net_0,
                                    weeks: weeks_0,
                                    period: period_0,
                                    employer: employer_0,
                                    paramsHash: paramsHash_0,
                                    nonce: nonce_0 });
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_3(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_4(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_5(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_6(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_7(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_8(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _folder_0(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 2; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _folder_1(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 2; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_9(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_10(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_11(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_12(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_13(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_14(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_15(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_16(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _folder_2(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 2; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_17(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_18(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_19(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_20(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_21(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_22(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_23(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_24(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_25(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_26(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_27(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_28(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_29(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_30(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_31(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_32(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_33(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_34(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_35(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_36(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_37(x0, y0) {
    {
      let x1 = x0.bytes;
      let y1 = y0.bytes;
      if (!x1.every((x, i) => y1[i] === x)) { return false; }
    }
    return true;
  }
  _equal_38(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_39(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_40(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_41(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _folder_3(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 2; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
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
    get platform() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(0n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(0n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get taxTreasury() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(0n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get socialTreasury() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(0n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get employer() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(0n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(3n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get employerAssigned() {
      return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(0n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get lastEmployer() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get everAssigned() {
      return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    periods: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(3n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(3n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(typeof(elem_0) === 'bigint' && elem_0 >= 0n && elem_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 187 char 1',
                                     'Uint<0..4294967296>',
                                     elem_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(3n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[3];
        return self_0.asMap().keys().map((elem) => _descriptor_2.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    get latestPeriod() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(1n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(4n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    employeeCountFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(5n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(5n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 191 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(5n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 191 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(5n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[5];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_4.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    totalPayrollFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(6n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(6n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 200 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(6n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 200 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(6n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[6];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_8.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    totalTaxFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(7n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(7n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 201 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(7n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 201 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(7n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[7];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_8.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    totalSocialFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(8n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(8n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 202 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(8n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 202 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(8n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[8];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_8.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    totalNetFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(9n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(9n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 203 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(9n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 203 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(9n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[9];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_8.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    paramsHashFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(10n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(10n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 212 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(10n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 212 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(10n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[10];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_0.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    commitmentsFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(11n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(11n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 216 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(11n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 216 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        if (state.asArray()[1].asArray()[11].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                           alignment: _descriptor_2.alignment() }) === undefined) {
          throw new __compactRuntime.CompactError(`Map value undefined for ${key_0}`);
        }
        return {
          isEmpty(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(11n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                     alignment: _descriptor_8.alignment() }).encode() } },
                                                                              'eq',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          size(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(11n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          member(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('member',
                                         'argument 1',
                                         'payroll.compact line 216 char 45',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(11n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(key_1),
                                                                                                                                     alignment: _descriptor_4.alignment() }).encode() } },
                                                                              'member',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          lookup(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('lookup',
                                         'argument 1',
                                         'payroll.compact line 216 char 45',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(11n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(key_1),
                                                                                                         alignment: _descriptor_4.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
          },
          [Symbol.iterator](...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_1.length}`);
            }
            const self_0 = state.asArray()[1].asArray()[11].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                                          alignment: _descriptor_2.alignment() });
            return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_4.fromValue(key.value),      _descriptor_0.fromValue(value.value)    ];  })[Symbol.iterator]();
          }
        }
      }
    },
    sealedFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(12n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(12n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 238 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(12n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 238 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        if (state.asArray()[1].asArray()[12].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                           alignment: _descriptor_2.alignment() }) === undefined) {
          throw new __compactRuntime.CompactError(`Map value undefined for ${key_0}`);
        }
        return {
          isEmpty(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(12n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                     alignment: _descriptor_8.alignment() }).encode() } },
                                                                              'eq',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          size(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(12n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          member(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('member',
                                         'argument 1',
                                         'payroll.compact line 238 char 40',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(12n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(key_1),
                                                                                                                                     alignment: _descriptor_4.alignment() }).encode() } },
                                                                              'member',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          lookup(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('lookup',
                                         'argument 1',
                                         'payroll.compact line 238 char 40',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_19.fromValue(__compactRuntime.queryLedgerState(context,
                                                                              partialProofData,
                                                                              [
                                                                               { dup: { n: 0 } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_4.toValue(1n),
                                                                                                          alignment: _descriptor_4.alignment() } },
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_4.toValue(12n),
                                                                                                          alignment: _descriptor_4.alignment() } },
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_2.toValue(key_0),
                                                                                                          alignment: _descriptor_2.alignment() } }] } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_4.toValue(key_1),
                                                                                                          alignment: _descriptor_4.alignment() } }] } },
                                                                               { popeq: { cached: false,
                                                                                          result: undefined } }]).value);
          },
          [Symbol.iterator](...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_1.length}`);
            }
            const self_0 = state.asArray()[1].asArray()[12].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                                          alignment: _descriptor_2.alignment() });
            return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_4.fromValue(key.value),      _descriptor_19.fromValue(value.value)    ];  })[Symbol.iterator]();
          }
        }
      }
    },
    payeeFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(13n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(13n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 261 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(13n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 261 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        if (state.asArray()[1].asArray()[13].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                           alignment: _descriptor_2.alignment() }) === undefined) {
          throw new __compactRuntime.CompactError(`Map value undefined for ${key_0}`);
        }
        return {
          isEmpty(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(13n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                     alignment: _descriptor_8.alignment() }).encode() } },
                                                                              'eq',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          size(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(13n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          member(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('member',
                                         'argument 1',
                                         'payroll.compact line 261 char 39',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(13n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(key_1),
                                                                                                                                     alignment: _descriptor_4.alignment() }).encode() } },
                                                                              'member',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          lookup(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('lookup',
                                         'argument 1',
                                         'payroll.compact line 261 char 39',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(13n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(key_1),
                                                                                                         alignment: _descriptor_4.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
          },
          [Symbol.iterator](...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_1.length}`);
            }
            const self_0 = state.asArray()[1].asArray()[13].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                                          alignment: _descriptor_2.alignment() });
            return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_4.fromValue(key.value),      _descriptor_0.fromValue(value.value)    ];  })[Symbol.iterator]();
          }
        }
      }
    },
    fundedFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(14n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(14n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 268 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(14n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 268 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        if (state.asArray()[1].asArray()[14].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                           alignment: _descriptor_2.alignment() }) === undefined) {
          throw new __compactRuntime.CompactError(`Map value undefined for ${key_0}`);
        }
        return {
          isEmpty(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(14n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                     alignment: _descriptor_8.alignment() }).encode() } },
                                                                              'eq',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          size(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(14n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          member(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('member',
                                         'argument 1',
                                         'payroll.compact line 268 char 40',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(14n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(key_1),
                                                                                                                                     alignment: _descriptor_4.alignment() }).encode() } },
                                                                              'member',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          lookup(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('lookup',
                                         'argument 1',
                                         'payroll.compact line 268 char 40',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(14n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(key_1),
                                                                                                         alignment: _descriptor_4.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
          },
          [Symbol.iterator](...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_1.length}`);
            }
            const self_0 = state.asArray()[1].asArray()[14].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                                          alignment: _descriptor_2.alignment() });
            return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_4.fromValue(key.value),      _descriptor_7.fromValue(value.value)    ];  })[Symbol.iterator]();
          }
        }
      }
    },
    paidFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(0n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(0n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 275 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(0n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 275 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        if (state.asArray()[2].asArray()[0].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                          alignment: _descriptor_2.alignment() }) === undefined) {
          throw new __compactRuntime.CompactError(`Map value undefined for ${key_0}`);
        }
        return {
          isEmpty(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(0n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                     alignment: _descriptor_8.alignment() }).encode() } },
                                                                              'eq',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          size(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(0n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          member(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('member',
                                         'argument 1',
                                         'payroll.compact line 275 char 38',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(0n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(key_1),
                                                                                                                                     alignment: _descriptor_4.alignment() }).encode() } },
                                                                              'member',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          lookup(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('lookup',
                                         'argument 1',
                                         'payroll.compact line 275 char 38',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(0n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(key_1),
                                                                                                         alignment: _descriptor_4.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
          },
          [Symbol.iterator](...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_1.length}`);
            }
            const self_0 = state.asArray()[2].asArray()[0].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                                         alignment: _descriptor_2.alignment() });
            return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_4.fromValue(key.value),      _descriptor_7.fromValue(value.value)    ];  })[Symbol.iterator]();
          }
        }
      }
    },
    terminationFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 294 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(1n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 294 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        if (state.asArray()[2].asArray()[1].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                          alignment: _descriptor_2.alignment() }) === undefined) {
          throw new __compactRuntime.CompactError(`Map value undefined for ${key_0}`);
        }
        return {
          isEmpty(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                     alignment: _descriptor_8.alignment() }).encode() } },
                                                                              'eq',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          size(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          member(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('member',
                                         'argument 1',
                                         'payroll.compact line 294 char 45',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(key_1),
                                                                                                                                     alignment: _descriptor_4.alignment() }).encode() } },
                                                                              'member',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          lookup(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('lookup',
                                         'argument 1',
                                         'payroll.compact line 294 char 45',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(1n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(key_1),
                                                                                                         alignment: _descriptor_4.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
          },
          [Symbol.iterator](...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_1.length}`);
            }
            const self_0 = state.asArray()[2].asArray()[1].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                                         alignment: _descriptor_2.alignment() });
            return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_4.fromValue(key.value),      _descriptor_0.fromValue(value.value)    ];  })[Symbol.iterator]();
          }
        }
      }
    },
    fileRoundFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 307 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 307 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[2].asArray()[2];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_2.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    employerFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(3n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(3n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 329 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(3n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 329 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(3n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[2].asArray()[3];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_1.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get coinsReceived() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(4n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    coinOrdinalFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(5n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(5n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 347 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(5n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 347 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        if (state.asArray()[2].asArray()[5].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                          alignment: _descriptor_2.alignment() }) === undefined) {
          throw new __compactRuntime.CompactError(`Map value undefined for ${key_0}`);
        }
        return {
          isEmpty(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(5n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                     alignment: _descriptor_8.alignment() }).encode() } },
                                                                              'eq',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          size(...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_1.length}`);
            }
            return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(5n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              'size',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          member(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('member',
                                         'argument 1',
                                         'payroll.compact line 347 char 45',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(5n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { push: { storage: false,
                                                                                        value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(key_1),
                                                                                                                                     alignment: _descriptor_4.alignment() }).encode() } },
                                                                              'member',
                                                                              { popeq: { cached: true,
                                                                                         result: undefined } }]).value);
          },
          lookup(...args_1) {
            if (args_1.length !== 1) {
              throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_1.length}`);
            }
            const key_1 = args_1[0];
            if (!(typeof(key_1) === 'bigint' && key_1 >= 0n && key_1 <= 255n)) {
              __compactRuntime.typeError('lookup',
                                         'argument 1',
                                         'payroll.compact line 347 char 45',
                                         'Uint<0..256>',
                                         key_1)
            }
            return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(2n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(5n),
                                                                                                         alignment: _descriptor_4.alignment() } },
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_2.toValue(key_0),
                                                                                                         alignment: _descriptor_2.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_4.toValue(key_1),
                                                                                                         alignment: _descriptor_4.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
          },
          [Symbol.iterator](...args_1) {
            if (args_1.length !== 0) {
              throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_1.length}`);
            }
            const self_0 = state.asArray()[2].asArray()[5].asMap().get({ value: _descriptor_2.toValue(key_0),
                                                                         alignment: _descriptor_2.alignment() });
            return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_4.fromValue(key.value),      _descriptor_2.fromValue(value.value)    ];  })[Symbol.iterator]();
          }
        }
      }
    },
    get payToken() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(6n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get payTokenSet() {
      return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(7n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get taxPool() {
      return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(8n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get socialPool() {
      return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(9n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get taxRemitted() {
      return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(10n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get socialRemitted() {
      return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(2n),
                                                                                                   alignment: _descriptor_4.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_4.toValue(11n),
                                                                                                   alignment: _descriptor_4.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    withheldFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(12n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(12n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 374 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(12n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 374 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(12n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[2].asArray()[12];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_7.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    taxCoinFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(13n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(13n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 378 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(13n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 378 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(13n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[2].asArray()[13];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_2.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    socialCoinFor: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(14n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(0n),
                                                                                                                                 alignment: _descriptor_8.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_8.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(14n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'payroll.compact line 379 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(14n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 4294967295n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'payroll.compact line 379 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(2n),
                                                                                                     alignment: _descriptor_4.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_4.toValue(14n),
                                                                                                     alignment: _descriptor_4.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[2].asArray()[14];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_2.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({ });
export const pureCircuits = {
  bandsFor: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`bandsFor: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const gross_0 = args_0[0];
    const threshold1_0 = args_0[1];
    const threshold2_0 = args_0[2];
    if (!(typeof(gross_0) === 'bigint' && gross_0 >= 0n && gross_0 <= 1152921504606846975n)) {
      __compactRuntime.typeError('bandsFor',
                                 'argument 1',
                                 'payroll.compact line 1367 char 1',
                                 'Uint<0..1152921504606846976>',
                                 gross_0)
    }
    if (!(typeof(threshold1_0) === 'bigint' && threshold1_0 >= 0n && threshold1_0 <= 1152921504606846975n)) {
      __compactRuntime.typeError('bandsFor',
                                 'argument 2',
                                 'payroll.compact line 1367 char 1',
                                 'Uint<0..1152921504606846976>',
                                 threshold1_0)
    }
    if (!(typeof(threshold2_0) === 'bigint' && threshold2_0 >= 0n && threshold2_0 <= 1152921504606846975n)) {
      __compactRuntime.typeError('bandsFor',
                                 'argument 3',
                                 'payroll.compact line 1367 char 1',
                                 'Uint<0..1152921504606846976>',
                                 threshold2_0)
    }
    return _dummyContract._bandsFor_0(gross_0, threshold1_0, threshold2_0);
  },
  terminationCommitment: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`terminationCommitment: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const finalPeriod_0 = args_0[0];
    const monthsWorked_0 = args_0[1];
    const nonce_0 = args_0[2];
    if (!(typeof(finalPeriod_0) === 'bigint' && finalPeriod_0 >= 0n && finalPeriod_0 <= 4294967295n)) {
      __compactRuntime.typeError('terminationCommitment',
                                 'argument 1',
                                 'payroll.compact line 1383 char 1',
                                 'Uint<0..4294967296>',
                                 finalPeriod_0)
    }
    if (!(typeof(monthsWorked_0) === 'bigint' && monthsWorked_0 >= 0n && monthsWorked_0 <= 65535n)) {
      __compactRuntime.typeError('terminationCommitment',
                                 'argument 2',
                                 'payroll.compact line 1383 char 1',
                                 'Uint<0..65536>',
                                 monthsWorked_0)
    }
    if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
      __compactRuntime.typeError('terminationCommitment',
                                 'argument 3',
                                 'payroll.compact line 1383 char 1',
                                 'Bytes<32>',
                                 nonce_0)
    }
    return _dummyContract._terminationCommitment_0(finalPeriod_0,
                                                   monthsWorked_0,
                                                   nonce_0);
  },
  payeeHash: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`payeeHash: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const payee_0 = args_0[0];
    const period_0 = args_0[1];
    const instance_0 = args_0[2];
    if (!(typeof(payee_0) === 'object' && payee_0.bytes.buffer instanceof ArrayBuffer && payee_0.bytes.BYTES_PER_ELEMENT === 1 && payee_0.bytes.length === 32)) {
      __compactRuntime.typeError('payeeHash',
                                 'argument 1',
                                 'payroll.compact line 1401 char 1',
                                 'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                 payee_0)
    }
    if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
      __compactRuntime.typeError('payeeHash',
                                 'argument 2',
                                 'payroll.compact line 1401 char 1',
                                 'Uint<0..4294967296>',
                                 period_0)
    }
    if (!(instance_0.buffer instanceof ArrayBuffer && instance_0.BYTES_PER_ELEMENT === 1 && instance_0.length === 32)) {
      __compactRuntime.typeError('payeeHash',
                                 'argument 3',
                                 'payroll.compact line 1401 char 1',
                                 'Bytes<32>',
                                 instance_0)
    }
    return _dummyContract._payeeHash_0(payee_0, period_0, instance_0);
  },
  commitmentFor: (...args_0) => {
    if (args_0.length !== 9) {
      throw new __compactRuntime.CompactError(`commitmentFor: expected 9 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const gross_0 = args_0[0];
    const tax_0 = args_0[1];
    const social_0 = args_0[2];
    const net_0 = args_0[3];
    const weeks_0 = args_0[4];
    const period_0 = args_0[5];
    const employer_0 = args_0[6];
    const paramsHash_0 = args_0[7];
    const nonce_0 = args_0[8];
    if (!(typeof(gross_0) === 'bigint' && gross_0 >= 0n && gross_0 <= 1152921504606846975n)) {
      __compactRuntime.typeError('commitmentFor',
                                 'argument 1',
                                 'payroll.compact line 1415 char 1',
                                 'Uint<0..1152921504606846976>',
                                 gross_0)
    }
    if (!(typeof(tax_0) === 'bigint' && tax_0 >= 0n && tax_0 <= 1152921504606846975n)) {
      __compactRuntime.typeError('commitmentFor',
                                 'argument 2',
                                 'payroll.compact line 1415 char 1',
                                 'Uint<0..1152921504606846976>',
                                 tax_0)
    }
    if (!(typeof(social_0) === 'bigint' && social_0 >= 0n && social_0 <= 1152921504606846975n)) {
      __compactRuntime.typeError('commitmentFor',
                                 'argument 3',
                                 'payroll.compact line 1415 char 1',
                                 'Uint<0..1152921504606846976>',
                                 social_0)
    }
    if (!(typeof(net_0) === 'bigint' && net_0 >= 0n && net_0 <= 1152921504606846975n)) {
      __compactRuntime.typeError('commitmentFor',
                                 'argument 4',
                                 'payroll.compact line 1415 char 1',
                                 'Uint<0..1152921504606846976>',
                                 net_0)
    }
    if (!(typeof(weeks_0) === 'bigint' && weeks_0 >= 0n && weeks_0 <= 255n)) {
      __compactRuntime.typeError('commitmentFor',
                                 'argument 5',
                                 'payroll.compact line 1415 char 1',
                                 'Uint<0..256>',
                                 weeks_0)
    }
    if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
      __compactRuntime.typeError('commitmentFor',
                                 'argument 6',
                                 'payroll.compact line 1415 char 1',
                                 'Uint<0..4294967296>',
                                 period_0)
    }
    if (!(typeof(employer_0) === 'object' && employer_0.bytes.buffer instanceof ArrayBuffer && employer_0.bytes.BYTES_PER_ELEMENT === 1 && employer_0.bytes.length === 32)) {
      __compactRuntime.typeError('commitmentFor',
                                 'argument 7',
                                 'payroll.compact line 1415 char 1',
                                 'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                 employer_0)
    }
    if (!(paramsHash_0.buffer instanceof ArrayBuffer && paramsHash_0.BYTES_PER_ELEMENT === 1 && paramsHash_0.length === 32)) {
      __compactRuntime.typeError('commitmentFor',
                                 'argument 8',
                                 'payroll.compact line 1415 char 1',
                                 'Bytes<32>',
                                 paramsHash_0)
    }
    if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
      __compactRuntime.typeError('commitmentFor',
                                 'argument 9',
                                 'payroll.compact line 1415 char 1',
                                 'Bytes<32>',
                                 nonce_0)
    }
    return _dummyContract._commitmentFor_0(gross_0,
                                           tax_0,
                                           social_0,
                                           net_0,
                                           weeks_0,
                                           period_0,
                                           employer_0,
                                           paramsHash_0,
                                           nonce_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
