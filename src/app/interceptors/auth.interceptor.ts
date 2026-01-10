import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, switchMap, catchError } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Interceptor para agregar withCredentials: true a todas las peticiones HTTP
 * Esto permite que las cookies (incluyendo el JWT) se envíen automáticamente
 * en cada request, resolviendo errores 401 de autenticación.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Obtener el token de sessionStorage (donde auth.service lo guarda)
  const token = sessionStorage.getItem('accessToken');

  // Clonar la petición y agregar el header Authorization si hay token
  let authReq = req.clone({
    withCredentials: true
  });
  if (token) {
    authReq = authReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Manejar errores 401 y refrescar el token
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Intentar refrescar el token
        return refreshToken().pipe(
          switchMap((newToken: string) => {
            if (newToken) {
              sessionStorage.setItem('accessToken', newToken);
              // Repetir la petición original con el nuevo token
              const retryReq = req.clone({
                withCredentials: true,
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(retryReq);
            }
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};

// Función para refrescar el token
function refreshToken(): Observable<string> {
  const refreshUrl = `${environment.apiUrl}/api/auth/refresh`;
  // Usar fetch directamente para evitar dependencias circulares
  return new Observable<string>((observer) => {
    fetch(refreshUrl, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          observer.next(data.accessToken);
          observer.complete();
        } else {
          console.error('Refresh failed:', response.status, response.statusText);
          observer.error('No se pudo refrescar el token');
        }
      })
      .catch((err) => {
        console.error('Refresh error:', err);
        observer.error(err);
      });
  });
}
