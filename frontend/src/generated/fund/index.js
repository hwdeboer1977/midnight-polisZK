import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(1152921504606846975n, 8);

class _TaxParams_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment()))))))));
  }
  fromValue(value_0) {
    return {
      version: _descriptor_0.fromValue(value_0),
      validFrom: _descriptor_1.fromValue(value_0),
      threshold1: _descriptor_2.fromValue(value_0),
      threshold2: _descriptor_2.fromValue(value_0),
      rate1: _descriptor_0.fromValue(value_0),
      rate2: _descriptor_0.fromValue(value_0),
      rate3: _descriptor_0.fromValue(value_0),
      maxContribBase: _descriptor_2.fromValue(value_0),
      contribRate: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.version).concat(_descriptor_1.toValue(value_0.validFrom).concat(_descriptor_2.toValue(value_0.threshold1).concat(_descriptor_2.toValue(value_0.threshold2).concat(_descriptor_0.toValue(value_0.rate1).concat(_descriptor_0.toValue(value_0.rate2).concat(_descriptor_0.toValue(value_0.rate3).concat(_descriptor_2.toValue(value_0.maxContribBase).concat(_descriptor_0.toValue(value_0.contribRate)))))))));
  }
}

const _descriptor_3 = new _TaxParams_0();

const _descriptor_4 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_5 = __compactRuntime.CompactTypeField;

class _MerkleTreeDigest_0 {
  alignment() {
    return _descriptor_5.alignment();
  }
  fromValue(value_0) {
    return {
      field: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0.field);
  }
}

const _descriptor_6 = new _MerkleTreeDigest_0();

const _descriptor_7 = __compactRuntime.CompactTypeBoolean;

class _MerkleTreePathEntry_0 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_7.alignment());
  }
  fromValue(value_0) {
    return {
      sibling: _descriptor_6.fromValue(value_0),
      goes_left: _descriptor_7.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.sibling).concat(_descriptor_7.toValue(value_0.goes_left));
  }
}

const _descriptor_8 = new _MerkleTreePathEntry_0();

const _descriptor_9 = new __compactRuntime.CompactTypeVector(16, _descriptor_8);

class _MerkleTreePath_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_9.alignment());
  }
  fromValue(value_0) {
    return {
      leaf: _descriptor_4.fromValue(value_0),
      path: _descriptor_9.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.leaf).concat(_descriptor_9.toValue(value_0.path));
  }
}

const _descriptor_10 = new _MerkleTreePath_0();

class _ClaimLeaf_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_4.alignment())))));
  }
  fromValue(value_0) {
    return {
      commitment: _descriptor_4.fromValue(value_0),
      payeeBinding: _descriptor_4.fromValue(value_0),
      claimKeyHash: _descriptor_4.fromValue(value_0),
      finalPeriod: _descriptor_1.fromValue(value_0),
      monthsWorked: _descriptor_0.fromValue(value_0),
      instance: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.commitment).concat(_descriptor_4.toValue(value_0.payeeBinding).concat(_descriptor_4.toValue(value_0.claimKeyHash).concat(_descriptor_1.toValue(value_0.finalPeriod).concat(_descriptor_0.toValue(value_0.monthsWorked).concat(_descriptor_4.toValue(value_0.instance))))));
  }
}

const _descriptor_11 = new _ClaimLeaf_0();

const _descriptor_12 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _ZswapCoinPublicKey_0 {
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

const _descriptor_13 = new _ZswapCoinPublicKey_0();

const _descriptor_14 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _QualifiedShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_14.alignment().concat(_descriptor_12.alignment())));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_4.fromValue(value_0),
      color: _descriptor_4.fromValue(value_0),
      value: _descriptor_14.fromValue(value_0),
      mt_index: _descriptor_12.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.nonce).concat(_descriptor_4.toValue(value_0.color).concat(_descriptor_14.toValue(value_0.value).concat(_descriptor_12.toValue(value_0.mt_index))));
  }
}

const _descriptor_15 = new _QualifiedShieldedCoinInfo_0();

class _ShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_14.alignment()));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_4.fromValue(value_0),
      color: _descriptor_4.fromValue(value_0),
      value: _descriptor_14.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.nonce).concat(_descriptor_4.toValue(value_0.color).concat(_descriptor_14.toValue(value_0.value)));
  }
}

const _descriptor_16 = new _ShieldedCoinInfo_0();

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

const _descriptor_17 = new _ContractAddress_0();

const _descriptor_18 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

class _BenefitParams_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))));
  }
  fromValue(value_0) {
    return {
      version: _descriptor_0.fromValue(value_0),
      validFrom: _descriptor_1.fromValue(value_0),
      maxMonthlyGross: _descriptor_2.fromValue(value_0),
      rate: _descriptor_0.fromValue(value_0),
      minMonths: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.version).concat(_descriptor_1.toValue(value_0.validFrom).concat(_descriptor_2.toValue(value_0.maxMonthlyGross).concat(_descriptor_0.toValue(value_0.rate).concat(_descriptor_0.toValue(value_0.minMonths)))));
  }
}

const _descriptor_19 = new _BenefitParams_0();

class _Either_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_13.alignment().concat(_descriptor_17.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_7.fromValue(value_0),
      left: _descriptor_13.fromValue(value_0),
      right: _descriptor_17.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_left).concat(_descriptor_13.toValue(value_0.left).concat(_descriptor_17.toValue(value_0.right)));
  }
}

const _descriptor_20 = new _Either_0();

const _descriptor_21 = new __compactRuntime.CompactTypeBytes(21);

class _CoinPreimage_0 {
  alignment() {
    return _descriptor_21.alignment().concat(_descriptor_16.alignment().concat(_descriptor_7.alignment().concat(_descriptor_4.alignment())));
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_21.fromValue(value_0),
      info: _descriptor_16.fromValue(value_0),
      dataType: _descriptor_7.fromValue(value_0),
      data: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_21.toValue(value_0.domain_sep).concat(_descriptor_16.toValue(value_0.info).concat(_descriptor_7.toValue(value_0.dataType).concat(_descriptor_4.toValue(value_0.data))));
  }
}

const _descriptor_22 = new _CoinPreimage_0();

class _PayrollCommitment_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_18.alignment().concat(_descriptor_1.alignment().concat(_descriptor_13.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment()))))))));
  }
  fromValue(value_0) {
    return {
      gross: _descriptor_2.fromValue(value_0),
      tax: _descriptor_2.fromValue(value_0),
      social: _descriptor_2.fromValue(value_0),
      net: _descriptor_2.fromValue(value_0),
      weeks: _descriptor_18.fromValue(value_0),
      period: _descriptor_1.fromValue(value_0),
      employer: _descriptor_13.fromValue(value_0),
      paramsHash: _descriptor_4.fromValue(value_0),
      nonce: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.gross).concat(_descriptor_2.toValue(value_0.tax).concat(_descriptor_2.toValue(value_0.social).concat(_descriptor_2.toValue(value_0.net).concat(_descriptor_18.toValue(value_0.weeks).concat(_descriptor_1.toValue(value_0.period).concat(_descriptor_13.toValue(value_0.employer).concat(_descriptor_4.toValue(value_0.paramsHash).concat(_descriptor_4.toValue(value_0.nonce)))))))));
  }
}

const _descriptor_23 = new _PayrollCommitment_0();

class _PayeeBinding_0 {
  alignment() {
    return _descriptor_13.alignment().concat(_descriptor_1.alignment().concat(_descriptor_4.alignment()));
  }
  fromValue(value_0) {
    return {
      payee: _descriptor_13.fromValue(value_0),
      period: _descriptor_1.fromValue(value_0),
      instance: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_13.toValue(value_0.payee).concat(_descriptor_1.toValue(value_0.period).concat(_descriptor_4.toValue(value_0.instance)));
  }
}

const _descriptor_24 = new _PayeeBinding_0();

class _RootAuthorSlot_0 {
  alignment() {
    return _descriptor_13.alignment().concat(_descriptor_1.alignment().concat(_descriptor_5.alignment()));
  }
  fromValue(value_0) {
    return {
      author: _descriptor_13.fromValue(value_0),
      period: _descriptor_1.fromValue(value_0),
      root: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_13.toValue(value_0.author).concat(_descriptor_1.toValue(value_0.period).concat(_descriptor_5.toValue(value_0.root)));
  }
}

const _descriptor_25 = new _RootAuthorSlot_0();

class _ClaimNullifier_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_1.alignment().concat(_descriptor_4.alignment()));
  }
  fromValue(value_0) {
    return {
      claimKey: _descriptor_4.fromValue(value_0),
      window: _descriptor_1.fromValue(value_0),
      fund: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.claimKey).concat(_descriptor_1.toValue(value_0.window).concat(_descriptor_4.toValue(value_0.fund)));
  }
}

const _descriptor_26 = new _ClaimNullifier_0();

const _descriptor_27 = new __compactRuntime.CompactTypeVector(2, _descriptor_5);

class _Maybe_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_16.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_7.fromValue(value_0),
      value: _descriptor_16.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_some).concat(_descriptor_16.toValue(value_0.value));
  }
}

const _descriptor_28 = new _Maybe_0();

class _ShieldedSendResult_0 {
  alignment() {
    return _descriptor_28.alignment().concat(_descriptor_16.alignment());
  }
  fromValue(value_0) {
    return {
      change: _descriptor_28.fromValue(value_0),
      sent: _descriptor_16.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_28.toValue(value_0.change).concat(_descriptor_16.toValue(value_0.sent));
  }
}

const _descriptor_29 = new _ShieldedSendResult_0();

class _Either_1 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_7.fromValue(value_0),
      left: _descriptor_4.fromValue(value_0),
      right: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_left).concat(_descriptor_4.toValue(value_0.left).concat(_descriptor_4.toValue(value_0.right)));
  }
}

const _descriptor_30 = new _Either_1();

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
      publishParams: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`publishParams: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const params_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishParams',
                                     'argument 1 (as invoked from Typescript)',
                                     'fund.compact line 232 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(params_0) === 'object' && typeof(params_0.version) === 'bigint' && params_0.version >= 0n && params_0.version <= 65535n && typeof(params_0.validFrom) === 'bigint' && params_0.validFrom >= 0n && params_0.validFrom <= 4294967295n && typeof(params_0.maxMonthlyGross) === 'bigint' && params_0.maxMonthlyGross >= 0n && params_0.maxMonthlyGross <= 1152921504606846975n && typeof(params_0.rate) === 'bigint' && params_0.rate >= 0n && params_0.rate <= 65535n && typeof(params_0.minMonths) === 'bigint' && params_0.minMonths >= 0n && params_0.minMonths <= 65535n)) {
          __compactRuntime.typeError('publishParams',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'fund.compact line 232 char 1',
                                     'struct BenefitParams<version: Uint<0..65536>, validFrom: Uint<0..4294967296>, maxMonthlyGross: Uint<0..1152921504606846976>, rate: Uint<0..65536>, minMonths: Uint<0..65536>>',
                                     params_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_19.toValue(params_0),
            alignment: _descriptor_19.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._publishParams_0(context,
                                               partialProofData,
                                               params_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      publishRoot: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`publishRoot: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const period_0 = args_1[1];
        const root_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('publishRoot',
                                     'argument 1 (as invoked from Typescript)',
                                     'fund.compact line 247 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(period_0) === 'bigint' && period_0 >= 0n && period_0 <= 4294967295n)) {
          __compactRuntime.typeError('publishRoot',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'fund.compact line 247 char 1',
                                     'Uint<0..4294967296>',
                                     period_0)
        }
        if (!(typeof(root_0) === 'bigint' && root_0 >= 0 && root_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('publishRoot',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'fund.compact line 247 char 1',
                                     'Field',
                                     root_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(period_0).concat(_descriptor_5.toValue(root_0)),
            alignment: _descriptor_1.alignment().concat(_descriptor_5.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._publishRoot_0(context,
                                             partialProofData,
                                             period_0,
                                             root_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      fundBenefits: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`fundBenefits: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const coin_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('fundBenefits',
                                     'argument 1 (as invoked from Typescript)',
                                     'fund.compact line 272 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('fundBenefits',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'fund.compact line 272 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     coin_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_16.toValue(coin_0),
            alignment: _descriptor_16.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._fundBenefits_0(context, partialProofData, coin_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      claim: (...args_1) => {
        if (args_1.length !== 19) {
          throw new __compactRuntime.CompactError(`claim: expected 19 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const path_0 = args_1[1];
        const leaf_0 = args_1[2];
        const gross_0 = args_1[3];
        const tax_0 = args_1[4];
        const social_0 = args_1[5];
        const net_0 = args_1[6];
        const weeks_0 = args_1[7];
        const employer_0 = args_1[8];
        const payrollParamsHash_0 = args_1[9];
        const nonce_0 = args_1[10];
        const claimKey_0 = args_1[11];
        const window_0 = args_1[12];
        const params_0 = args_1[13];
        const taxParams_0 = args_1[14];
        const benefitQ_0 = args_1[15];
        const benefitTaxQ_0 = args_1[16];
        const benefitSocialQ_0 = args_1[17];
        const coin_0 = args_1[18];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('claim',
                                     'argument 1 (as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(path_0) === 'object' && path_0.leaf.buffer instanceof ArrayBuffer && path_0.leaf.BYTES_PER_ELEMENT === 1 && path_0.leaf.length === 32 && Array.isArray(path_0.path) && path_0.path.length === 16 && path_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
          __compactRuntime.typeError('claim',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<16, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                     path_0)
        }
        if (!(typeof(leaf_0) === 'object' && leaf_0.commitment.buffer instanceof ArrayBuffer && leaf_0.commitment.BYTES_PER_ELEMENT === 1 && leaf_0.commitment.length === 32 && leaf_0.payeeBinding.buffer instanceof ArrayBuffer && leaf_0.payeeBinding.BYTES_PER_ELEMENT === 1 && leaf_0.payeeBinding.length === 32 && leaf_0.claimKeyHash.buffer instanceof ArrayBuffer && leaf_0.claimKeyHash.BYTES_PER_ELEMENT === 1 && leaf_0.claimKeyHash.length === 32 && typeof(leaf_0.finalPeriod) === 'bigint' && leaf_0.finalPeriod >= 0n && leaf_0.finalPeriod <= 4294967295n && typeof(leaf_0.monthsWorked) === 'bigint' && leaf_0.monthsWorked >= 0n && leaf_0.monthsWorked <= 65535n && leaf_0.instance.buffer instanceof ArrayBuffer && leaf_0.instance.BYTES_PER_ELEMENT === 1 && leaf_0.instance.length === 32)) {
          __compactRuntime.typeError('claim',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'struct ClaimLeaf<commitment: Bytes<32>, payeeBinding: Bytes<32>, claimKeyHash: Bytes<32>, finalPeriod: Uint<0..4294967296>, monthsWorked: Uint<0..65536>, instance: Bytes<32>>',
                                     leaf_0)
        }
        if (!(typeof(gross_0) === 'bigint' && gross_0 >= 0n && gross_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('claim',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Uint<0..1152921504606846976>',
                                     gross_0)
        }
        if (!(typeof(tax_0) === 'bigint' && tax_0 >= 0n && tax_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('claim',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Uint<0..1152921504606846976>',
                                     tax_0)
        }
        if (!(typeof(social_0) === 'bigint' && social_0 >= 0n && social_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('claim',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Uint<0..1152921504606846976>',
                                     social_0)
        }
        if (!(typeof(net_0) === 'bigint' && net_0 >= 0n && net_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('claim',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Uint<0..1152921504606846976>',
                                     net_0)
        }
        if (!(typeof(weeks_0) === 'bigint' && weeks_0 >= 0n && weeks_0 <= 255n)) {
          __compactRuntime.typeError('claim',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Uint<0..256>',
                                     weeks_0)
        }
        if (!(typeof(employer_0) === 'object' && employer_0.bytes.buffer instanceof ArrayBuffer && employer_0.bytes.BYTES_PER_ELEMENT === 1 && employer_0.bytes.length === 32)) {
          __compactRuntime.typeError('claim',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                     employer_0)
        }
        if (!(payrollParamsHash_0.buffer instanceof ArrayBuffer && payrollParamsHash_0.BYTES_PER_ELEMENT === 1 && payrollParamsHash_0.length === 32)) {
          __compactRuntime.typeError('claim',
                                     'argument 9 (argument 10 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Bytes<32>',
                                     payrollParamsHash_0)
        }
        if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
          __compactRuntime.typeError('claim',
                                     'argument 10 (argument 11 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Bytes<32>',
                                     nonce_0)
        }
        if (!(claimKey_0.buffer instanceof ArrayBuffer && claimKey_0.BYTES_PER_ELEMENT === 1 && claimKey_0.length === 32)) {
          __compactRuntime.typeError('claim',
                                     'argument 11 (argument 12 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Bytes<32>',
                                     claimKey_0)
        }
        if (!(typeof(window_0) === 'bigint' && window_0 >= 0n && window_0 <= 4294967295n)) {
          __compactRuntime.typeError('claim',
                                     'argument 12 (argument 13 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Uint<0..4294967296>',
                                     window_0)
        }
        if (!(typeof(params_0) === 'object' && typeof(params_0.version) === 'bigint' && params_0.version >= 0n && params_0.version <= 65535n && typeof(params_0.validFrom) === 'bigint' && params_0.validFrom >= 0n && params_0.validFrom <= 4294967295n && typeof(params_0.maxMonthlyGross) === 'bigint' && params_0.maxMonthlyGross >= 0n && params_0.maxMonthlyGross <= 1152921504606846975n && typeof(params_0.rate) === 'bigint' && params_0.rate >= 0n && params_0.rate <= 65535n && typeof(params_0.minMonths) === 'bigint' && params_0.minMonths >= 0n && params_0.minMonths <= 65535n)) {
          __compactRuntime.typeError('claim',
                                     'argument 13 (argument 14 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'struct BenefitParams<version: Uint<0..65536>, validFrom: Uint<0..4294967296>, maxMonthlyGross: Uint<0..1152921504606846976>, rate: Uint<0..65536>, minMonths: Uint<0..65536>>',
                                     params_0)
        }
        if (!(typeof(taxParams_0) === 'object' && typeof(taxParams_0.version) === 'bigint' && taxParams_0.version >= 0n && taxParams_0.version <= 65535n && typeof(taxParams_0.validFrom) === 'bigint' && taxParams_0.validFrom >= 0n && taxParams_0.validFrom <= 4294967295n && typeof(taxParams_0.threshold1) === 'bigint' && taxParams_0.threshold1 >= 0n && taxParams_0.threshold1 <= 1152921504606846975n && typeof(taxParams_0.threshold2) === 'bigint' && taxParams_0.threshold2 >= 0n && taxParams_0.threshold2 <= 1152921504606846975n && typeof(taxParams_0.rate1) === 'bigint' && taxParams_0.rate1 >= 0n && taxParams_0.rate1 <= 65535n && typeof(taxParams_0.rate2) === 'bigint' && taxParams_0.rate2 >= 0n && taxParams_0.rate2 <= 65535n && typeof(taxParams_0.rate3) === 'bigint' && taxParams_0.rate3 >= 0n && taxParams_0.rate3 <= 65535n && typeof(taxParams_0.maxContribBase) === 'bigint' && taxParams_0.maxContribBase >= 0n && taxParams_0.maxContribBase <= 1152921504606846975n && typeof(taxParams_0.contribRate) === 'bigint' && taxParams_0.contribRate >= 0n && taxParams_0.contribRate <= 65535n)) {
          __compactRuntime.typeError('claim',
                                     'argument 14 (argument 15 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'struct TaxParams<version: Uint<0..65536>, validFrom: Uint<0..4294967296>, threshold1: Uint<0..1152921504606846976>, threshold2: Uint<0..1152921504606846976>, rate1: Uint<0..65536>, rate2: Uint<0..65536>, rate3: Uint<0..65536>, maxContribBase: Uint<0..1152921504606846976>, contribRate: Uint<0..65536>>',
                                     taxParams_0)
        }
        if (!(typeof(benefitQ_0) === 'bigint' && benefitQ_0 >= 0n && benefitQ_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('claim',
                                     'argument 15 (argument 16 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Uint<0..1152921504606846976>',
                                     benefitQ_0)
        }
        if (!(typeof(benefitTaxQ_0) === 'bigint' && benefitTaxQ_0 >= 0n && benefitTaxQ_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('claim',
                                     'argument 16 (argument 17 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Uint<0..1152921504606846976>',
                                     benefitTaxQ_0)
        }
        if (!(typeof(benefitSocialQ_0) === 'bigint' && benefitSocialQ_0 >= 0n && benefitSocialQ_0 <= 1152921504606846975n)) {
          __compactRuntime.typeError('claim',
                                     'argument 17 (argument 18 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'Uint<0..1152921504606846976>',
                                     benefitSocialQ_0)
        }
        if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n && typeof(coin_0.mt_index) === 'bigint' && coin_0.mt_index >= 0n && coin_0.mt_index <= 18446744073709551615n)) {
          __compactRuntime.typeError('claim',
                                     'argument 18 (argument 19 as invoked from Typescript)',
                                     'fund.compact line 303 char 1',
                                     'struct QualifiedShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>, mt_index: Uint<0..18446744073709551616>>',
                                     coin_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_10.toValue(path_0).concat(_descriptor_11.toValue(leaf_0).concat(_descriptor_2.toValue(gross_0).concat(_descriptor_2.toValue(tax_0).concat(_descriptor_2.toValue(social_0).concat(_descriptor_2.toValue(net_0).concat(_descriptor_18.toValue(weeks_0).concat(_descriptor_13.toValue(employer_0).concat(_descriptor_4.toValue(payrollParamsHash_0).concat(_descriptor_4.toValue(nonce_0).concat(_descriptor_4.toValue(claimKey_0).concat(_descriptor_1.toValue(window_0).concat(_descriptor_19.toValue(params_0).concat(_descriptor_3.toValue(taxParams_0).concat(_descriptor_2.toValue(benefitQ_0).concat(_descriptor_2.toValue(benefitTaxQ_0).concat(_descriptor_2.toValue(benefitSocialQ_0).concat(_descriptor_15.toValue(coin_0)))))))))))))))))),
            alignment: _descriptor_10.alignment().concat(_descriptor_11.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_18.alignment().concat(_descriptor_13.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_1.alignment().concat(_descriptor_19.alignment().concat(_descriptor_3.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_15.alignment())))))))))))))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._claim_0(context,
                                       partialProofData,
                                       path_0,
                                       leaf_0,
                                       gross_0,
                                       tax_0,
                                       social_0,
                                       net_0,
                                       weeks_0,
                                       employer_0,
                                       payrollParamsHash_0,
                                       nonce_0,
                                       claimKey_0,
                                       window_0,
                                       params_0,
                                       taxParams_0,
                                       benefitQ_0,
                                       benefitTaxQ_0,
                                       benefitSocialQ_0,
                                       coin_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      remitBenefitTax: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`remitBenefitTax: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const coin_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('remitBenefitTax',
                                     'argument 1 (as invoked from Typescript)',
                                     'fund.compact line 506 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n && typeof(coin_0.mt_index) === 'bigint' && coin_0.mt_index >= 0n && coin_0.mt_index <= 18446744073709551615n)) {
          __compactRuntime.typeError('remitBenefitTax',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'fund.compact line 506 char 1',
                                     'struct QualifiedShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>, mt_index: Uint<0..18446744073709551616>>',
                                     coin_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_15.toValue(coin_0),
            alignment: _descriptor_15.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._remitBenefitTax_0(context,
                                                 partialProofData,
                                                 coin_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      remitBenefitSocial: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`remitBenefitSocial: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const coin_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('remitBenefitSocial',
                                     'argument 1 (as invoked from Typescript)',
                                     'fund.compact line 531 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(coin_0) === 'object' && coin_0.nonce.buffer instanceof ArrayBuffer && coin_0.nonce.BYTES_PER_ELEMENT === 1 && coin_0.nonce.length === 32 && coin_0.color.buffer instanceof ArrayBuffer && coin_0.color.BYTES_PER_ELEMENT === 1 && coin_0.color.length === 32 && typeof(coin_0.value) === 'bigint' && coin_0.value >= 0n && coin_0.value <= 340282366920938463463374607431768211455n && typeof(coin_0.mt_index) === 'bigint' && coin_0.mt_index >= 0n && coin_0.mt_index <= 18446744073709551615n)) {
          __compactRuntime.typeError('remitBenefitSocial',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'fund.compact line 531 char 1',
                                     'struct QualifiedShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>, mt_index: Uint<0..18446744073709551616>>',
                                     coin_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_15.toValue(coin_0),
            alignment: _descriptor_15.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._remitBenefitSocial_0(context,
                                                    partialProofData,
                                                    coin_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      leafDigest(context, ...args_1) {
        return { result: pureCircuits.leafDigest(...args_1), context };
      },
      treeLeaf(context, ...args_1) {
        return { result: pureCircuits.treeLeaf(...args_1), context };
      },
      treeNode(context, ...args_1) {
        return { result: pureCircuits.treeNode(...args_1), context };
      },
      pathRoot(context, ...args_1) {
        return { result: pureCircuits.pathRoot(...args_1), context };
      },
      taxParamsHash(context, ...args_1) {
        return { result: pureCircuits.taxParamsHash(...args_1), context };
      },
      claimKeyHash(context, ...args_1) {
        return { result: pureCircuits.claimKeyHash(...args_1), context };
      }
    };
    this.impureCircuits = {
      publishParams: this.circuits.publishParams,
      publishRoot: this.circuits.publishRoot,
      fundBenefits: this.circuits.fundBenefits,
      claim: this.circuits.claim,
      remitBenefitTax: this.circuits.remitBenefitTax,
      remitBenefitSocial: this.circuits.remitBenefitSocial
    };
    this.provableCircuits = {
      publishParams: this.circuits.publishParams,
      publishRoot: this.circuits.publishRoot,
      fundBenefits: this.circuits.fundBenefits,
      claim: this.circuits.claim,
      remitBenefitTax: this.circuits.remitBenefitTax,
      remitBenefitSocial: this.circuits.remitBenefitSocial
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
                                 'fund.compact line 217 char 1',
                                 'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                 taxTo_0)
    }
    if (!(typeof(socialTo_0) === 'object' && socialTo_0.bytes.buffer instanceof ArrayBuffer && socialTo_0.bytes.BYTES_PER_ELEMENT === 1 && socialTo_0.bytes.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'fund.compact line 217 char 1',
                                 'struct ZswapCoinPublicKey<bytes: Bytes<32>>',
                                 socialTo_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    let stateValue_2 = __compactRuntime.StateValue.newArray();
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
    state_0.setOperation('publishParams', new __compactRuntime.ContractOperation());
    state_0.setOperation('publishRoot', new __compactRuntime.ContractOperation());
    state_0.setOperation('fundBenefits', new __compactRuntime.ContractOperation());
    state_0.setOperation('claim', new __compactRuntime.ContractOperation());
    state_0.setOperation('remitBenefitTax', new __compactRuntime.ContractOperation());
    state_0.setOperation('remitBenefitSocial', new __compactRuntime.ContractOperation());
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
                                                         value: { value: _descriptor_18.toValue(0n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(0n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue({ bytes: new Uint8Array(32) }),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(0n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(1n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue({ bytes: new Uint8Array(32) }),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(0n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue({ bytes: new Uint8Array(32) }),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(1n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(2n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(3n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(4n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(5n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(6n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(0n),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(7n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(0n),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(8n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(0n),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(9n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(0n),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(10n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(0n),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(11n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(12n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(13n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(14n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(0n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(0n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(tmp_0),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(2n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(12n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(13n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_2),
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
                                                         value: { value: _descriptor_18.toValue(0n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(1n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(taxTo_0),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(0n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(socialTo_0),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(7n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_3),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(8n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_4),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(9n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_5),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(10n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_6),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
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
  _merkleTreePathRootNoLeafHash_0(path_0) {
    return { field:
               this._folder_0((...args_0) =>
                                this._merkleTreePathEntryRoot_0(...args_0),
                              this._degradeToTransient_0(path_0.leaf),
                              path_0.path) };
  }
  _merkleTreePathEntryRoot_0(recursiveDigest_0, entry_0) {
    const left_0 = entry_0.goes_left ? recursiveDigest_0 : entry_0.sibling.field;
    const right_0 = entry_0.goes_left ?
                    entry_0.sibling.field :
                    recursiveDigest_0;
    return this._transientHash_0([left_0, right_0]);
  }
  _receiveShielded_0(context, partialProofData, coin_0) {
    const recipient_0 = this._right_0(_descriptor_17.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                 partialProofData,
                                                                                                 [
                                                                                                  { dup: { n: 2 } },
                                                                                                  { idx: { cached: true,
                                                                                                           pushPath: false,
                                                                                                           path: [
                                                                                                                  { tag: 'value',
                                                                                                                    value: { value: _descriptor_18.toValue(0n),
                                                                                                                             alignment: _descriptor_18.alignment() } }] } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    return [];
  }
  _sendShielded_0(context, partialProofData, input_0, recipient_0, value_0) {
    const selfAddr_0 = _descriptor_17.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                  partialProofData,
                                                                                  [
                                                                                   { dup: { n: 2 } },
                                                                                   { idx: { cached: true,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_18.toValue(0n),
                                                                                                              alignment: _descriptor_18.alignment() } }] } },
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
                                                         value: { value: _descriptor_18.toValue(0n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
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
                                                         value: { value: _descriptor_18.toValue(2n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_1),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
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
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_2),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
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
                                                           value: { value: _descriptor_18.toValue(2n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(cm_0),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
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
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(cm_0),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
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
    return this._persistentHash_5({ domain_sep:
                                      new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 122, 115, 119, 97, 112, 45, 99, 99, 91, 118, 49, 93]),
                                    info: coin_0,
                                    dataType: recipient_0.is_left,
                                    data:
                                      recipient_0.is_left ?
                                      recipient_0.left.bytes :
                                      recipient_0.right.bytes });
  }
  _coinNullifier_0(coin_0, addr_0) {
    return this._persistentHash_5({ domain_sep:
                                      new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 122, 115, 119, 97, 112, 45, 99, 110, 91, 118, 49, 93]),
                                    info: coin_0,
                                    dataType: false,
                                    data: addr_0.bytes });
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_27, value_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_25, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_26, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_23, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_24, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_19, value_0);
    return result_0;
  }
  _persistentHash_5(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_22, value_0);
    return result_0;
  }
  _persistentHash_6(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_11, value_0);
    return result_0;
  }
  _persistentHash_7(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_3, value_0);
    return result_0;
  }
  _persistentHash_8(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_4, value_0);
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
      value: _descriptor_13.toValue(result_0),
      alignment: _descriptor_13.alignment()
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
  _publishParams_0(context, partialProofData, params_0) {
    __compactRuntime.assert(this._equal_2(this._ownPublicKey_0(context,
                                                               partialProofData),
                                          _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_18.toValue(0n),
                                                                                                                                 alignment: _descriptor_18.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_18.toValue(0n),
                                                                                                                                 alignment: _descriptor_18.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'only the platform may publish rules');
    const v_0 = params_0.version;
    __compactRuntime.assert(v_0 > 0n, 'version must be positive');
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_18.toValue(1n),
                                                                                                                   alignment: _descriptor_18.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_18.toValue(1n),
                                                                                                                   alignment: _descriptor_18.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(v_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'that version is already published');
    let t_0;
    __compactRuntime.assert((t_0 = params_0.rate, t_0 <= 10000n),
                            'rate cannot exceed 100%');
    let t_1;
    __compactRuntime.assert((t_1 = params_0.minMonths, t_1 > 0n),
                            'eligibility needs a minimum');
    const tmp_0 = this._persistentHash_4(params_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(v_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    if (v_0
        >
        _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                  partialProofData,
                                                                  [
                                                                   { dup: { n: 0 } },
                                                                   { idx: { cached: false,
                                                                            pushPath: false,
                                                                            path: [
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_18.toValue(1n),
                                                                                              alignment: _descriptor_18.alignment() } },
                                                                                   { tag: 'value',
                                                                                     value: { value: _descriptor_18.toValue(2n),
                                                                                              alignment: _descriptor_18.alignment() } }] } },
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
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(2n),
                                                                                                alignment: _descriptor_18.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(v_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    return [];
  }
  _publishRoot_0(context, partialProofData, period_0, root_0) {
    const p_0 = period_0;
    __compactRuntime.assert(p_0 >= 200001n, 'period must be YYYYMM');
    __compactRuntime.assert(p_0 <= 299912n, 'period must be YYYYMM');
    const author_0 = this._ownPublicKey_0(context, partialProofData);
    const slot_0 = this._persistentHash_0({ author: author_0,
                                            period: p_0,
                                            root: root_0 });
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_18.toValue(1n),
                                                                                                                   alignment: _descriptor_18.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_18.toValue(4n),
                                                                                                                   alignment: _descriptor_18.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(slot_0),
                                                                                                                                               alignment: _descriptor_4.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'you have already published that root');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(4n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(slot_0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(author_0),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    if (this._equal_3(author_0,
                      _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_18.toValue(0n),
                                                                                                             alignment: _descriptor_18.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_18.toValue(0n),
                                                                                                             alignment: _descriptor_18.alignment() } }] } },
                                                                                  { popeq: { cached: false,
                                                                                             result: undefined } }]).value)))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } },
                                                         { tag: 'value',
                                                           value: { value: _descriptor_18.toValue(3n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(p_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(root_0),
                                                                                                alignment: _descriptor_5.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 2 } }]);
    }
    return [];
  }
  _fundBenefits_0(context, partialProofData, coin_0) {
    if (!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                   partialProofData,
                                                                   [
                                                                    { dup: { n: 0 } },
                                                                    { idx: { cached: false,
                                                                             pushPath: false,
                                                                             path: [
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_18.toValue(1n),
                                                                                               alignment: _descriptor_18.alignment() } },
                                                                                    { tag: 'value',
                                                                                      value: { value: _descriptor_18.toValue(12n),
                                                                                               alignment: _descriptor_18.alignment() } }] } },
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
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(11n),
                                                                                                alignment: _descriptor_18.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_0),
                                                                                                alignment: _descriptor_4.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(12n),
                                                                                                alignment: _descriptor_18.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(true),
                                                                                                alignment: _descriptor_7.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    __compactRuntime.assert(this._equal_4(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_18.toValue(1n),
                                                                                                                                alignment: _descriptor_18.alignment() } },
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_18.toValue(11n),
                                                                                                                                alignment: _descriptor_18.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          coin_0.color),
                            'wrong token for this fund');
    this._receiveShielded_0(context, partialProofData, coin_0);
    const tmp_1 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                            partialProofData,
                                                                            [
                                                                             { dup: { n: 0 } },
                                                                             { idx: { cached: false,
                                                                                      pushPath: false,
                                                                                      path: [
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_18.toValue(1n),
                                                                                                        alignment: _descriptor_18.alignment() } },
                                                                                             { tag: 'value',
                                                                                               value: { value: _descriptor_18.toValue(13n),
                                                                                                        alignment: _descriptor_18.alignment() } }] } },
                                                                             { popeq: { cached: false,
                                                                                        result: undefined } }]).value);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(14n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_1),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_2 = ((t1) => {
                    if (t1 > 4294967295n) {
                      throw new __compactRuntime.CompactError('fund.compact line 281 char 19: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                    }
                    return t1;
                  })(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_18.toValue(1n),
                                                                                                           alignment: _descriptor_18.alignment() } },
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_18.toValue(13n),
                                                                                                           alignment: _descriptor_18.alignment() } }] } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(13n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_2),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _claim_0(context,
           partialProofData,
           path_0,
           leaf_0,
           gross_0,
           tax_0,
           social_0,
           net_0,
           weeks_0,
           employer_0,
           payrollParamsHash_0,
           nonce_0,
           claimKey_0,
           window_0,
           params_0,
           taxParams_0,
           benefitQ_0,
           benefitTaxQ_0,
           benefitSocialQ_0,
           coin_0)
  {
    const version_0 = params_0.version;
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(1n),
                                                                                                                  alignment: _descriptor_18.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(1n),
                                                                                                                  alignment: _descriptor_18.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(version_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no such rule set');
    __compactRuntime.assert(this._equal_5(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_18.toValue(1n),
                                                                                                                                alignment: _descriptor_18.alignment() } },
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_18.toValue(1n),
                                                                                                                                alignment: _descriptor_18.alignment() } }] } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_0.toValue(version_0),
                                                                                                                                alignment: _descriptor_0.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          this._persistentHash_4(params_0)),
                            'those are not the published rules for that version');
    const p_0 = leaf_0.finalPeriod;
    let t_0;
    __compactRuntime.assert((t_0 = params_0.validFrom, t_0 <= p_0),
                            'that rule set does not apply yet');
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(1n),
                                                                                                                  alignment: _descriptor_18.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(3n),
                                                                                                                  alignment: _descriptor_18.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(p_0),
                                                                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'no claim tree published for that period');
    __compactRuntime.assert(this._equal_6(path_0.leaf,
                                          this._persistentHash_6(leaf_0)),
                            'that leaf does not match what was supplied');
    __compactRuntime.assert(this._merkleTreePathRootNoLeafHash_0(path_0).field
                            ===
                            _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(1n),
                                                                                                                  alignment: _descriptor_18.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(3n),
                                                                                                                  alignment: _descriptor_18.alignment() } }] } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_1.toValue(p_0),
                                                                                                                  alignment: _descriptor_1.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'that leaf is not in the published claim tree for that period');
    let t_1;
    __compactRuntime.assert((t_1 = leaf_0.monthsWorked,
                             t_1 >= params_0.minMonths),
                            'not enough months of employment');
    __compactRuntime.assert(this._equal_7(leaf_0.payeeBinding,
                                          this._persistentHash_3({ payee:
                                                                     this._ownPublicKey_0(context,
                                                                                          partialProofData),
                                                                   period: p_0,
                                                                   instance:
                                                                     leaf_0.instance })),
                            'that leaf was not filed for this wallet');
    __compactRuntime.assert(this._equal_8(leaf_0.claimKeyHash,
                                          this._persistentHash_8(claimKey_0)),
                            'that claim key is not the one anchored for this claimant');
    __compactRuntime.assert(this._equal_9(leaf_0.commitment,
                                          this._persistentHash_2({ gross:
                                                                     gross_0,
                                                                   tax: tax_0,
                                                                   social:
                                                                     social_0,
                                                                   net: net_0,
                                                                   weeks:
                                                                     weeks_0,
                                                                   period: p_0,
                                                                   employer:
                                                                     employer_0,
                                                                   paramsHash:
                                                                     payrollParamsHash_0,
                                                                   nonce:
                                                                     nonce_0 })),
                            "the figures do not open that month's commitment");
    const capped_0 = gross_0 < params_0.maxMonthlyGross ?
                     gross_0 :
                     params_0.maxMonthlyGross;
    const numerator_0 = capped_0 * params_0.rate;
    let t_2;
    __compactRuntime.assert((t_2 = benefitQ_0 * 10000n, t_2 <= numerator_0),
                            'benefit quotient too small');
    __compactRuntime.assert(numerator_0 < (benefitQ_0 + 1n) * 10000n,
                            'benefit quotient too large');
    __compactRuntime.assert(benefitQ_0 > 0n, 'the benefit rounds to nothing');
    __compactRuntime.assert(this._equal_10(this._persistentHash_7(taxParams_0),
                                           payrollParamsHash_0),
                            'those are not the tax rules the final month was filed under');
    const t1_0 = taxParams_0.threshold1;
    const t2_0 = taxParams_0.threshold2;
    const b1_0 = benefitQ_0 < t1_0 ? benefitQ_0 : t1_0;
    let t_3;
    const b2_0 = benefitQ_0 <= t1_0 ?
                 0n :
                 (t_3 = benefitQ_0 < t2_0 ? benefitQ_0 : t2_0,
                  (__compactRuntime.assert(t_3 >= t1_0,
                                           'result of subtraction would be negative'),
                   t_3 - t1_0));
    const b3_0 = benefitQ_0 <= t2_0 ?
                 0n :
                 (__compactRuntime.assert(benefitQ_0 >= t2_0,
                                          'result of subtraction would be negative'),
                  benefitQ_0 - t2_0);
    const taxN_0 = b1_0 * taxParams_0.rate1 + b2_0 * taxParams_0.rate2
                   +
                   b3_0 * taxParams_0.rate3;
    let t_4;
    __compactRuntime.assert((t_4 = benefitTaxQ_0 * 10000n, t_4 <= taxN_0),
                            'benefit tax quotient too small');
    __compactRuntime.assert(taxN_0 < (benefitTaxQ_0 + 1n) * 10000n,
                            'benefit tax quotient too large');
    const contribBase_0 = benefitQ_0 < taxParams_0.maxContribBase ?
                          benefitQ_0 :
                          taxParams_0.maxContribBase;
    const socN_0 = contribBase_0 * taxParams_0.contribRate;
    let t_5;
    __compactRuntime.assert((t_5 = benefitSocialQ_0 * 10000n, t_5 <= socN_0),
                            'benefit contribution quotient too small');
    __compactRuntime.assert(socN_0 < (benefitSocialQ_0 + 1n) * 10000n,
                            'benefit contribution quotient too large');
    let t_6;
    __compactRuntime.assert((t_6 = benefitTaxQ_0 + benefitSocialQ_0,
                             t_6 < benefitQ_0),
                            'withholding leaves nothing of the benefit');
    let t_7;
    const benefitNet_0 = (t_7 = (__compactRuntime.assert(benefitQ_0
                                                         >=
                                                         benefitTaxQ_0,
                                                         'result of subtraction would be negative'),
                                 benefitQ_0 - benefitTaxQ_0),
                          (__compactRuntime.assert(t_7 >= benefitSocialQ_0,
                                                   'result of subtraction would be negative'),
                           t_7 - benefitSocialQ_0));
    const nullifier_0 = this._persistentHash_1({ claimKey: claimKey_0,
                                                 window: window_0,
                                                 fund:
                                                   _descriptor_17.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                              partialProofData,
                                                                                                              [
                                                                                                               { dup: { n: 2 } },
                                                                                                               { idx: { cached: true,
                                                                                                                        pushPath: false,
                                                                                                                        path: [
                                                                                                                               { tag: 'value',
                                                                                                                                 value: { value: _descriptor_18.toValue(0n),
                                                                                                                                          alignment: _descriptor_18.alignment() } }] } },
                                                                                                               { popeq: { cached: true,
                                                                                                                          result: undefined } }]).value).bytes });
    __compactRuntime.assert(!_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_18.toValue(1n),
                                                                                                                   alignment: _descriptor_18.alignment() } },
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_18.toValue(5n),
                                                                                                                   alignment: _descriptor_18.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(nullifier_0),
                                                                                                                                               alignment: _descriptor_4.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'already claimed for that window');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(5n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(nullifier_0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(1n),
                                                                                                                  alignment: _descriptor_18.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(12n),
                                                                                                                  alignment: _descriptor_18.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'the fund holds nothing yet');
    __compactRuntime.assert(this._equal_11(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_18.toValue(1n),
                                                                                                                                 alignment: _descriptor_18.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_18.toValue(11n),
                                                                                                                                 alignment: _descriptor_18.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           coin_0.color),
                            'wrong token for this fund');
    let t_8;
    __compactRuntime.assert((t_8 = coin_0.value, t_8 >= benefitNet_0),
                            'the pool coin cannot cover the benefit');
    const paid_0 = this._sendShielded_0(context,
                                        partialProofData,
                                        coin_0,
                                        this._left_0(this._ownPublicKey_0(context,
                                                                          partialProofData)),
                                        benefitNet_0);
    if (paid_0.change.is_some) {
      const tmp_0 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                              partialProofData,
                                                                              [
                                                                               { dup: { n: 0 } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_18.toValue(1n),
                                                                                                          alignment: _descriptor_18.alignment() } },
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_18.toValue(13n),
                                                                                                          alignment: _descriptor_18.alignment() } }] } },
                                                                               { popeq: { cached: false,
                                                                                          result: undefined } }]).value);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(14n),
                                                                                                alignment: _descriptor_18.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      const tmp_1 = ((t1) => {
                      if (t1 > 4294967295n) {
                        throw new __compactRuntime.CompactError('fund.compact line 492 char 21: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                      }
                      return t1;
                    })(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_18.toValue(1n),
                                                                                                             alignment: _descriptor_18.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_18.toValue(13n),
                                                                                                             alignment: _descriptor_18.alignment() } }] } },
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
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(13n),
                                                                                                alignment: _descriptor_18.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_1),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    const tmp_2 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('fund.compact line 495 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 0 } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_18.toValue(1n),
                                                                                                            alignment: _descriptor_18.alignment() } },
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_18.toValue(7n),
                                                                                                            alignment: _descriptor_18.alignment() } }] } },
                                                                                 { popeq: { cached: false,
                                                                                            result: undefined } }]).value)
                     +
                     benefitTaxQ_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(7n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_2),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_3 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('fund.compact line 496 char 16: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 0 } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_18.toValue(1n),
                                                                                                            alignment: _descriptor_18.alignment() } },
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_18.toValue(8n),
                                                                                                            alignment: _descriptor_18.alignment() } }] } },
                                                                                 { popeq: { cached: false,
                                                                                            result: undefined } }]).value)
                     +
                     benefitSocialQ_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(8n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_3),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_4 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } },
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(6n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_0.toValue(tmp_4),
                                                                alignment: _descriptor_0.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 2 } }]);
    return [];
  }
  _remitBenefitTax_0(context, partialProofData, coin_0) {
    let t_0;
    __compactRuntime.assert((t_0 = _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                              partialProofData,
                                                                                              [
                                                                                               { dup: { n: 0 } },
                                                                                               { idx: { cached: false,
                                                                                                        pushPath: false,
                                                                                                        path: [
                                                                                                               { tag: 'value',
                                                                                                                 value: { value: _descriptor_18.toValue(1n),
                                                                                                                          alignment: _descriptor_18.alignment() } },
                                                                                                               { tag: 'value',
                                                                                                                 value: { value: _descriptor_18.toValue(7n),
                                                                                                                          alignment: _descriptor_18.alignment() } }] } },
                                                                                               { popeq: { cached: false,
                                                                                                          result: undefined } }]).value),
                             t_0 > 0n),
                            'no withheld tax to remit');
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(1n),
                                                                                                                  alignment: _descriptor_18.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(12n),
                                                                                                                  alignment: _descriptor_18.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'the fund holds nothing yet');
    __compactRuntime.assert(this._equal_12(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_18.toValue(1n),
                                                                                                                                 alignment: _descriptor_18.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_18.toValue(11n),
                                                                                                                                 alignment: _descriptor_18.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           coin_0.color),
                            'wrong token for this fund');
    let t_1;
    __compactRuntime.assert((t_1 = coin_0.value,
                             t_1
                             >=
                             _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_18.toValue(1n),
                                                                                                                    alignment: _descriptor_18.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_18.toValue(7n),
                                                                                                                    alignment: _descriptor_18.alignment() } }] } },
                                                                                         { popeq: { cached: false,
                                                                                                    result: undefined } }]).value)),
                            'that coin cannot cover the withheld tax');
    const owed_0 = _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                              partialProofData,
                                                                              [
                                                                               { dup: { n: 0 } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_18.toValue(1n),
                                                                                                          alignment: _descriptor_18.alignment() } },
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_18.toValue(7n),
                                                                                                          alignment: _descriptor_18.alignment() } }] } },
                                                                               { popeq: { cached: false,
                                                                                          result: undefined } }]).value);
    const sent_0 = this._sendShielded_0(context,
                                        partialProofData,
                                        coin_0,
                                        this._left_0(_descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                partialProofData,
                                                                                                                [
                                                                                                                 { dup: { n: 0 } },
                                                                                                                 { idx: { cached: false,
                                                                                                                          pushPath: false,
                                                                                                                          path: [
                                                                                                                                 { tag: 'value',
                                                                                                                                   value: { value: _descriptor_18.toValue(0n),
                                                                                                                                            alignment: _descriptor_18.alignment() } },
                                                                                                                                 { tag: 'value',
                                                                                                                                   value: { value: _descriptor_18.toValue(1n),
                                                                                                                                            alignment: _descriptor_18.alignment() } }] } },
                                                                                                                 { popeq: { cached: false,
                                                                                                                            result: undefined } }]).value)),
                                        owed_0);
    if (sent_0.change.is_some) {
      const tmp_0 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                              partialProofData,
                                                                              [
                                                                               { dup: { n: 0 } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_18.toValue(1n),
                                                                                                          alignment: _descriptor_18.alignment() } },
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_18.toValue(13n),
                                                                                                          alignment: _descriptor_18.alignment() } }] } },
                                                                               { popeq: { cached: false,
                                                                                          result: undefined } }]).value);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(14n),
                                                                                                alignment: _descriptor_18.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      const tmp_1 = ((t1) => {
                      if (t1 > 4294967295n) {
                        throw new __compactRuntime.CompactError('fund.compact line 523 char 21: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                      }
                      return t1;
                    })(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_18.toValue(1n),
                                                                                                             alignment: _descriptor_18.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_18.toValue(13n),
                                                                                                             alignment: _descriptor_18.alignment() } }] } },
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
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(13n),
                                                                                                alignment: _descriptor_18.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_1),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    const tmp_2 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(7n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_2),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_3 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('fund.compact line 527 char 17: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 0 } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_18.toValue(1n),
                                                                                                            alignment: _descriptor_18.alignment() } },
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_18.toValue(9n),
                                                                                                            alignment: _descriptor_18.alignment() } }] } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(9n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_3),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _remitBenefitSocial_0(context, partialProofData, coin_0) {
    let t_0;
    __compactRuntime.assert((t_0 = _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                              partialProofData,
                                                                                              [
                                                                                               { dup: { n: 0 } },
                                                                                               { idx: { cached: false,
                                                                                                        pushPath: false,
                                                                                                        path: [
                                                                                                               { tag: 'value',
                                                                                                                 value: { value: _descriptor_18.toValue(1n),
                                                                                                                          alignment: _descriptor_18.alignment() } },
                                                                                                               { tag: 'value',
                                                                                                                 value: { value: _descriptor_18.toValue(8n),
                                                                                                                          alignment: _descriptor_18.alignment() } }] } },
                                                                                               { popeq: { cached: false,
                                                                                                          result: undefined } }]).value),
                             t_0 > 0n),
                            'no withheld contribution to remit');
    __compactRuntime.assert(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(1n),
                                                                                                                  alignment: _descriptor_18.alignment() } },
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_18.toValue(12n),
                                                                                                                  alignment: _descriptor_18.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'the fund holds nothing yet');
    __compactRuntime.assert(this._equal_13(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_18.toValue(1n),
                                                                                                                                 alignment: _descriptor_18.alignment() } },
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_18.toValue(11n),
                                                                                                                                 alignment: _descriptor_18.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value),
                                           coin_0.color),
                            'wrong token for this fund');
    let t_1;
    __compactRuntime.assert((t_1 = coin_0.value,
                             t_1
                             >=
                             _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_18.toValue(1n),
                                                                                                                    alignment: _descriptor_18.alignment() } },
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_18.toValue(8n),
                                                                                                                    alignment: _descriptor_18.alignment() } }] } },
                                                                                         { popeq: { cached: false,
                                                                                                    result: undefined } }]).value)),
                            'that coin cannot cover the withheld contribution');
    const owed_0 = _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                              partialProofData,
                                                                              [
                                                                               { dup: { n: 0 } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_18.toValue(1n),
                                                                                                          alignment: _descriptor_18.alignment() } },
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_18.toValue(8n),
                                                                                                          alignment: _descriptor_18.alignment() } }] } },
                                                                               { popeq: { cached: false,
                                                                                          result: undefined } }]).value);
    const sent_0 = this._sendShielded_0(context,
                                        partialProofData,
                                        coin_0,
                                        this._left_0(_descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                partialProofData,
                                                                                                                [
                                                                                                                 { dup: { n: 0 } },
                                                                                                                 { idx: { cached: false,
                                                                                                                          pushPath: false,
                                                                                                                          path: [
                                                                                                                                 { tag: 'value',
                                                                                                                                   value: { value: _descriptor_18.toValue(1n),
                                                                                                                                            alignment: _descriptor_18.alignment() } },
                                                                                                                                 { tag: 'value',
                                                                                                                                   value: { value: _descriptor_18.toValue(0n),
                                                                                                                                            alignment: _descriptor_18.alignment() } }] } },
                                                                                                                 { popeq: { cached: false,
                                                                                                                            result: undefined } }]).value)),
                                        owed_0);
    if (sent_0.change.is_some) {
      const tmp_0 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                              partialProofData,
                                                                              [
                                                                               { dup: { n: 0 } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_18.toValue(1n),
                                                                                                          alignment: _descriptor_18.alignment() } },
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_18.toValue(13n),
                                                                                                          alignment: _descriptor_18.alignment() } }] } },
                                                                               { popeq: { cached: false,
                                                                                          result: undefined } }]).value);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(14n),
                                                                                                alignment: _descriptor_18.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
      const tmp_1 = ((t1) => {
                      if (t1 > 4294967295n) {
                        throw new __compactRuntime.CompactError('fund.compact line 549 char 21: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 4294967295');
                      }
                      return t1;
                    })(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 0 } },
                                                                                  { idx: { cached: false,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_18.toValue(1n),
                                                                                                             alignment: _descriptor_18.alignment() } },
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_18.toValue(13n),
                                                                                                             alignment: _descriptor_18.alignment() } }] } },
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
                                                           value: { value: _descriptor_18.toValue(1n),
                                                                    alignment: _descriptor_18.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(13n),
                                                                                                alignment: _descriptor_18.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_1),
                                                                                                alignment: _descriptor_1.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    const tmp_2 = 0n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(8n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_2),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_3 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('fund.compact line 553 char 20: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 0 } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_18.toValue(1n),
                                                                                                            alignment: _descriptor_18.alignment() } },
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_18.toValue(10n),
                                                                                                            alignment: _descriptor_18.alignment() } }] } },
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
                                                         value: { value: _descriptor_18.toValue(1n),
                                                                  alignment: _descriptor_18.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_18.toValue(10n),
                                                                                              alignment: _descriptor_18.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(tmp_3),
                                                                                              alignment: _descriptor_12.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _leafDigest_0(leaf_0) { return this._persistentHash_6(leaf_0); }
  _treeLeaf_0(digest_0) { return this._degradeToTransient_0(digest_0); }
  _treeNode_0(leftNode_0, rightNode_0) {
    return this._transientHash_0([leftNode_0, rightNode_0]);
  }
  _pathRoot_0(path_0) {
    return this._merkleTreePathRootNoLeafHash_0(path_0).field;
  }
  _taxParamsHash_0(params_0) { return this._persistentHash_7(params_0); }
  _claimKeyHash_0(claimKey_0) { return this._persistentHash_8(claimKey_0); }
  _folder_0(f, x, a0) {
    for (let i = 0; i < 16; i++) { x = f(x, a0[i]); }
    return x;
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
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_6(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_7(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_8(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_9(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
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
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_13(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
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
      return _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(0n),
                                                                                                    alignment: _descriptor_18.alignment() } },
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(0n),
                                                                                                    alignment: _descriptor_18.alignment() } }] } },
                                                                         { popeq: { cached: false,
                                                                                    result: undefined } }]).value);
    },
    get taxTreasury() {
      return _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(0n),
                                                                                                    alignment: _descriptor_18.alignment() } },
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(1n),
                                                                                                    alignment: _descriptor_18.alignment() } }] } },
                                                                         { popeq: { cached: false,
                                                                                    result: undefined } }]).value);
    },
    get socialTreasury() {
      return _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(1n),
                                                                                                    alignment: _descriptor_18.alignment() } },
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(0n),
                                                                                                    alignment: _descriptor_18.alignment() } }] } },
                                                                         { popeq: { cached: false,
                                                                                    result: undefined } }]).value);
    },
    paramsFor: {
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
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(0n),
                                                                                                                                 alignment: _descriptor_12.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_18.toValue(1n),
                                                                                                      alignment: _descriptor_18.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_18.toValue(1n),
                                                                                                      alignment: _descriptor_18.alignment() } }] } },
                                                                           'size',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 65535n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'fund.compact line 168 char 1',
                                     'Uint<0..65536>',
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
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 65535n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'fund.compact line 168 char 1',
                                     'Uint<0..65536>',
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
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[1];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_4.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get latestVersion() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_18.toValue(1n),
                                                                                                   alignment: _descriptor_18.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_18.toValue(2n),
                                                                                                   alignment: _descriptor_18.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    rootFor: {
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
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_18.toValue(3n),
                                                                                                     alignment: _descriptor_18.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(0n),
                                                                                                                                 alignment: _descriptor_12.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_18.toValue(1n),
                                                                                                      alignment: _descriptor_18.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_18.toValue(3n),
                                                                                                      alignment: _descriptor_18.alignment() } }] } },
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
                                     'fund.compact line 176 char 1',
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
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_18.toValue(3n),
                                                                                                     alignment: _descriptor_18.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(key_0),
                                                                                                                                 alignment: _descriptor_1.alignment() }).encode() } },
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
                                     'fund.compact line 176 char 1',
                                     'Uint<0..4294967296>',
                                     key_0)
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_18.toValue(3n),
                                                                                                     alignment: _descriptor_18.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(key_0),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[3];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_1.fromValue(key.value),      _descriptor_5.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    rootAuthor: {
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
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_18.toValue(4n),
                                                                                                     alignment: _descriptor_18.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(0n),
                                                                                                                                 alignment: _descriptor_12.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_18.toValue(1n),
                                                                                                      alignment: _descriptor_18.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_18.toValue(4n),
                                                                                                      alignment: _descriptor_18.alignment() } }] } },
                                                                           'size',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'fund.compact line 183 char 1',
                                     'Bytes<32>',
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
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_18.toValue(4n),
                                                                                                     alignment: _descriptor_18.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(key_0),
                                                                                                                                 alignment: _descriptor_4.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'fund.compact line 183 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_13.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_18.toValue(1n),
                                                                                                      alignment: _descriptor_18.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_18.toValue(4n),
                                                                                                      alignment: _descriptor_18.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_4.toValue(key_0),
                                                                                                      alignment: _descriptor_4.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[4];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_4.fromValue(key.value),      _descriptor_13.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    spent: {
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
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_18.toValue(5n),
                                                                                                     alignment: _descriptor_18.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_12.toValue(0n),
                                                                                                                                 alignment: _descriptor_12.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_18.toValue(1n),
                                                                                                      alignment: _descriptor_18.alignment() } },
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_18.toValue(5n),
                                                                                                      alignment: _descriptor_18.alignment() } }] } },
                                                                           'size',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'fund.compact line 187 char 1',
                                     'Bytes<32>',
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
                                                                                            value: { value: _descriptor_18.toValue(1n),
                                                                                                     alignment: _descriptor_18.alignment() } },
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_18.toValue(5n),
                                                                                                     alignment: _descriptor_18.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_4.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1].asArray()[5];
        return self_0.asMap().keys().map((elem) => _descriptor_4.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    get claimsPaid() {
      return _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(1n),
                                                                                                    alignment: _descriptor_18.alignment() } },
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(6n),
                                                                                                    alignment: _descriptor_18.alignment() } }] } },
                                                                         { popeq: { cached: true,
                                                                                    result: undefined } }]).value);
    },
    get taxPool() {
      return _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(1n),
                                                                                                    alignment: _descriptor_18.alignment() } },
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(7n),
                                                                                                    alignment: _descriptor_18.alignment() } }] } },
                                                                         { popeq: { cached: false,
                                                                                    result: undefined } }]).value);
    },
    get socialPool() {
      return _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(1n),
                                                                                                    alignment: _descriptor_18.alignment() } },
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(8n),
                                                                                                    alignment: _descriptor_18.alignment() } }] } },
                                                                         { popeq: { cached: false,
                                                                                    result: undefined } }]).value);
    },
    get taxRemitted() {
      return _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(1n),
                                                                                                    alignment: _descriptor_18.alignment() } },
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(9n),
                                                                                                    alignment: _descriptor_18.alignment() } }] } },
                                                                         { popeq: { cached: false,
                                                                                    result: undefined } }]).value);
    },
    get socialRemitted() {
      return _descriptor_12.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(1n),
                                                                                                    alignment: _descriptor_18.alignment() } },
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_18.toValue(10n),
                                                                                                    alignment: _descriptor_18.alignment() } }] } },
                                                                         { popeq: { cached: false,
                                                                                    result: undefined } }]).value);
    },
    get benefitToken() {
      return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_18.toValue(1n),
                                                                                                   alignment: _descriptor_18.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_18.toValue(11n),
                                                                                                   alignment: _descriptor_18.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get benefitTokenSet() {
      return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_18.toValue(1n),
                                                                                                   alignment: _descriptor_18.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_18.toValue(12n),
                                                                                                   alignment: _descriptor_18.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get coinsReceived() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_18.toValue(1n),
                                                                                                   alignment: _descriptor_18.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_18.toValue(13n),
                                                                                                   alignment: _descriptor_18.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get poolOrdinal() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_18.toValue(1n),
                                                                                                   alignment: _descriptor_18.alignment() } },
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_18.toValue(14n),
                                                                                                   alignment: _descriptor_18.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({ });
export const pureCircuits = {
  leafDigest: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`leafDigest: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const leaf_0 = args_0[0];
    if (!(typeof(leaf_0) === 'object' && leaf_0.commitment.buffer instanceof ArrayBuffer && leaf_0.commitment.BYTES_PER_ELEMENT === 1 && leaf_0.commitment.length === 32 && leaf_0.payeeBinding.buffer instanceof ArrayBuffer && leaf_0.payeeBinding.BYTES_PER_ELEMENT === 1 && leaf_0.payeeBinding.length === 32 && leaf_0.claimKeyHash.buffer instanceof ArrayBuffer && leaf_0.claimKeyHash.BYTES_PER_ELEMENT === 1 && leaf_0.claimKeyHash.length === 32 && typeof(leaf_0.finalPeriod) === 'bigint' && leaf_0.finalPeriod >= 0n && leaf_0.finalPeriod <= 4294967295n && typeof(leaf_0.monthsWorked) === 'bigint' && leaf_0.monthsWorked >= 0n && leaf_0.monthsWorked <= 65535n && leaf_0.instance.buffer instanceof ArrayBuffer && leaf_0.instance.BYTES_PER_ELEMENT === 1 && leaf_0.instance.length === 32)) {
      __compactRuntime.typeError('leafDigest',
                                 'argument 1',
                                 'fund.compact line 566 char 1',
                                 'struct ClaimLeaf<commitment: Bytes<32>, payeeBinding: Bytes<32>, claimKeyHash: Bytes<32>, finalPeriod: Uint<0..4294967296>, monthsWorked: Uint<0..65536>, instance: Bytes<32>>',
                                 leaf_0)
    }
    return _dummyContract._leafDigest_0(leaf_0);
  },
  treeLeaf: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`treeLeaf: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const digest_0 = args_0[0];
    if (!(digest_0.buffer instanceof ArrayBuffer && digest_0.BYTES_PER_ELEMENT === 1 && digest_0.length === 32)) {
      __compactRuntime.typeError('treeLeaf',
                                 'argument 1',
                                 'fund.compact line 571 char 1',
                                 'Bytes<32>',
                                 digest_0)
    }
    return _dummyContract._treeLeaf_0(digest_0);
  },
  treeNode: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`treeNode: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const leftNode_0 = args_0[0];
    const rightNode_0 = args_0[1];
    if (!(typeof(leftNode_0) === 'bigint' && leftNode_0 >= 0 && leftNode_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('treeNode',
                                 'argument 1',
                                 'fund.compact line 576 char 1',
                                 'Field',
                                 leftNode_0)
    }
    if (!(typeof(rightNode_0) === 'bigint' && rightNode_0 >= 0 && rightNode_0 <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('treeNode',
                                 'argument 2',
                                 'fund.compact line 576 char 1',
                                 'Field',
                                 rightNode_0)
    }
    return _dummyContract._treeNode_0(leftNode_0, rightNode_0);
  },
  pathRoot: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`pathRoot: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const path_0 = args_0[0];
    if (!(typeof(path_0) === 'object' && path_0.leaf.buffer instanceof ArrayBuffer && path_0.leaf.BYTES_PER_ELEMENT === 1 && path_0.leaf.length === 32 && Array.isArray(path_0.path) && path_0.path.length === 16 && path_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
      __compactRuntime.typeError('pathRoot',
                                 'argument 1',
                                 'fund.compact line 587 char 1',
                                 'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<16, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                 path_0)
    }
    return _dummyContract._pathRoot_0(path_0);
  },
  taxParamsHash: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`taxParamsHash: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const params_0 = args_0[0];
    if (!(typeof(params_0) === 'object' && typeof(params_0.version) === 'bigint' && params_0.version >= 0n && params_0.version <= 65535n && typeof(params_0.validFrom) === 'bigint' && params_0.validFrom >= 0n && params_0.validFrom <= 4294967295n && typeof(params_0.threshold1) === 'bigint' && params_0.threshold1 >= 0n && params_0.threshold1 <= 1152921504606846975n && typeof(params_0.threshold2) === 'bigint' && params_0.threshold2 >= 0n && params_0.threshold2 <= 1152921504606846975n && typeof(params_0.rate1) === 'bigint' && params_0.rate1 >= 0n && params_0.rate1 <= 65535n && typeof(params_0.rate2) === 'bigint' && params_0.rate2 >= 0n && params_0.rate2 <= 65535n && typeof(params_0.rate3) === 'bigint' && params_0.rate3 >= 0n && params_0.rate3 <= 65535n && typeof(params_0.maxContribBase) === 'bigint' && params_0.maxContribBase >= 0n && params_0.maxContribBase <= 1152921504606846975n && typeof(params_0.contribRate) === 'bigint' && params_0.contribRate >= 0n && params_0.contribRate <= 65535n)) {
      __compactRuntime.typeError('taxParamsHash',
                                 'argument 1',
                                 'fund.compact line 599 char 1',
                                 'struct TaxParams<version: Uint<0..65536>, validFrom: Uint<0..4294967296>, threshold1: Uint<0..1152921504606846976>, threshold2: Uint<0..1152921504606846976>, rate1: Uint<0..65536>, rate2: Uint<0..65536>, rate3: Uint<0..65536>, maxContribBase: Uint<0..1152921504606846976>, contribRate: Uint<0..65536>>',
                                 params_0)
    }
    return _dummyContract._taxParamsHash_0(params_0);
  },
  claimKeyHash: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`claimKeyHash: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const claimKey_0 = args_0[0];
    if (!(claimKey_0.buffer instanceof ArrayBuffer && claimKey_0.BYTES_PER_ELEMENT === 1 && claimKey_0.length === 32)) {
      __compactRuntime.typeError('claimKeyHash',
                                 'argument 1',
                                 'fund.compact line 612 char 1',
                                 'Bytes<32>',
                                 claimKey_0)
    }
    return _dummyContract._claimKeyHash_0(claimKey_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
