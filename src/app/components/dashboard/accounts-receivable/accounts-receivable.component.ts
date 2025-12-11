import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-accounts-receivable',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-root">
      <h2>Cuentas por cobrar</h2>
      <p class="subtitle">Listado de facturas pendientes y clientes morosos.</p>
    </div>
  `,
  styles: [`.page-root{padding:1rem}.subtitle{color:#666}`]
})
export class AccountsReceivableComponent {}
