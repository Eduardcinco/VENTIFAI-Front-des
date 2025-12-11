import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que verifica si el usuario tiene primer acceso activo.
 * Si es primer acceso, redirige a /primer-login obligatoriamente.
 * Se usa para proteger rutas del dashboard.
 */
export const primerAccesoGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si tiene primer acceso activo, redirigir a modal obligatorio
  if (authService.getPrimerAcceso()) {
    router.navigate(['/primer-login']);
    return false;
  }
  
  return true;
};
