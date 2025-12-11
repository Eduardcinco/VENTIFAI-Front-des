import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { BusinessContextService } from '../services/business-context.service';

@Injectable({ providedIn: 'root' })
export class NegocioGuard implements CanActivate {
  constructor(private auth: AuthService, private biz: BusinessContextService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    const token = this.auth.getToken();
    if (!token) return this.router.parseUrl('/login');
    const negocioId = this.auth.getBusinessId();
    if (!negocioId) {
      // Token sin negocioId => sesión inválida o rol sin tenant
      return this.router.parseUrl('/login');
    }
    return true;
  }
}
