import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService, 
    private router: Router,
    private permissions: PermissionsService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // 1. Verificar si está autenticado
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    // 2. Verificar permisos de acceso a la ruta
    const url = state.url;
    
    if (!this.permissions.puedeAccederRuta(url)) {
      // Redirigir a la ruta por defecto según su rol
      const rutaDefault = this.permissions.getRutaDefault();
      console.warn(`[AuthGuard] Acceso denegado a ${url}. Redirigiendo a ${rutaDefault}`);
      this.router.navigate([rutaDefault]);
      return false;
    }

    return true;
  }
}
