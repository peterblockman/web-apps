import { WalletGuard } from '../../models/wallets/wallet.guard';
import { CreateValidatorComponent } from './create-validator/create-validator.component';
import { SimpleComponent } from './create-validator/simple/simple.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'create-validator',
    component: CreateValidatorComponent,
    canActivate: [WalletGuard],
  },
  {
    path: 'create-validator/simple',
    component: SimpleComponent,
    canActivate: [WalletGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StakingRoutingModule {}
