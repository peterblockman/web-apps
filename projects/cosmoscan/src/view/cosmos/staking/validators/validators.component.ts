import { Component, OnInit, Input } from '@angular/core';
import { InlineResponse20062Validators, QueryValidatorsResponseIsResponseTypeForTheQueryValidatorsRPCMethod } from 'cosmos-client/openapi/api';
import * as crypto from 'crypto';

@Component({
  selector: 'view-validators',
  templateUrl: './validators.component.html',
  styleUrls: ['./validators.component.css'],
})
export class ValidatorsComponent implements OnInit {
  @Input()
  validators?: QueryValidatorsResponseIsResponseTypeForTheQueryValidatorsRPCMethod | null;

  constructor() {}

  ngOnInit(): void {
    setTimeout(() => {
      console.log('validators', this.validators);
    }, 5000);
  }

  getColorCode(validator: InlineResponse20062Validators) {
    const hash = crypto
      .createHash('sha256')
      .update(Buffer.from(validator.operator_address ?? ''))
      .digest()
      .toString('hex');

    return `#${hash.substr(0, 6)}`;
  }
}