import { Component, OnInit } from '@angular/core';
import { SendOnSubmitEvent } from '@view/cosmos/bank/send/send.component';
import { Observable } from 'rxjs';
import { Key, KeyType } from '@model/keys/key.model';
import { map, mergeMap, filter, tap } from 'rxjs/operators';
import { CosmosSDKService, KeyService } from '@model/index';
import { Coin } from 'cosmos-client/api';
import { AccAddress } from 'cosmos-client';
import { auth } from 'cosmos-client/x/auth';
import { KeyStoreService } from '@model/keys/key.store.service';
import { BankApplicationService } from '@model/cosmos/bank.application.service';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.css'],
})
export class SendComponent implements OnInit {
  key$: Observable<Key | undefined>;
  coins$: Observable<Coin[] | undefined>;
  constructor(
    private readonly cosmosSDK: CosmosSDKService,
    private readonly key: KeyService,
    private readonly keyStore: KeyStoreService,
    private readonly bankApplication: BankApplicationService,
  ) {
    this.key$ = this.keyStore.currentKey$;

    const address$ = this.key$.pipe(
      filter((key): key is Key => key !== undefined),
      map((key) =>
        AccAddress.fromPublicKey(this.key.getPubKey(key!.type, key.public_key)),
      ),
    );

    this.coins$ = address$.pipe(
      mergeMap((address) =>
        auth.accountsAddressGet(this.cosmosSDK.sdk, address),
      ),
      map((result) => result.data.result.coins),
    );
  }

  ngOnInit(): void {}

  async onSubmit($event: SendOnSubmitEvent) {
    await this.bankApplication.send(
      $event.key,
      $event.toAddress,
      $event.amount,
      $event.privateKey,
    );
  }
}