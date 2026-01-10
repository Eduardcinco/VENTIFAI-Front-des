import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap, catchError } from 'rxjs/operators';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Interfaz de sesión que viene del backend /api/system/session
 */
export interface SessionInfo {
  userId: number | string;
  rol: string;
  negocioId: number | string;
  email: string;
  name: string;
  primerAcceso?: boolean;
  // 🆕 Permisos extra asignados temporalmente
  permisosExtra?: {
    modulos: string[];
    asignadoPor?: string;
    fechaAsignacion?: string;
    nota?: string;
  };
}

interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  primerAcceso?: boolean;
  usuario?: any;
  negocioId?: number | string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = `${environment.apiUrl}/api/auth`;
  private systemBase = `${environment.apiUrl}/api/system`;
  private refreshEndpoint = `${this.base}/refresh`;

  // 🔐 CACHÉ EN MEMORIA (no en storage)
  private sessionCache: SessionInfo | null = null;
  private sessionLoading = false;
  private session$ = new BehaviorSubject<SessionInfo | null>(null);

  // 🔄 Compatibilidad híbrida: seguimos leyendo de sessionStorage si existe (migración gradual)
  private hybridMode = true;

  constructor(private http: HttpClient) {
    // Al iniciar, intentar cargar sesión si hay algo en storage (modo híbrido)
    if (this.hybridMode) {
      this.loadFromStorageIfExists();
    }
  }

  // ============================================
  // 🔐 MÉTODOS DE AUTENTICACIÓN
  // ============================================

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    const body = { Correo: payload.email, Password: payload.password };
    return this.http.post<AuthResponse>(`${this.base}/login`, body, { withCredentials: true }).pipe(
      tap(res => {
        // El backend ahora setea cookies HttpOnly automáticamente
        // Solo guardamos en memoria/storage para compatibilidad
        this.handleAuthResponse(res);
      })
    );
  }

  register(payload: { businessName?: string; name: string; email: string; password: string }): Observable<AuthResponse> {
    const body: any = { Nombre: payload.name, Correo: payload.email, Password: payload.password };
    if (payload.businessName?.trim()) {
      body.NombreNegocio = payload.businessName.trim();
    }
    return this.http.post<AuthResponse>(`${this.base}/register`, body, { withCredentials: true }).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  /**
   * Refresh token usando cookies HttpOnly
   * El backend lee la cookie refresh_token automáticamente
   */
  refreshToken(): Observable<AuthResponse> {
    console.log('🔄 Intentando refrescar token desde:', this.refreshEndpoint);
    // Enviamos body vacío - el backend usa la cookie
    return this.http.post<AuthResponse>(this.refreshEndpoint, {}, { withCredentials: true }).pipe(
      tap(res => {
        console.log('✅ Token refrescado exitosamente:', res);
        this.handleAuthResponse(res);
      }),
      catchError(err => {
        console.error('❌ Error al refrescar token:', {
          status: err.status,
          statusText: err.statusText,
          message: err.error?.message,
          url: err.url,
          fullError: err
        });
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  /**
   * Logout: llama al backend para limpiar cookies HttpOnly
   */
  logout(): Observable<any> {
    return this.http.post(`${this.base}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.clearSession()),
      catchError(err => {
        // Limpiar de todos modos aunque falle
        this.clearSession();
        return of(null);
      })
    );
  }

  /**
   * 🆕 Obtener datos de sesión desde el backend
   * Útil porque el frontend ya no puede leer el JWT (es HttpOnly)
   */
  getSession(): Observable<SessionInfo> {
    // Si ya tenemos caché válido, devolverlo
    if (this.sessionCache) {
      return of(this.sessionCache);
    }

    return this.http.get<SessionInfo>(`${this.systemBase}/session`, { withCredentials: true }).pipe(
      tap(session => {
        this.sessionCache = session;
        this.session$.next(session);
        // Los permisosExtra ya vienen en la sesión, no necesitamos localStorage
      }),
      catchError(err => {
        // Si falla (401), limpiar sesión
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  /**
   * Observable reactivo de la sesión actual
   */
  get currentSession$(): Observable<SessionInfo | null> {
    return this.session$.asObservable();
  }

  /**
   * 🆕 Obtener sesión actual de forma síncrona (desde caché en memoria)
   * Útil para PermissionsService que necesita acceso síncrono
   */
  getCurrentSession(): SessionInfo | null {
    return this.sessionCache;
  }

  /**
   * Forzar recarga de sesión desde el backend
   */
  refreshSession(): Observable<SessionInfo> {
    this.sessionCache = null;
    return this.getSession();
  }

  // ============================================
  // 🔧 HELPERS DE CONTEXTO (usan caché en memoria)
  // ============================================

  getUserId(): number | string | undefined {
    // Primero caché en memoria
    if (this.sessionCache?.userId) return this.sessionCache.userId;
    // Fallback híbrido
    return this.getFromHybridStorage('userId');
  }

  getBusinessId(): number | string | undefined {
    if (this.sessionCache?.negocioId) return this.sessionCache.negocioId;
    return this.getFromHybridStorage('negocioId');
  }

  getRole(): string | undefined {
    if (this.sessionCache?.rol) return this.sessionCache.rol.toLowerCase();
    const stored = this.getFromHybridStorage('rol');
    return stored ? String(stored).toLowerCase() : undefined;
  }

  getUserName(): string | undefined {
    if (this.sessionCache?.name) return this.sessionCache.name;
    return this.getFromHybridStorage('name');
  }

  getUserEmail(): string | undefined {
    if (this.sessionCache?.email) return this.sessionCache.email;
    return this.getFromHybridStorage('email');
  }

  getCurrentUserId(): number | string | undefined {
    return this.getUserId();
  }

  getEmployeeId(): number | string | undefined {
    const role = this.getRole();
    if (role === 'empleado') return this.getUserId();
    return undefined;
  }

  isDueno(): boolean {
    const role = (this.getRole() || '').toLowerCase().replace('ñ', 'n');
    return ['dueno', 'owner', 'admin', 'dueño'].some(r => role.includes(r));
  }

  getPrimerAcceso(): boolean {
    if (this.sessionCache?.primerAcceso !== undefined) {
      return this.sessionCache.primerAcceso;
    }
    // Fallback híbrido
    const stored = sessionStorage.getItem('primerAcceso');
    return stored === 'true';
  }

  /**
   * Verificar si hay sesión activa (basado en caché o storage híbrido)
   */
  isAuthenticated(): boolean {
    if (this.sessionCache) return true;
    // Fallback híbrido
    return !!sessionStorage.getItem('accessToken') || !!sessionStorage.getItem('usuario');
  }

  /**
   * Obtener token (solo para compatibilidad con interceptor híbrido)
   * En modo 100% cookies, esto devolvería undefined
   */
  getToken(): string | undefined {
    if (!this.hybridMode) return undefined;
    return sessionStorage.getItem('accessToken') || undefined;
  }

  getRefreshToken(): string | undefined {
    if (!this.hybridMode) return undefined;
    return sessionStorage.getItem('refreshToken') || undefined;
  }

  getCurrentUser(): any | null {
    if (this.sessionCache) {
      return {
        id: this.sessionCache.userId,
        nombre: this.sessionCache.name,
        correo: this.sessionCache.email,
        rol: this.sessionCache.rol,
        negocioId: this.sessionCache.negocioId
      };
    }
    try {
      const stored = sessionStorage.getItem('usuario');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }

  // ============================================
  // 🔄 MÉTODOS DE EMPLEADOS Y PERFIL
  // ============================================

  createEmployee(payload: { Nombre: string; Apellido1: string; Apellido2?: string | null; Telefono: string; SueldoDiario?: number | null }): Observable<any> {
    return this.http.post<any>(`${this.base}/empleado`, payload, { withCredentials: true });
  }

  getUserProfile(): Observable<any> {
    return this.http.get(`${this.base}/perfil`, { withCredentials: true });
  }

  deleteProfilePhoto(): Observable<any> {
    return this.http.delete(`${this.base}/perfil/foto`, { withCredentials: true });
  }

  cambiarPasswordPrimerAcceso(nuevaPassword: string): Observable<any> {
    return this.http.put(`${this.base}/primer-acceso`, { NuevaPassword: nuevaPassword }, { withCredentials: true }).pipe(
      tap(() => {
        // Actualizar caché
        if (this.sessionCache) {
          this.sessionCache.primerAcceso = false;
        }
        sessionStorage.setItem('primerAcceso', 'false');
      })
    );
  }

  setRefreshEndpoint(url: string) {
    this.refreshEndpoint = url;
  }

  // ============================================
  // 🔧 MÉTODOS INTERNOS
  // ============================================

  private handleAuthResponse(res: AuthResponse) {
    // Guardar en memoria
    if (res.usuario) {
      this.sessionCache = {
        userId: res.usuario.id || res.usuario.userId,
        rol: res.usuario.rol || res.usuario.Rol,
        negocioId: res.usuario.negocioId || res.negocioId,
        email: res.usuario.correo || res.usuario.email,
        name: res.usuario.nombre || res.usuario.name,
        primerAcceso: res.primerAcceso,
        // Los permisosExtra vienen del backend
        permisosExtra: res.usuario.permisosExtra || res['permisosExtra']
      };
      this.session$.next(this.sessionCache);
    }

    // Modo híbrido: también guardar en sessionStorage para compatibilidad
    if (this.hybridMode) {
      if (res.accessToken || res.token) {
        sessionStorage.setItem('accessToken', res.accessToken || res.token || '');
      }
      if (res.refreshToken) {
        sessionStorage.setItem('refreshToken', res.refreshToken);
      }
      if (res.usuario) {
        sessionStorage.setItem('usuario', JSON.stringify(res.usuario));
      }
      if (res.usuario?.negocioId || res.negocioId) {
        sessionStorage.setItem('negocioId', String(res.usuario?.negocioId || res.negocioId));
      }
      if (typeof res.primerAcceso === 'boolean') {
        sessionStorage.setItem('primerAcceso', String(res.primerAcceso));
      }
    }
  }

  private clearSession() {
    this.sessionCache = null;
    this.session$.next(null);
    
    // Limpiar storage (modo híbrido)
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('negocioId');
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('primerAcceso');
  }

  private loadFromStorageIfExists() {
    try {
      const usuario = sessionStorage.getItem('usuario');
      if (usuario) {
        const u = JSON.parse(usuario);
        this.sessionCache = {
          userId: u.id || u.userId,
          rol: u.rol || u.Rol || '',
          negocioId: u.negocioId || sessionStorage.getItem('negocioId') || '',
          email: u.correo || u.email || '',
          name: u.nombre || u.name || '',
          primerAcceso: sessionStorage.getItem('primerAcceso') === 'true'
        };
        this.session$.next(this.sessionCache);
      }
    } catch {}
  }

  private getFromHybridStorage(key: string): any {
    if (!this.hybridMode) return undefined;
    
    try {
      // Intentar desde usuario guardado
      const usuario = sessionStorage.getItem('usuario');
      if (usuario) {
        const u = JSON.parse(usuario);
        switch (key) {
          case 'userId': return u.id || u.userId;
          case 'rol': return u.rol || u.Rol;
          case 'negocioId': return u.negocioId || sessionStorage.getItem('negocioId');
          case 'email': return u.correo || u.email;
          case 'name': return u.nombre || u.name;
        }
      }
      // Fallback directo
      if (key === 'negocioId') return sessionStorage.getItem('negocioId');
    } catch {}
    return undefined;
  }
}
