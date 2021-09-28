import { CosmosSDKService } from '../../../models/cosmos-sdk.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { cosmosclient, rest, proto } from 'cosmos-client';
import { combineLatest, Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  address$: Observable<cosmosclient.AccAddress>;
  account$: Observable<proto.cosmos.auth.v1beta1.BaseAccount | unknown | undefined>;
  balances$: Observable<proto.cosmos.base.v1beta1.ICoin[]>;

  constructor(private route: ActivatedRoute, private cosmosSDK: CosmosSDKService) {
    this.address$ = this.route.params.pipe(
      map((params) => params.address),
      map((addr) => cosmosclient.AccAddress.fromString(addr)),
    );

    const combined$ = combineLatest([this.cosmosSDK.sdk$, this.address$]);

    this.account$ = combined$.pipe(
      mergeMap(([sdk, address]) =>
        rest.cosmos.auth
          .account(sdk.rest, address)
          .then((res) => res.data && cosmosclient.codec.unpackCosmosAny(res.data.account))
          .catch((_) => {
            console.error(_);
            return undefined;
          }),
      ),
    );

    this.balances$ = combined$.pipe(
      mergeMap(([sdk, address]) =>
        rest.cosmos.bank.allBalances(sdk.rest, address).then((res) => res.data.balances || []),
      ),
    );
  }

  ngOnInit() {}
}