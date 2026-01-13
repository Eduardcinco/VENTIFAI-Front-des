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
  private base = `${environment.apiUrl}/auth`;
  private systemBase = `${environment.apiUrl}/system`;
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
  
  // TEMPORAL: URL completa para que entre
  const url = 'https://ventifai-back-des-production.up.railway.app/api/auth/login';  // si tu ruta en backend es /api/auth/login

  return this.http.post<AuthResponse>(url, body, { withCredentials: true }).pipe(
    tap(res => {
      console.log('✅ Login exitoso, respuesta:', res);
      this.handleAuthResponse(res);
      console.log('📋 Cookies después del login:', document.cookie);
    }),
    catchError(err => {
      console.error('❌ Error login:', err);
      return throwError(() => err);
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
    // DEBUG: Mostrar todas las cookies disponibles en el navegador
    console.log('🔄 Intentando refrescar token desde:', this.refreshEndpoint);
    console.log('📋 Cookies en el navegador:', document.cookie);
    console.log('🔍 UserAgent:', navigator.userAgent);

    // Detectar si la cookie refresh_token existe
    const hasRefreshCookie = document.cookie.split(';').some(c => c.trim().startsWith('refresh_token='));
    let body: any = {};
    if (!hasRefreshCookie) {
      // Si no existe la cookie, usar el valor de sessionStorage
      const storedRefreshToken = sessionStorage.getItem('refreshToken');
      if (storedRefreshToken) {
        body = { refreshToken: storedRefreshToken };
        console.log('⚠️ Enviando refreshToken en el body:', body);
      } else {
        console.warn('❌ No hay refresh_token en cookie ni en sessionStorage');
      }
    }
    return this.http.post<AuthResponse>(this.refreshEndpoint, body, { withCredentials: true }).pipe(
      tap(res => {
        console.log('✅ Token refrescado exitosamente:', res);
        this.handleAuthResponse(res);
      }),
      catchError(err => {
        console.error('❌ Error al refrescar token:', {
          status: err.status,
          statusText: err.statusText,
          message: err.error?.message,
          debugInfo: err.error?.debug,
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
    // Si ya tenemos caché válido, devolverlo INMEDIATAMENTE
    if (this.sessionCache && this.sessionCache.name && this.sessionCache.rol) {
      console.log('📦 Usando sesión en caché (válida):', { name: this.sessionCache.name, rol: this.sessionCache.rol });
      return of(this.sessionCache);
    }
    return this.http.get<SessionInfo>(`${this.systemBase}/session`, { withCredentials: true }).pipe(
      tap(session => {
        // Si el backend responde con nombre y rol válidos, actualizar caché
        if (session && session.name && session.rol) {
          const normalizedSession: SessionInfo = {
            ...session,
            rol: (session.rol || '').toLowerCase(),
            name: session.name || 'Usuario'
          };
          this.sessionCache = normalizedSession;
          this.session$.next(normalizedSession);
          console.log('✅ Sesión refrescada desde backend:', { name: normalizedSession.name, rol: normalizedSession.rol });
        } else {
          // Backend respondió sin datos válidos → intentar recuperar desde storage
          console.warn('⚠️ Backend devolvió sesión inválida, intentando recuperar desde storage...');
          this.loadFromStorageIfExists();
          if (!this.sessionCache) {
            this.clearSession();
          }
        }
      }),
      catchError(err => {
        // Si falla (404/401/etc), NO limpiar inmediatamente
        console.warn('⚠️ getSession() falló (status:', err.status, '), intentando recuperar desde storage...');
        
        // Intentar recuperar sesión desde storage (fallback)
        this.loadFromStorageIfExists();
        
        // Si aún hay datos en caché, devolverlos (no limpiar)
        if (this.sessionCache && this.sessionCache.name && this.sessionCache.rol) {
          console.log('✅ Sesión recuperada desde storage (fallback):', { name: this.sessionCache.name, rol: this.sessionCache.rol });
          return of(this.sessionCache);
        }
        
        // Solo si NO hay nada en ningún lado, limpiar y fallar
        console.error('❌ No hay sesión válida en ningún lado, limpiando...');
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
    // 🔒 NUNCA devolver undefined si hay un nombre en caché
    if (this.sessionCache?.name && this.sessionCache.name !== 'Usuario') {
      return this.sessionCache.name;
    }
    // Fallback a storage
    const stored = this.getFromHybridStorage('name');
    if (stored) return String(stored);
    // Solo si no hay nada en ningún lado, devolver undefined
    return undefined;
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
    // Guardar en memoria con validación estricta
    if (res.usuario) {
      const userName = res.usuario.nombre || res.usuario.name || 'Usuario';
      const userRole = res.usuario.rol || res.usuario.Rol || 'cajero';
      
      this.sessionCache = {
        userId: res.usuario.id || res.usuario.userId,
        rol: userRole.toLowerCase(), // Normalizar a minúsculas
        negocioId: res.usuario.negocioId || res.negocioId,
        email: res.usuario.correo || res.usuario.email,
        name: userName, // Nunca vacío
        primerAcceso: res.primerAcceso,
        // Los permisosExtra vienen del backend
        permisosExtra: res.usuario.permisosExtra || res['permisosExtra']
      };
      console.log('✅ Sesión cargada en memoria:', { name: this.sessionCache.name, rol: this.sessionCache.rol, userId: this.sessionCache.userId });
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
