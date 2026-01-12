import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// DTOs
export interface NegocioPerfilDTO {
  nombreNegocio: string;
  rfc: string;
  direccion: string;
  telefono: string;
  correo: string;
  giroComercial: string;
}

export interface BrandingDTO {
  colorPrimario: string;
  colorSecundario: string;
  colorFondo: string;
  colorAcento: string;
  modoOscuro: boolean;
}

export interface CambiarPasswordDTO {
  passwordActual: string;
  passwordNueva: string;
}

export interface CambiarCorreoDTO {
  nuevoCorreo: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = `${environment.apiUrl}/`;

  constructor(private http: HttpClient) { }

  // === PERFIL DEL NEGOCIO ===
  getNegocioPerfil(): Observable<NegocioPerfilDTO> {
    return this.http.get<NegocioPerfilDTO>(`${this.apiUrl}/negocio/perfil`);
  }

  updateNegocioPerfil(dto: NegocioPerfilDTO): Observable<any> {
    return this.http.put(`${this.apiUrl}/negocio/perfil`, dto);
  }

  // === BRANDING ===
  getBranding(): Observable<BrandingDTO> {
    return this.http.get<BrandingDTO>(`${this.apiUrl}/negocio/branding`);
  }

  saveBranding(dto: BrandingDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}/negocio/branding`, dto);
  }

  // === CUENTA ===
  cambiarPassword(dto: CambiarPasswordDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}/usuarios/cambiar-password`, dto);
  }

  cambiarCorreo(dto: CambiarCorreoDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}/usuarios/cambiar-correo`, dto);
  }

  subirFotoPerfil(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/usuarios/foto-perfil`, formData);
  }

  // Variantes para compatibilidad con nuevo flujo
  uploadFotoPerfil(formData: FormData): Observable<{ fotoUrl: string }> {
    return this.http.post<{ fotoUrl: string }>(`${this.apiUrl}/usuarios/foto-perfil`, formData);
  }

  deleteFotoPerfil(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/usuarios/foto-perfil`);
  }

  cerrarSesiones(): Observable<any> {
    // El refresh token se envía automáticamente en la cookie httpOnly
    return this.http.post(`${this.apiUrl}/usuarios/cerrar-sesiones`, {
      mantenerSesionActual: true
    });
  }
}
