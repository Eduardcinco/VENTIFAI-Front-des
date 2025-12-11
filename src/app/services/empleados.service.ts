import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { BusinessContextService } from './business-context.service';

export interface Empleado {
  id: number;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  correo: string;
  telefono?: string;
  sueldoDiario?: number;
  rol: string;
  rfc?: string;
  numeroSeguroSocial?: string;
  puesto?: string;
  fechaIngreso?: string;
  fotoPerfil?: string;
  password?: string; // Solo disponible después de reset o creación
  // 🆕 Permisos extra temporales
  permisosExtra?: {
    modulos: string[];
    asignadoPor?: string;
    fechaAsignacion?: string;
    nota?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class EmpleadosService {
  private base = `${environment.apiUrl}/api/usuarios`;
  private legacyAuthBase = `${environment.apiUrl}/api/auth`;
  constructor(private http: HttpClient, private biz: BusinessContextService) {}

  getEmpleados(): Observable<Empleado[]> {
    const negocioId = this.biz.getNegocioId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.get<any>(`${this.base}/empleados`, { headers }).pipe(
      map(res => {
        // Backend puede devolver { empleados: [...] } o directamente [...]
        if (res && Array.isArray(res.empleados)) return res.empleados;
        if (Array.isArray(res)) return res;
        return [];
      })
    );
  }

  updateEmpleado(id: number, data: Partial<Empleado>): Observable<void> {
    const negocioId = this.biz.getNegocioId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.put<void>(`${this.base}/${id}`, data, { headers });
  }

  resetPassword(id: number): Observable<{ correo: string; nuevaPassword: string }> {
    const negocioId = this.biz.getNegocioId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.post<{ correo: string; nuevaPassword: string }>(`${this.base}/${id}/reset-password`, {}, { headers });
  }

  /**
   * Actualizar el rol de un empleado
   */
  updateRol(id: number, rol: string): Observable<void> {
    const negocioId = this.biz.getNegocioId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.put<void>(`${this.base}/${id}/rol`, { rol }, { headers });
  }

  /**
   * 🆕 Actualizar permisos extra de un empleado
   * Permite asignar módulos adicionales temporalmente sin cambiar el rol
   */
  updatePermisosExtra(id: number, permisosExtra: {
    modulos: string[];
    asignadoPor?: string;
    nota?: string;
  }): Observable<void> {
    const negocioId = this.biz.getNegocioId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.put<void>(`${this.base}/${id}/permisos-extra`, {
      ...permisosExtra,
      fechaAsignacion: new Date().toISOString()
    }, { headers });
  }

  /**
   * 🆕 Quitar todos los permisos extra de un empleado
   */
  clearPermisosExtra(id: number): Observable<void> {
    const negocioId = this.biz.getNegocioId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.delete<void>(`${this.base}/${id}/permisos-extra`, { headers });
  }

  /**
   * Crear empleado intentando la nueva ruta /api/usuarios/empleados.
   * Si el backend responde 404 o 405, fallback a /api/auth/empleado.
   * Normaliza la respuesta para exponer { empleado, credenciales }.
   */
  createEmpleado(data: {
    Nombre: string; Apellido1: string; Apellido2?: string | null; Telefono: string;
    RFC?: string | null; SueldoDiario?: number | null; FechaIngreso?: string | null;
    NumeroSeguroSocial?: string | null; Puesto?: string;
  }): Observable<any> {
    const negocioId = this.biz.getNegocioId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.post<any>(`${this.base}/empleados`, data, { headers }).pipe(
      catchError((err: HttpErrorResponse) => {
        // Si no existe la ruta nueva (404) o método no permitido (405), fallback a legacy
        if (err.status === 404 || err.status === 405) {
          return this.http.post<any>(`${this.legacyAuthBase}/empleado`, data);
        }
        return throwError(() => err);
      }),
      map(res => {
        // Normalizar respuesta: puede venir en varias formas
        const empleado = res?.empleado || res?.data || res;
        const credenciales = res?.credenciales || {
          correo: res?.correo || res?.email || empleado?.correo,
          password: res?.password || res?.contrasena || res?.Password
        };
        return { empleado, credenciales };
      })
    );
  }
}
