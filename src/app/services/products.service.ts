import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { BusinessContextService } from './business-context.service';

export interface Product {
  id?: number;
  nombre?: string;
  // legacy aliases for templates that may still reference english fields
  name?: string;
  descripcion?: string;
  codigoBarras?: string;
  precioCompra?: number;
  precioVenta?: number;
  stockActual?: number;
  // legacy aliases
  stock?: number;
  price?: number;
  stockMinimo?: number;
  unidadMedida?: string;
  imagenUrl?: string;
  categoryId?: number;
  category?: any;
  activo?: boolean;
  // Campos de descuento
  descuentoPorcentaje?: number | null;
  descuentoFechaInicio?: string | null;
  descuentoFechaFin?: string | null;
  descuentoHoraInicio?: string | null;
  descuentoHoraFin?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  // RUTA CORRECTA: http://localhost:5129/api/producto
  private base = `${environment.apiUrl}//producto`;

  constructor(private http: HttpClient, private auth: AuthService, private biz: BusinessContextService) {}

  /**
   * Lista productos con filtro:
   * - 'activos' (default): solo Activo = true
   * - 'todos': Activo true o false
   */
  list(filtro: 'activos' | 'todos' = 'activos') {
    const negocioId = this.auth.getBusinessId();
    let params = new HttpParams().set('filtro', filtro);
    // No enviamos negocioId salvo modo debug
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.get<Product[]>(this.base, { params, headers });
  }

  get(id: number) {
    return this.http.get<Product>(`${this.base}/${id}`);
  }

  create(p: any) {
    // NegocioId lo define el backend desde el JWT; no incluirlo para seguridad
    const body = { ...p };
    const negocioId = this.auth.getBusinessId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.post<Product>(this.base, body, { headers });
  }

  update(id: number, p: any) {
    const body = { ...p }; // negocioId asignado en backend
    const negocioId = this.auth.getBusinessId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.put<Product>(`${this.base}/${id}`, body, { headers });
  }

  delete(id: number) {
    const negocioId = this.auth.getBusinessId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.delete(`${this.base}/${id}`, { headers });
  }

  /**
   * Toggle activar/desactivar producto (soft delete)
   * PUT /api/producto/{id}/activo
   */
  toggleActivo(id: number, activo: boolean) {
    const negocioId = this.auth.getBusinessId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.put(`${this.base}/${id}/activo`, { activo }, { headers });
  }

  // agregar merma (auditable)
  addMerma(id: number, incremento: number, motivo?: string) {
    const negocioId = this.auth.getBusinessId();
    const body: any = { incremento, motivo: motivo || null }; // negocioId backend
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.post(`${this.base}/${id}/merma`, body, { headers });
  }

  // aplicar o remover descuento (solo dueños)
  aplicarDescuento(productoId: number, dto: any): Observable<any> {
    const negocioId = this.auth.getBusinessId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.put(`${this.base}/${productoId}/descuento`, dto, { headers });
  }

  /**
   * Reabastecer producto: actualizar precios y agregar stock
   * Permite cambiar precioCompra, precioVenta, agregar cantidad, merma y stockMinimo
   */
  reabastecer(productoId: number, dto: {
    precioCompra?: number;
    precioVenta?: number;
    cantidadComprada: number;
    merma?: number;
    stockMinimo?: number;
  }): Observable<any> {
    const negocioId = this.auth.getBusinessId();
    const headers = this.biz.shouldSendDebugHeader() && negocioId
      ? new HttpHeaders({ 'X-Debug-Negocio': String(negocioId) })
      : undefined;
    return this.http.post(`${this.base}/${productoId}/reabastecer`, dto, { headers });
  }
}
