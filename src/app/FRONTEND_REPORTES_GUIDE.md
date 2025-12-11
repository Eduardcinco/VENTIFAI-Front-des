# 📊 SISTEMA DE REPORTES - GUÍA DE IMPLEMENTACIÓN FRONTEND

## ✅ BACKEND COMPLETADO

El backend está **100% funcional** con:
- ✅ EPPlus 8.3.1 (Excel profesional)
- ✅ QuestPDF 2025.7.4 (PDF profesional)
- ✅ Endpoints REST completamente funcionales
- ✅ DTOs profesionales con toda la información necesaria
- ✅ Servicios de generación con diseño profesional

---

## 🎯 ENDPOINTS DISPONIBLES

### 1. GET: `/api/reportes/ventas`
**Obtener datos del reporte en JSON para visualizar en pantalla**

**Query Parameters:**
- `fechaInicio` (DateTime, requerido): Ej. `2025-01-01`
- `fechaFin` (DateTime, requerido): Ej. `2025-01-31`
- `tipoAgrupacion` (string): `dia`, `semana`, `mes`, `anio` (default: `dia`)
- `metodoPago` (string, opcional): `efectivo`, `tarjeta`, `transferencia`
- `cajerosIds` (int[], opcional): `[1,2,3]`

**Ejemplo de llamada:**
```typescript
GET /api/reportes/ventas?fechaInicio=2025-01-01&fechaFin=2025-01-31&tipoAgrupacion=dia
```

**Respuesta:**
```json
{
  "nombreNegocio": "Mi Negocio",
  "fechaGeneracion": "2025-12-02T10:30:00",
  "tipoReporte": "Ventas por dia",
  "fechaInicio": "2025-01-01",
  "fechaFin": "2025-01-31",
  "resumenGeneral": {
    "periodo": "Resumen General",
    "totalVentas": 150,
    "totalIngresos": 45000.00,
    "totalSubtotal": 38793.10,
    "totalIva": 6206.90,
    "totalDescuentos": 0,
    "ticketPromedio": 300.00,
    "ventaMaxima": 1500.00,
    "ventaMinima": 50.00,
    "cajerosActivos": 3,
    "clientesUnicos": 45,
    "totalEfectivo": 25000.00,
    "totalTarjeta": 15000.00,
    "totalTransferencia": 5000.00,
    "ventasEfectivo": 80,
    "ventasTarjeta": 50,
    "ventasTransferencia": 20
  },
  "datosPorPeriodo": [
    {
      "periodo": "2025-01-01",
      "fechaInicio": "2025-01-01T08:00:00",
      "fechaFin": "2025-01-01T20:30:00",
      "totalVentas": 5,
      "totalIngresos": 1500.00,
      "ticketPromedio": 300.00,
      ...
    }
  ],
  "topProductos": [
    {
      "productoId": 1,
      "productoNombre": "Coca Cola 600ml",
      "codigoBarras": "7501234567890",
      "categoriaNombre": "Bebidas",
      "cantidadVendida": 120,
      "totalVentas": 1800.00,
      "numeroTransacciones": 85,
      "precioPromedio": 15.00
    }
  ]
}
```

---

### 2. POST: `/api/reportes/ventas/exportar`
**Exportar el reporte a Excel o PDF para descargar**

**Body:**
```json
{
  "fechaInicio": "2025-01-01",
  "fechaFin": "2025-01-31",
  "tipoAgrupacion": "dia",
  "formato": "excel"
}
```

**Campos del Body:**
- `fechaInicio` (DateTime, requerido)
- `fechaFin` (DateTime, requerido)
- `tipoAgrupacion` (string): `dia`, `semana`, `mes`, `anio`
- `formato` (string): `excel` o `pdf`
- `metodoPago` (string, opcional): filtro
- `cajerosIds` (int[], opcional): filtro

**Respuesta:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (Excel)
- Content-Type: `application/pdf` (PDF)
- Archivo descargable con nombre: `Reporte_Ventas_20251202_103000.xlsx`

---

## 🚀 IMPLEMENTACIÓN EN ANGULAR

### PASO 1: Instalar librerías

```bash
cd FRONT
npm install chart.js ng2-charts file-saver
npm install --save-dev @types/file-saver
```

### PASO 2: Crear interfaces TypeScript

**`src/app/interfaces/reporte.interface.ts`:**
```typescript
export interface FiltroReporte {
  fechaInicio: string; // 'YYYY-MM-DD'
  fechaFin: string;
  tipoAgrupacion: 'dia' | 'semana' | 'mes' | 'anio';
  formato?: 'excel' | 'pdf';
  metodoPago?: 'efectivo' | 'tarjeta' | 'transferencia';
  cajerosIds?: number[];
}

export interface ReporteVentasCompleto {
  nombreNegocio: string;
  fechaGeneracion: string;
  tipoReporte: string;
  fechaInicio: string;
  fechaFin: string;
  resumenGeneral: ReporteVentasAgregado;
  datosPorPeriodo: ReporteVentasAgregado[];
  topProductos: ProductoMasVendido[];
}

export interface ReporteVentasAgregado {
  periodo: string;
  fechaInicio: string;
  fechaFin?: string;
  totalVentas: number;
  totalIngresos: number;
  totalSubtotal: number;
  totalIva: number;
  totalDescuentos: number;
  ticketPromedio: number;
  ventaMaxima: number;
  ventaMinima: number;
  cajerosActivos: number;
  clientesUnicos: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  ventasEfectivo: number;
  ventasTarjeta: number;
  ventasTransferencia: number;
}

export interface ProductoMasVendido {
  productoId: number;
  productoNombre: string;
  codigoBarras?: string;
  categoriaNombre?: string;
  cantidadVendida: number;
  totalVentas: number;
  numeroTransacciones: number;
  precioPromedio: number;
}
```

### PASO 3: Crear servicio de reportes

**`src/app/services/reportes.service.ts`:**
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FiltroReporte, ReporteVentasCompleto } from '../interfaces/reporte.interface';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private apiUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  getReporteVentas(filtro: FiltroReporte): Observable<ReporteVentasCompleto> {
    let params = new HttpParams()
      .set('fechaInicio', filtro.fechaInicio)
      .set('fechaFin', filtro.fechaFin)
      .set('tipoAgrupacion', filtro.tipoAgrupacion);

    if (filtro.metodoPago) {
      params = params.set('metodoPago', filtro.metodoPago);
    }

    return this.http.get<ReporteVentasCompleto>(`${this.apiUrl}/ventas`, { 
      params,
      withCredentials: true 
    });
  }

  exportarReporte(filtro: FiltroReporte): void {
    this.http.post(`${this.apiUrl}/ventas/exportar`, filtro, {
      responseType: 'blob',
      withCredentials: true
    }).subscribe({
      next: (blob) => {
        const extension = filtro.formato === 'pdf' ? 'pdf' : 'xlsx';
        const fileName = `Reporte_Ventas_${new Date().getTime()}.${extension}`;
        saveAs(blob, fileName);
      },
      error: (error) => {
        console.error('Error al exportar:', error);
        alert('Error al generar el archivo');
      }
    });
  }
}
```

### PASO 4: Componente de reportes

**`reportes.component.ts` (estructura básica):**
```typescript
import { Component, OnInit } from '@angular/core';
import { ReportesService } from '../../services/reportes.service';
import { FiltroReporte, ReporteVentasCompleto } from '../../interfaces/reporte.interface';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent implements OnInit {
  // Filtros
  filtro: FiltroReporte = {
    fechaInicio: this.getFirstDayOfMonth(),
    fechaFin: this.getToday(),
    tipoAgrupacion: 'dia'
  };

  // Datos
  reporte?: ReporteVentasCompleto;
  loading = false;

  // Opciones de agrupación
  tiposAgrupacion = [
    { value: 'dia', label: 'Por Día' },
    { value: 'semana', label: 'Por Semana' },
    { value: 'mes', label: 'Por Mes' },
    { value: 'anio', label: 'Por Año' }
  ];

  constructor(private reportesService: ReportesService) {}

  ngOnInit(): void {
    this.cargarReporte();
  }

  cargarReporte(): void {
    this.loading = true;
    this.reportesService.getReporteVentas(this.filtro).subscribe({
      next: (data) => {
        this.reporte = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.loading = false;
        alert('Error al cargar el reporte');
      }
    });
  }

  exportarExcel(): void {
    this.reportesService.exportarReporte({ ...this.filtro, formato: 'excel' });
  }

  exportarPDF(): void {
    this.reportesService.exportarReporte({ ...this.filtro, formato: 'pdf' });
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getFirstDayOfMonth(): string {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  }
}
```

### PASO 5: Template HTML básico

**`reportes.component.html`:**
```html
<div class="reportes-container">
  <h1>Reportes de Ventas</h1>

  <!-- Filtros -->
  <mat-card class="filtros-card">
    <mat-card-content>
      <div class="filtros-row">
        <!-- Fecha Inicio -->
        <mat-form-field>
          <mat-label>Fecha Inicio</mat-label>
          <input matInput type="date" [(ngModel)]="filtro.fechaInicio">
        </mat-form-field>

        <!-- Fecha Fin -->
        <mat-form-field>
          <mat-label>Fecha Fin</mat-label>
          <input matInput type="date" [(ngModel)]="filtro.fechaFin">
        </mat-form-field>

        <!-- Agrupación -->
        <mat-form-field>
          <mat-label>Agrupación</mat-label>
          <mat-select [(ngModel)]="filtro.tipoAgrupacion">
            <mat-option *ngFor="let tipo of tiposAgrupacion" [value]="tipo.value">
              {{tipo.label}}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Botones -->
        <button mat-raised-button color="primary" (click)="cargarReporte()" [disabled]="loading">
          <mat-icon>search</mat-icon> Generar
        </button>

        <button mat-raised-button color="accent" (click)="exportarExcel()">
          <mat-icon>download</mat-icon> Excel
        </button>

        <button mat-raised-button color="warn" (click)="exportarPDF()">
          <mat-icon>picture_as_pdf</mat-icon> PDF
        </button>
      </div>
    </mat-card-content>
  </mat-card>

  <!-- Loading -->
  <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>

  <!-- KPIs -->
  <div *ngIf="reporte" class="kpis-grid">
    <mat-card class="kpi-card">
      <mat-card-header>Total Ventas</mat-card-header>
      <mat-card-content>
        <h2>{{reporte.resumenGeneral.totalVentas}}</h2>
      </mat-card-content>
    </mat-card>

    <mat-card class="kpi-card">
      <mat-card-header>Total Ingresos</mat-card-header>
      <mat-card-content>
        <h2>${{reporte.resumenGeneral.totalIngresos | number:'1.2-2'}}</h2>
      </mat-card-content>
    </mat-card>

    <mat-card class="kpi-card">
      <mat-card-header>Ticket Promedio</mat-card-header>
      <mat-card-content>
        <h2>${{reporte.resumenGeneral.ticketPromedio | number:'1.2-2'}}</h2>
      </mat-card-content>
    </mat-card>

    <mat-card class="kpi-card">
      <mat-card-header>Clientes Únicos</mat-card-header>
      <mat-card-content>
        <h2>{{reporte.resumenGeneral.clientesUnicos}}</h2>
      </mat-card-content>
    </mat-card>
  </div>

  <!-- Tabla de datos por período -->
  <mat-card *ngIf="reporte">
    <mat-card-header>
      <mat-card-title>Datos por Período</mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <table mat-table [dataSource]="reporte.datosPorPeriodo">
        <ng-container matColumnDef="periodo">
          <th mat-header-cell *matHeaderCellDef>Período</th>
          <td mat-cell *matCellDef="let dato">{{dato.periodo}}</td>
        </ng-container>

        <ng-container matColumnDef="ventas">
          <th mat-header-cell *matHeaderCellDef>Ventas</th>
          <td mat-cell *matCellDef="let dato">{{dato.totalVentas}}</td>
        </ng-container>

        <ng-container matColumnDef="ingresos">
          <th mat-header-cell *matHeaderCellDef>Ingresos</th>
          <td mat-cell *matCellDef="let dato">${{dato.totalIngresos | number:'1.2-2'}}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="['periodo', 'ventas', 'ingresos']"></tr>
        <tr mat-row *matRowDef="let row; columns: ['periodo', 'ventas', 'ingresos']"></tr>
      </table>
    </mat-card-content>
  </mat-card>

  <!-- Top Productos -->
  <mat-card *ngIf="reporte">
    <mat-card-header>
      <mat-card-title>Top 20 Productos Más Vendidos</mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <table mat-table [dataSource]="reporte.topProductos">
        <ng-container matColumnDef="producto">
          <th mat-header-cell *matHeaderCellDef>Producto</th>
          <td mat-cell *matCellDef="let producto">{{producto.productoNombre}}</td>
        </ng-container>

        <ng-container matColumnDef="cantidad">
          <th mat-header-cell *matHeaderCellDef>Cantidad</th>
          <td mat-cell *matCellDef="let producto">{{producto.cantidadVendida}}</td>
        </ng-container>

        <ng-container matColumnDef="total">
          <th mat-header-cell *matHeaderCellDef>Total</th>
          <td mat-cell *matCellDef="let producto">${{producto.totalVentas | number:'1.2-2'}}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="['producto', 'cantidad', 'total']"></tr>
        <tr mat-row *matRowDef="let row; columns: ['producto', 'cantidad', 'total']"></tr>
      </table>
    </mat-card-content>
  </mat-card>
</div>
```

### PASO 6: CSS básico

```css
.reportes-container {
  padding: 20px;
}

.filtros-card {
  margin-bottom: 20px;
}

.filtros-row {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.kpi-card h2 {
  font-size: 2em;
  margin: 10px 0;
  color: #1976d2;
}

mat-card {
  margin-bottom: 20px;
}

table {
  width: 100%;
}
```

---

## 🎨 MEJORAS PROFESIONALES OPCIONALES

### 1. Agregar Chart.js para gráficas
```typescript
// En el component
import { ChartConfiguration } from 'chart.js';

lineChartData: ChartConfiguration['data'] = {
  labels: [],
  datasets: [
    { data: [], label: 'Ventas' }
  ]
};
```

### 2. Usar Angular Material Date Range Picker
```html
<mat-form-field>
  <mat-label>Rango de fechas</mat-label>
  <mat-date-range-input [rangePicker]="picker">
    <input matStartDate [(ngModel)]="filtro.fechaInicio">
    <input matEndDate [(ngModel)]="filtro.fechaFin">
  </mat-date-range-input>
  <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
  <mat-date-range-picker #picker></mat-date-range-picker>
</mat-form-field>
```

### 3. Paginación en tablas
```html
<mat-paginator [pageSizeOptions]="[10, 25, 50]"></mat-paginator>
```

---

## ✅ RESUMEN

**Backend:** 100% COMPLETO ✅
- Endpoints funcionando
- Excel profesional con EPPlus
- PDF profesional con QuestPDF

**Frontend:** Por implementar
1. Instalar: `chart.js`, `ng2-charts`, `file-saver`
2. Crear interfaces TypeScript
3. Crear servicio de reportes
4. Crear componente con filtros
5. Agregar template HTML
6. Opcional: Chart.js para gráficas

**El backend está listo para usarse de inmediato desde Postman o tu frontend.**
