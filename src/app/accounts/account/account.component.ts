import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { auth, BaseAccount } from 'cosmos-client/x/auth';
import { CosmosSDKService } from '@model/state.service';
import { AccAddress } from 'cosmos-client';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  address$: Observable<string>;
  account$: Observable<BaseAccount>;

  constructor(
    private route: ActivatedRoute,
    private cosmosSDK: CosmosSDKService,
  ) {
    this.address$ = this.route.params.pipe(map((params) => params.address));

    this.account$ = this.address$.pipe(
      mergeMap((address) =>
        auth
          .accountsAddressGet(
            this.cosmosSDK.sdk,
            AccAddress.fromBech32(address),
          )
          .then((res) => JSON.parse(res.request?.response ?? '{}'))
      ),
    );
  }

  ngOnInit() { }
}
