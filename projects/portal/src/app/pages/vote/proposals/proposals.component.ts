import { GovApplicationService } from '../../../models/cosmos/gov.application.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { rest } from '@cosmos-client/core';
import {
  InlineResponse20052FinalTallyResult,
  InlineResponse20052Proposals,
} from '@cosmos-client/core/esm/openapi/api';
import { CosmosSDKService } from 'projects/explorer/src/app/models/cosmos-sdk.service';
import { combineLatest, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

@Component({
  selector: 'app-proposals',
  templateUrl: './proposals.component.html',
  styleUrls: ['./proposals.component.css'],
})
export class ProposalsComponent implements OnInit {
  proposals$: Observable<InlineResponse20052Proposals[]>;
  tallies$: Observable<(InlineResponse20052FinalTallyResult | undefined)[]>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly cosmosSDK: CosmosSDKService,
    private readonly govAppService: GovApplicationService,
  ) {
    this.proposals$ = this.cosmosSDK.sdk$.pipe(
      mergeMap((sdk) => rest.gov.proposals(sdk.rest)),
      map((result) => result.data.proposals!.reverse()),
    );
    this.tallies$ = combineLatest([this.cosmosSDK.sdk$, this.proposals$]).pipe(
      mergeMap(([sdk, proposals]) =>
        Promise.all(
          proposals.map((proposal) =>
            rest.gov.tallyresult(sdk.rest, proposal.proposal_id!).catch((err) => {
              console.log(err);
              return;
            }),
          ),
        ),
      ),
      map((result) => result.map((res) => res?.data.tally)),
    );
  }

  ngOnInit(): void {}

  onVoteProposal(proposalID: number) {
    this.govAppService.openVoteFormDialog(proposalID);
  }
}
