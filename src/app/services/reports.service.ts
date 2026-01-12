/**
 * 📊 SERVICIO DE REPORTES
 * Maneja la obtención de datos y exportación a Excel/PDF
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { BusinessContextService } from './business-context.service';
import { FiltroReporte, ReporteVentasCompleto } from '../interfaces/reporte.interface';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private base = `${environment.apiUrl}/`;

  constructor(private http: HttpClient, private biz: BusinessContextService) {}

  // Modo debug para inspeccionar parámetros y respuestas del backend
  private debugMode = false;
  enableDebug(enable: boolean) { this.debugMode = enable; }

  private buildHeaders(): { headers?: HttpHeaders } {
    const negocioId = this.biz.getNegocioId();
    if (this.biz.shouldSendDebugHeader() && negocioId) {
      return { headers: new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) }) };
    }
    return {};
  }

  // ============================================
  // 🆕 NUEVOS ENDPOINTS DE REPORTES PROFESIONALES
  // ============================================

  /**
   * Obtener reporte de ventas completo con datos para visualizar
   */
  getReporteVentas(filtro: FiltroReporte): Observable<ReporteVentasCompleto> {
    // Algunos backends esperan valores distintos para agrupación; normalizamos aquí
    const agrupacionMap: Record<string, string> = {
      dia: 'PorDia',
      semana: 'PorSemana',
      mes: 'PorMes',
      anio: 'PorAnio'
    };
    const tipoAgrupacionApi = agrupacionMap[filtro.tipoAgrupacion] || filtro.tipoAgrupacion;
    
    // Construir rango con hora y enviar como ISO para evitar problemas de zona horaria
    const inicio = new Date(filtro.fechaInicio);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(filtro.fechaFin);
    fin.setHours(23, 59, 59, 999);
    const fechaInicioISO = inicio.toISOString();
    const fechaFinISO = fin.toISOString();
    const tzOffsetMinutes = -inicio.getTimezoneOffset(); // minutos al este de UTC

    let params = new HttpParams()
      .set('fechaInicio', fechaInicioISO)
      .set('fechaFin', fechaFinISO)
      .set('tipoAgrupacion', tipoAgrupacionApi)
      .set('tzOffsetMinutes', String(tzOffsetMinutes));

    if (filtro.metodoPago) {
      params = params.set('metodoPago', filtro.metodoPago);
    }

    if (filtro.cajerosIds && filtro.cajerosIds.length > 0) {
      filtro.cajerosIds.forEach(id => {
        params = params.append('cajerosIds', id.toString());
      });
    }

    // Adjuntar negocioId si está disponible y el backend lo requiere
    const negocioId = this.biz.getNegocioId();
    if (negocioId) {
      params = params.set('negocioId', String(negocioId));
    }

    if (this.debugMode) {
      console.debug('[ReportsService] GET /reportes/ventas', {
        tipoAgrupacion: tipoAgrupacionApi,
        fechaInicio: fechaInicioISO,
        fechaFin: fechaFinISO,
        tzOffsetMinutes,
        negocioId
      });
    }

    return this.http.get<ReporteVentasCompleto>(`${this.base}/reportes/ventas`, {
      params,
      withCredentials: true,
      ...this.buildHeaders()
    }).pipe(
      tap(resp => {
        if (this.debugMode) {
          console.debug('[ReportsService] Ventas response', resp);
        }
      })
    );
  }

  /**
   * Exportar reporte a Excel o PDF
   * Descarga automáticamente el archivo
   */
  exportarReporte(filtro: FiltroReporte): Observable<Blob> {
    const body = {
      fechaInicio: filtro.fechaInicio,
      fechaFin: filtro.fechaFin,
      tipoAgrupacion: filtro.tipoAgrupacion,
      formato: filtro.formato || 'excel',
      metodoPago: filtro.metodoPago || null,
      cajerosIds: filtro.cajerosIds || []
    };

    return this.http.post(`${this.base}/reportes/ventas/exportar`, body, {
      responseType: 'blob',
      withCredentials: true,
      ...this.buildHeaders()
    }).pipe(
      tap((blob) => {
        const extension = filtro.formato === 'pdf' ? 'pdf' : 'xlsx';
        const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const fileName = `Reporte_Ventas_${fecha}.${extension}`;
        saveAs(blob, fileName);
      }),
      catchError(error => {
        console.error('Error al exportar reporte:', error);
        return throwError(() => new Error('Error al generar el archivo de reporte'));
      })
    );
  }

  /**
   * Exportar a Excel (método de conveniencia)
   */
  exportarExcel(filtro: Omit<FiltroReporte, 'formato'>): Observable<Blob> {
    return this.exportarReporte({ ...filtro, formato: 'excel' });
  }

  /**
   * Exportar a PDF (método de conveniencia)
   */
  exportarPDF(filtro: Omit<FiltroReporte, 'formato'>): Observable<Blob> {
    return this.exportarReporte({ ...filtro, formato: 'pdf' });
  }

  // ============================================
  // ENDPOINTS LEGACY (mantener compatibilidad)
  // ============================================

  // Reportes de ventas
  getVentasPorDia(desde?: string, hasta?: string): Observable<any[]> {
    let params = '';
    if (desde || hasta) {
      params = `?${desde ? `desde=${desde}` : ''}${hasta ? `&hasta=${hasta}` : ''}`;
    }
    return this.http.get<any[]>(`${this.base}/reportes/ventas/dia${params}`, this.buildHeaders());
  }

  getVentasPorSemana(desde?: string, hasta?: string): Observable<any[]> {
    let params = '';
    if (desde || hasta) {
      params = `?${desde ? `desde=${desde}` : ''}${hasta ? `&hasta=${hasta}` : ''}`;
    }
    return this.http.get<any[]>(`${this.base}/reportes/ventas/semana${params}`, this.buildHeaders());
  }

  getVentasPorMes(anio: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/reportes/ventas/mes?anio=${anio}` , this.buildHeaders());
  }

  getVentasPorAnio(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/reportes/ventas/anio`, this.buildHeaders());
  }

  // Reportes de inventario
  getInventario(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/reportes/inventario`, this.buildHeaders());
  }

  getInventarioPorCategoria(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/reportes/inventario/categoria`, this.buildHeaders());
  }

  getInventarioStockBajo(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/reportes/inventario/stock-bajo`, this.buildHeaders());
  }

  // PDFs
  downloadVentaPdf(ventaId: number): Observable<Blob> {
    return this.http.get(`${this.base}/ventas/${ventaId}/pdf`, { responseType: 'blob', ...this.buildHeaders() });
  }

  downloadInventarioPdf(categoria?: string, stockBajo?: boolean): Observable<Blob> {
    let params = '';
    if (categoria || stockBajo) {
      params = `?${categoria ? `categoria=${categoria}` : ''}${stockBajo ? `&stockBajo=${stockBajo}` : ''}`;
    }
    return this.http.get(`${this.base}/producto/inventario-pdf${params}`, { responseType: 'blob', ...this.buildHeaders() });
  }

  /**
   * 🧾 Obtener ventas del cajero del día actual
   * @param userId ID del usuario (cajero)
   */
  getMisVentasHoy(userId: number | string): Observable<any[]> {
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return this.http.get<any[]>(
      `${this.base}/ventas/mis-ventas?fecha=${hoy}&usuarioId=${userId}`,
      this.buildHeaders()
    );
  }
}