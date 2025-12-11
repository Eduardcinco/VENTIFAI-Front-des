import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-accounts-payable',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-root">
      <h2>Cuentas por pagar</h2>
      <p class="subtitle">Proveedores y vencimientos pendientes.</p>
    </div>
  `,
  styles: [`.page-root{padding:1rem}.subtitle{color:#666}`]
})
export class AccountsPayableComponent {}
