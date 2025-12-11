import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = this.auth.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }
    const allowed: string[] = (route.data && (route.data['roles'] as string[])) || [];
    if (allowed.length === 0) return true; // no role required

    const role = (this.auth.getRole() || '').toLowerCase();
    const ok = allowed.map(r => r.toLowerCase()).includes(role);
    if (!ok) {
      // opcional: redirigir a dashboard inicio si no tiene permisos
      this.router.navigate(['/dashboard']);
    }
    return ok;
  }
}
