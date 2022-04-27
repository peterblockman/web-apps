import { DelegateFormDialogComponent } from '../../pages/dialogs/delegate/delegate-form-dialog/delegate-form-dialog.component';
import { DelegateMenuDialogComponent } from '../../pages/dialogs/delegate/delegate-menu-dialog/delegate-menu-dialog.component';
import { RedelegateFormDialogComponent } from '../../pages/dialogs/delegate/redelegate-form-dialog/redelegate-form-dialog.component';
import { UndelegateFormDialogComponent } from '../../pages/dialogs/delegate/undelegate-form-dialog/undelegate-form-dialog.component';
import { convertHexStringToUint8Array } from '../../utils/converter';
import { validatePrivateStoredWallet } from '../../utils/validater';
import { TxFeeConfirmDialogComponent } from '../../views/cosmos/tx-fee-confirm-dialog/tx-fee-confirm-dialog.component';
import { KeyType } from '../keys/key.model';
import { WalletApplicationService } from '../wallets/wallet.application.service';
import { StoredWallet } from '../wallets/wallet.model';
import { CreateValidatorData } from './staking.model';
import { StakingService } from './staking.service';
import { SimulatedTxResultResponse } from './tx-common.model';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { proto } from '@cosmos-client/core';
import {
  InlineResponse20066Validators,
  InlineResponse20075,
} from '@cosmos-client/core/esm/openapi';
import { LoadingDialogService } from 'ng-loading-dialog';

@Injectable({
  providedIn: 'root',
})
export class StakingApplicationService {
  constructor(
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly loadingDialog: LoadingDialogService,
    private readonly staking: StakingService,
    private readonly walletApplicationService: WalletApplicationService,
  ) {}

  async openDelegateMenuDialog(validator: InlineResponse20066Validators): Promise<void> {
    await this.dialog
      .open(DelegateMenuDialogComponent, { data: validator })
      .afterClosed()
      .toPromise();
  }

  async openDelegateFormDialog(validator: InlineResponse20066Validators): Promise<void> {
    const txHash = await this.dialog
      .open(DelegateFormDialogComponent, { data: validator })
      .afterClosed()
      .toPromise();
    await this.router.navigate(['txs', txHash]);
  }

  async openRedelegateFormDialog(validator: InlineResponse20066Validators): Promise<void> {
    const txHash = await this.dialog
      .open(RedelegateFormDialogComponent, { data: validator })
      .afterClosed()
      .toPromise();
    await this.router.navigate(['txs', txHash]);
  }

  async openUndelegateFormDialog(validator: InlineResponse20066Validators): Promise<void> {
    const txHash = await this.dialog
      .open(UndelegateFormDialogComponent, { data: validator })
      .afterClosed()
      .toPromise();
    await this.router.navigate(['txs', txHash]);
  }

  async createValidatorSimple(
    createValidatorData: CreateValidatorData,
    minimumGasPrice: proto.cosmos.base.v1beta1.ICoin,
    privateKeyString: string,
  ) {
    const privateKey = convertHexStringToUint8Array(privateKeyString);
    if (!privateKey) {
      this.snackBar.open('Invalid PrivateKey!', 'Close');
      return;
    }

    const dialogRef = this.loadingDialog.open('Sending Tx to be validator...');

    try {
      const simulatedResultData = await this.staking.simulateToCreateValidator(
        KeyType.secp256k1,
        createValidatorData,
        minimumGasPrice,
        privateKey,
      );
      const gas = simulatedResultData.estimatedGasUsedWithMargin;
      const fee = simulatedResultData.estimatedFeeWithMargin;
      const createValidatorResult = await this.staking.createValidator(
        KeyType.secp256k1,
        createValidatorData,
        gas,
        fee,
        privateKey,
      );
      const txHash = createValidatorResult.tx_response?.txhash;
      if (txHash === undefined) {
        throw Error('Invalid txHash!');
      }
    } catch (error) {
      console.error(error);
      this.snackBar.open(`Error: ${(error as Error).message}`, 'Close');
      return;
    } finally {
      dialogRef.close();
    }

    this.snackBar.open('Success', undefined, { duration: 6000 });

    const redirectUrl =
      location.port === '80' || location.port === '443' || location.port === ''
        ? `${location.protocol}//${location.hostname}/explorer/validators/${createValidatorData.validator_address}`
        : `${location.protocol}//${location.host}/explorer/validators/${createValidatorData.validator_address}`;
    window.location.href = redirectUrl;
  }

  async createValidator(
    createValidatorData: CreateValidatorData,
    minimumGasPrice: proto.cosmos.base.v1beta1.ICoin,
  ) {
    const privateWallet: StoredWallet & { privateKey: string } =
      await this.walletApplicationService.openUnunifiKeyFormDialog();
    if (!privateWallet || !privateWallet.privateKey) {
      this.snackBar.open('Failed to get Wallet info from dialog! Tray again!', 'Close');
      return;
    }

    if (!validatePrivateStoredWallet(privateWallet)) {
      this.snackBar.open('Invalid Wallet info!', 'Close');
      return;
    }

    const privateKey = convertHexStringToUint8Array(privateWallet.privateKey);

    if (!privateKey) {
      this.snackBar.open('Invalid PrivateKey!', 'Close');
      return;
    }

    // simulate
    let simulatedResultData: SimulatedTxResultResponse;
    let gas: proto.cosmos.base.v1beta1.ICoin;
    let fee: proto.cosmos.base.v1beta1.ICoin;

    const dialogRefSimulating = this.loadingDialog.open('Simulating...');

    try {
      simulatedResultData = await this.staking.simulateToCreateValidator(
        privateWallet.key_type,
        createValidatorData,
        minimumGasPrice,
        privateKey,
      );
      gas = simulatedResultData.estimatedGasUsedWithMargin;
      fee = simulatedResultData.estimatedFeeWithMargin;
    } catch (error) {
      console.error(error);
      const errorMessage = `Tx simulation failed: ${(error as Error).toString()}`;
      this.snackBar.open(`An error has occur: ${errorMessage}`, 'Close');
      return;
    } finally {
      dialogRefSimulating.close();
    }

    // ask the user to confirm the fee with a dialog
    const txFeeConfirmedResult = await this.dialog
      .open(TxFeeConfirmDialogComponent, {
        data: {
          fee,
          isConfirmed: false,
        },
      })
      .afterClosed()
      .toPromise();

    if (txFeeConfirmedResult === undefined || txFeeConfirmedResult.isConfirmed === false) {
      this.snackBar.open('Tx was canceled', undefined, { duration: 6000 });
      return;
    }

    const dialogRef = this.loadingDialog.open('Loading...');

    let createValidatorResult: InlineResponse20075 | undefined;
    let txHash: string | undefined;

    try {
      createValidatorResult = await this.staking.createValidator(
        privateWallet.key_type,
        createValidatorData,
        gas,
        fee,
        privateKey,
      );
      txHash = createValidatorResult.tx_response?.txhash;
      if (txHash === undefined) {
        throw Error('Invalid txHash!');
      }
    } catch (error) {
      console.error(error);
      const msg = (error as Error).toString();
      this.snackBar.open(`An error has occur: ${msg}`, 'Close');
      return;
    } finally {
      dialogRef.close();
    }

    this.snackBar.open('Successfully create validator', undefined, { duration: 6000 });

    await this.router.navigate(['txs', txHash]);
  }

  async createDelegate(
    validatorAddress: string,
    amount: proto.cosmos.base.v1beta1.ICoin,
    minimumGasPrice: proto.cosmos.base.v1beta1.ICoin,
  ) {
    const privateWallet: StoredWallet & { privateKey: string } =
      await this.walletApplicationService.openUnunifiKeyFormDialog();
    if (!privateWallet || !privateWallet.privateKey) {
      this.snackBar.open('Failed to get Wallet info from dialog! Tray again!', 'Close');
      return;
    }

    if (!validatePrivateStoredWallet(privateWallet)) {
      this.snackBar.open('Invalid Wallet info!', 'Close');
      return;
    }

    const privateKey = convertHexStringToUint8Array(privateWallet.privateKey);

    if (!privateKey) {
      this.snackBar.open('Invalid PrivateKey!', 'Close');
      return;
    }

    // simulate
    let simulatedResultData: SimulatedTxResultResponse;
    let gas: proto.cosmos.base.v1beta1.ICoin;
    let fee: proto.cosmos.base.v1beta1.ICoin;

    const dialogRefSimulating = this.loadingDialog.open('Simulating...');

    try {
      simulatedResultData = await this.staking.simulateToCreateDelegate(
        privateWallet.key_type,
        validatorAddress,
        amount,
        minimumGasPrice,
        privateKey,
      );
      gas = simulatedResultData.estimatedGasUsedWithMargin;
      fee = simulatedResultData.estimatedFeeWithMargin;
    } catch (error) {
      console.error(error);
      const errorMessage = `Tx simulation failed: ${(error as Error).toString()}`;
      this.snackBar.open(`An error has occur: ${errorMessage}`, 'Close');
      return;
    } finally {
      dialogRefSimulating.close();
    }

    // ask the user to confirm the fee with a dialog
    const txFeeConfirmedResult = await this.dialog
      .open(TxFeeConfirmDialogComponent, {
        data: {
          fee,
          isConfirmed: false,
        },
      })
      .afterClosed()
      .toPromise();

    if (txFeeConfirmedResult === undefined || txFeeConfirmedResult.isConfirmed === false) {
      this.snackBar.open('Tx was canceled', undefined, { duration: 6000 });
      return;
    }

    const dialogRef = this.loadingDialog.open('Sending');

    let createDelegatorResult: InlineResponse20075 | undefined;
    let txHash: string | undefined;

    try {
      createDelegatorResult = await this.staking.createDelegate(
        privateWallet.key_type,
        validatorAddress,
        amount,
        gas,
        fee,
        privateKey,
      );
      txHash = createDelegatorResult.tx_response?.txhash;
      if (txHash === undefined) {
        throw Error('Invalid txHash!');
      }
    } catch (error) {
      console.error(error);
      const msg = (error as Error).toString();
      this.snackBar.open(`An error has occur: ${msg}`, 'Close');
      return;
    } finally {
      dialogRef.close();
    }

    this.snackBar.open('Successfully create the validator', undefined, { duration: 6000 });

    return txHash;
    // await this.router.navigate(['txs', txHash]);
  }

  async Redelegate(
    validatorAddressBefore: string,
    validatorAddressAfter: string,
    amount: proto.cosmos.base.v1beta1.ICoin,
    minimumGasPrice: proto.cosmos.base.v1beta1.ICoin,
  ) {
    const privateWallet: StoredWallet & { privateKey: string } =
      await this.walletApplicationService.openUnunifiKeyFormDialog();
    if (!privateWallet || !privateWallet.privateKey) {
      this.snackBar.open('Failed to get Wallet info from dialog! Tray again!', 'Close');
      return;
    }

    if (!validatePrivateStoredWallet(privateWallet)) {
      this.snackBar.open('Invalid Wallet info!', 'Close');
      return;
    }

    const privateKey = convertHexStringToUint8Array(privateWallet.privateKey);

    if (!privateKey) {
      this.snackBar.open('Invalid PrivateKey!', 'Close');
      return;
    }

    // simulate
    let simulatedResultData: SimulatedTxResultResponse;
    let gas: proto.cosmos.base.v1beta1.ICoin;
    let fee: proto.cosmos.base.v1beta1.ICoin;

    const dialogRefSimulating = this.loadingDialog.open('Simulating...');

    try {
      simulatedResultData = await this.staking.simulateToRedelegate(
        privateWallet.key_type,
        validatorAddressBefore,
        validatorAddressAfter,
        amount,
        minimumGasPrice,
        privateKey,
      );
      gas = simulatedResultData.estimatedGasUsedWithMargin;
      fee = simulatedResultData.estimatedFeeWithMargin;
    } catch (error) {
      console.error(error);
      const errorMessage = `Tx simulation failed: ${(error as Error).toString()}`;
      this.snackBar.open(`An error has occur: ${errorMessage}`, 'Close');
      return;
    } finally {
      dialogRefSimulating.close();
    }

    // ask the user to confirm the fee with a dialog
    const txFeeConfirmedResult = await this.dialog
      .open(TxFeeConfirmDialogComponent, {
        data: {
          fee,
          isConfirmed: false,
        },
      })
      .afterClosed()
      .toPromise();

    if (txFeeConfirmedResult === undefined || txFeeConfirmedResult.isConfirmed === false) {
      this.snackBar.open('Tx was canceled', undefined, { duration: 6000 });
      return;
    }

    const dialogRef = this.loadingDialog.open('Sending');

    let createDelegatorResult: InlineResponse20075 | undefined;
    let txHash: string | undefined;

    try {
      createDelegatorResult = await this.staking.redelegate(
        privateWallet.key_type,
        validatorAddressBefore,
        validatorAddressAfter,
        amount,
        gas,
        fee,
        privateKey,
      );
      txHash = createDelegatorResult.tx_response?.txhash;
      if (txHash === undefined) {
        throw Error('Invalid txHash!');
      }
    } catch (error) {
      console.error(error);
      const msg = (error as Error).toString();
      this.snackBar.open(`An error has occur: ${msg}`, 'Close');
      return;
    } finally {
      dialogRef.close();
    }

    this.snackBar.open('Successfully redelegate the validator', undefined, { duration: 6000 });

    return txHash;
    // await this.router.navigate(['txs', txHash]);
  }

  async undelegate(
    validatorAddress: string,
    amount: proto.cosmos.base.v1beta1.ICoin,
    minimumGasPrice: proto.cosmos.base.v1beta1.ICoin,
  ) {
    const privateWallet: StoredWallet & { privateKey: string } =
      await this.walletApplicationService.openUnunifiKeyFormDialog();
    if (!privateWallet || !privateWallet.privateKey) {
      this.snackBar.open('Failed to get Wallet info from dialog! Tray again!', 'Close');
      return;
    }

    if (!validatePrivateStoredWallet(privateWallet)) {
      this.snackBar.open('Invalid Wallet info!', 'Close');
      return;
    }

    const privateKey = convertHexStringToUint8Array(privateWallet.privateKey);

    if (!privateKey) {
      this.snackBar.open('Invalid PrivateKey!', 'Close');
      return;
    }

    // simulate
    let simulatedResultData: SimulatedTxResultResponse;
    let gas: proto.cosmos.base.v1beta1.ICoin;
    let fee: proto.cosmos.base.v1beta1.ICoin;

    const dialogRefSimulating = this.loadingDialog.open('Simulating...');

    try {
      simulatedResultData = await this.staking.simulateToUndelegate(
        privateWallet.key_type,
        validatorAddress,
        amount,
        minimumGasPrice,
        privateKey,
      );
      gas = simulatedResultData.estimatedGasUsedWithMargin;
      fee = simulatedResultData.estimatedFeeWithMargin;
    } catch (error) {
      console.error(error);
      const errorMessage = `Tx simulation failed: ${(error as Error).toString()}`;
      this.snackBar.open(`An error has occur: ${errorMessage}`, 'Close');
      return;
    } finally {
      dialogRefSimulating.close();
    }

    // ask the user to confirm the fee with a dialog
    const txFeeConfirmedResult = await this.dialog
      .open(TxFeeConfirmDialogComponent, {
        data: {
          fee,
          isConfirmed: false,
        },
      })
      .afterClosed()
      .toPromise();

    if (txFeeConfirmedResult === undefined || txFeeConfirmedResult.isConfirmed === false) {
      this.snackBar.open('Tx was canceled', undefined, { duration: 6000 });
      return;
    }

    const dialogRef = this.loadingDialog.open('Sending');

    let createDelegatorResult: InlineResponse20075 | undefined;
    let txHash: string | undefined;

    try {
      createDelegatorResult = await this.staking.undelegate(
        privateWallet.key_type,
        validatorAddress,
        amount,
        gas,
        fee,
        privateKey,
      );
      txHash = createDelegatorResult.tx_response?.txhash;
      if (txHash === undefined) {
        throw Error('Invalid txHash!');
      }
    } catch (error) {
      console.error(error);
      const msg = (error as Error).toString();
      this.snackBar.open(`An error has occur: ${msg}`, 'Close');
      return;
    } finally {
      dialogRef.close();
    }

    this.snackBar.open('Successfully undelegate the validator', undefined, { duration: 6000 });

    return txHash;
    // await this.router.navigate(['txs', txHash]);
  }
}
