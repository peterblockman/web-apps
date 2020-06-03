import { Component } from '@angular/core';
import { ActivatedRoute, Router, ActivationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { map, filter, tap } from 'rxjs/operators';
import { CosmosSDKService } from '@model/state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  searchValue$: Observable<string>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public cosmosSDK: CosmosSDKService,
  ) {
    this.searchValue$ = this.router.events.pipe(
      filter((event): event is ActivationEnd => event instanceof ActivationEnd),
      map((event) => {
        const { tx_hash, address } = event.snapshot.params;
        return tx_hash ?? address;
      }),
    );
  }

  onSubmitSDK($event: { url: string; chainID: string }) {
    this.cosmosSDK.update($event.url, $event.chainID);
  }

  async onSubmitSearchValue(value: string) {
    if (value.indexOf('cosmos') === 0) {
      return this.router.navigate(['accounts', value]);
    } else {
      return this.router.navigate(['txs', value]);
    }
  }
}
