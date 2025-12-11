import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * BusinessContextService
 * Fuente central de negocioId (tenant) derivado del JWT. No acepta sobrescritura desde cliente.
 * Expone observable para componentes que necesiten reaccionar a cambios (login/logout).
 * Permite activar opcionalmente envío de cabecera X-Debug-Negocio solo en desarrollo interno.
 */
@Injectable({ providedIn: 'root' })
export class BusinessContextService {
  private negocioIdSubject = new BehaviorSubject<number | string | null>(null);
  negocioId$ = this.negocioIdSubject.asObservable();

  // Flag interna para enviar header de depuración. Mantener en false en producción.
  private debugHeaders = true;

  constructor(private auth: AuthService) {
    this.refresh();
  }

  refresh() {
    const id = this.auth.getBusinessId();
    this.negocioIdSubject.next(id ? id : null);
  }

  getNegocioId(): number | string | null {
    return this.negocioIdSubject.value;
  }

  enableDebugHeaders(enable: boolean) { this.debugHeaders = enable; }
  shouldSendDebugHeader(): boolean { return this.debugHeaders; }
}
