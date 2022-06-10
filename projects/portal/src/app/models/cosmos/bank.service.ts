import { CosmosSDKService } from '../cosmos-sdk.service';
import { CosmosWallet } from '../wallets/wallet.model';
import { SimulatedTxResultResponse } from './tx-common.model';
import { TxCommonService } from './tx-common.service';
import { Injectable } from '@angular/core';
import { cosmosclient, proto } from '@cosmos-client/core';
import { InlineResponse20075 } from '@cosmos-client/core/esm/openapi';

@Injectable({
  providedIn: 'root',
})
export class BankService {
  constructor(
    private readonly cosmosSDK: CosmosSDKService,
    private readonly txCommonService: TxCommonService,
  ) {}

  canonicalizeAccAddress(address: string) {
    const canonicalized = address.replace(/\s+/g, '');
    return cosmosclient.AccAddress.fromString(canonicalized);
  }

  validateBalanceBeforeSimulation(
    amount: proto.cosmos.base.v1beta1.ICoin[],
    minimumGasPrice: proto.cosmos.base.v1beta1.ICoin,
    balances: proto.cosmos.base.v1beta1.ICoin[],
  ) {
    const feeDenom = minimumGasPrice.denom;
    const simulationFeeAmount = 1;
    const tempAmountToSend = amount.find((amount) => amount.denom === feeDenom)?.amount;
    const amountToSend = tempAmountToSend ? parseInt(tempAmountToSend) : 0;
    const tempBalance = balances.find((coin) => coin.denom === minimumGasPrice.denom)?.amount;
    const balance = tempBalance ? parseInt(tempBalance) : 0;

    return {
      feeDenom,
      amountToSend,
      balance,
      simulationFeeAmount,
      validity: amountToSend + simulationFeeAmount <= balance,
    };
  }

  async simulateToSend(
    fromAddress: cosmosclient.AccAddress,
    toAddress: cosmosclient.AccAddress,
    amount: proto.cosmos.base.v1beta1.ICoin[],
    cosmosPublicKey: cosmosclient.PubKey,
    minimumGasPrice: proto.cosmos.base.v1beta1.ICoin,
    gasRatio: number,
  ): Promise<SimulatedTxResultResponse> {
    const fromAccount = await this.txCommonService.getBaseAccountFromAddress(fromAddress);
    if (!fromAccount) {
      throw Error('Unsupported account type.');
    }
    const dummyFee: proto.cosmos.base.v1beta1.ICoin = {
      denom: minimumGasPrice.denom,
      amount: '1',
    };
    const dummyGas: proto.cosmos.base.v1beta1.ICoin = {
      denom: minimumGasPrice.denom,
      amount: '1',
    };
    const simulatedTxBuilder = await this.buildSendTxBuilder(
      fromAccount,
      toAddress,
      amount,
      cosmosPublicKey,
      dummyGas,
      dummyFee,
    );
    return await this.txCommonService.simulateTx(simulatedTxBuilder, minimumGasPrice, gasRatio);
  }

  async send(
    fromAddress: cosmosclient.AccAddress,
    toAddress: cosmosclient.AccAddress,
    amount: proto.cosmos.base.v1beta1.ICoin[],
    currentCosmosWallet: CosmosWallet,
    gas: proto.cosmos.base.v1beta1.ICoin,
    fee: proto.cosmos.base.v1beta1.ICoin,
    privateKey?: string,
  ): Promise<InlineResponse20075> {
    const cosmosPublicKey = currentCosmosWallet.public_key;

    const fromAccount = await this.txCommonService.getBaseAccountFromAddress(fromAddress);
    if (!fromAccount) {
      throw Error('Unsupported account type.');
    }

    const txBuilder = await this.buildSendTxBuilder(
      fromAccount,
      toAddress,
      amount,
      cosmosPublicKey,
      gas,
      fee,
    );

    const signedTxBuilder = await this.txCommonService.signTx(
      txBuilder,
      fromAccount,
      currentCosmosWallet,
      privateKey,
    );
    if (!signedTxBuilder) {
      throw Error('Failed to sign!');
    }
    const txResult = await this.txCommonService.announceTx(signedTxBuilder);
    return txResult;
  }

  async buildSendTxBuilder(
    fromAccount: proto.cosmos.auth.v1beta1.BaseAccount,
    toAddress: cosmosclient.AccAddress,
    amount: proto.cosmos.base.v1beta1.ICoin[],
    cosmosPublicKey: cosmosclient.PubKey,
    gas: proto.cosmos.base.v1beta1.ICoin,
    fee: proto.cosmos.base.v1beta1.ICoin,
  ): Promise<cosmosclient.TxBuilder> {
    const fromAddress = cosmosclient.AccAddress.fromString(fromAccount.address);

    const msgSend = this.buildMsgSend(fromAddress, toAddress, amount);

    // build tx
    const txBuilder = await this.txCommonService.buildTxBuilder(
      [msgSend],
      cosmosPublicKey,
      fromAccount,
      gas,
      fee,
    );

    return txBuilder;
  }

  buildMsgSend(
    fromAddress: cosmosclient.AccAddress,
    toAddress: cosmosclient.AccAddress,
    amount: proto.cosmos.base.v1beta1.ICoin[],
  ): proto.cosmos.bank.v1beta1.MsgSend {
    const msgSend = new proto.cosmos.bank.v1beta1.MsgSend({
      from_address: fromAddress.toString(),
      to_address: toAddress.toString(),
      amount,
    });
    return msgSend;
  }
}
