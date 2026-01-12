import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ProductoStockBajo {
  id: number;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  category?: { id: number; name: string };
}

@Injectable({
  providedIn: 'root'
})
export class AlertasService {
  private base = `${environment.apiUrl}/producto`;
  private stockBajoCount$ = new BehaviorSubject<number>(0);
  private productos$ = new BehaviorSubject<ProductoStockBajo[]>([]);

  constructor(private http: HttpClient) {
    this.refresh(); // Cargar al inicio
  }

  getProductosStockBajo(): Observable<ProductoStockBajo[]> {
    return this.http.get<ProductoStockBajo[]>(`${this.base}/stock-bajo`).pipe(
      tap(productos => {
        this.stockBajoCount$.next(productos.length);
        this.productos$.next(productos);
      })
    );
  }

  get stockBajoCount(): Observable<number> {
    return this.stockBajoCount$.asObservable();
  }

  get productosStockBajo(): Observable<ProductoStockBajo[]> {
    return this.productos$.asObservable();
  }

  // ⭐ Método público para refrescar desde cualquier componente
  refresh(): void {
    this.getProductosStockBajo().subscribe({
      error: (err) => console.error('Error cargando alertas de stock:', err)
    });
  }

  // 🔥 Filtrar solo productos críticos (stock = 0)
  getProductosCriticos(): ProductoStockBajo[] {
    return this.productos$.value.filter(p => p.stockActual === 0);
  }
}
