/**
 * 📊 COMPONENTE DE REPORTES PROFESIONAL
 * Visualización de datos, gráficas y exportación a Excel/PDF
 */
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule, NgIf, NgFor, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../../services/reports.service';
import { PermissionsService, PermisosPorRol } from '../../../services/permissions.service';
import { AuthService } from '../../../services/auth.service';
import { 
  FiltroReporte, 
  ReporteVentasCompleto, 
  ReporteVentasAgregado,
  ProductoMasVendido,
  TIPOS_AGRUPACION,
  METODOS_PAGO
} from '../../../interfaces/reporte.interface';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit, OnDestroy, AfterViewInit {
  // Referencias a los canvas de las gráficas
  @ViewChild('ventasChart') ventasChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pagosChart') pagosChartRef!: ElementRef<HTMLCanvasElement>;

  // Gráficas
  ventasChart?: Chart;
  pagosChart?: Chart;

  // Filtros
  filtro: FiltroReporte = {
    fechaInicio: this.getFirstDayOfMonth(),
    fechaFin: this.getToday(),
    tipoAgrupacion: 'dia',
    metodoPago: ''
  };

  // Opciones de filtros
  tiposAgrupacion = TIPOS_AGRUPACION;
  metodosPago = METODOS_PAGO;

  // Datos del reporte
  reporte?: ReporteVentasCompleto;
  loading = false;
  error: string | null = null;
  exportando = false;

  // Tab activa
  tabActiva: 'resumen' | 'periodos' | 'productos' = 'resumen';

  // Permisos
  permisos!: PermisosPorRol;
  misVentasHoy: any[] = [];

  constructor(
    private reportsService: ReportsService,
    public permissionsService: PermissionsService,
    private authService: AuthService,
    private router: Router
  ) {
    this.permisos = this.permissionsService.getPermisos();
  }

  ngOnInit(): void {
    // Si solo tiene reportes personales (sin globales), cargar sus ventas
    if (this.permisos.verReportesPropios && !this.permisos.verReportesGlobales) {
      this.loadMisVentasHoy();
    } else {
      this.cargarReporte();
    }

    // Auto-refresh al entrar a Reportes
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd && ev.urlAfterRedirects.includes('/dashboard/reports')) {
        if (this.permisos.verReportesPropios && !this.permisos.verReportesGlobales) {
          this.loadMisVentasHoy();
        } else {
          this.cargarReporte();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    // Las gráficas se inicializarán cuando lleguen los datos
  }

  ngOnDestroy(): void {
    this.ventasChart?.destroy();
    this.pagosChart?.destroy();
  }

  // ============================================
  // 📊 CARGA DE DATOS
  // ============================================

  cargarReporte(): void {
    console.log('[REPORTS DEBUG] Starting cargarReporte...');
    console.log('[REPORTS DEBUG] User role:', this.authService.getRole());
    console.log('[REPORTS DEBUG] Filtro:', this.filtro);
    console.log('[REPORTS DEBUG] Permisos:', this.permisos);
    
    if (!this.filtro.fechaInicio || !this.filtro.fechaFin) {
      console.error('[REPORTS DEBUG] Missing dates!');
      this.error = 'Selecciona las fechas de inicio y fin';
      return;
    }

    this.loading = true;
    console.log('[REPORTS DEBUG] Loading set to true, calling API...');
    this.error = null;

    this.reportsService.getReporteVentas(this.filtro).subscribe({
      next: (data) => {
        console.log('[REPORTS DEBUG] Data received:', data);
        this.reporte = data;
        this.loading = false;
        
        // Asegurar que el tab de gráficas esté activo y actualizar después del DOM
        this.tabActiva = 'resumen';
        console.log('[REPORTS DEBUG] Tab set to resumen, waiting 150ms for charts...');
        setTimeout(() => {
          this.actualizarGraficas();
        }, 150);
      },
      error: (err) => {
        console.error('Error cargando reporte:', err);
        console.error('[REPORTS DEBUG] Full error object:', JSON.stringify(err));
        this.error = err.error?.message || 'Error al cargar el reporte. Intenta de nuevo.';
        this.loading = false;
      }
    });
  }

  // ============================================
  // 📈 GRÁFICAS CON CHART.JS
  // ============================================

  actualizarGraficas(): void {
    if (!this.reporte) {
      console.warn('📊 No hay datos de reporte para las gráficas');
      return;
    }
    
    if (!this.ventasChartRef?.nativeElement || !this.pagosChartRef?.nativeElement) {
      console.warn('📊 Canvas elements no están disponibles aún');
      return;
    }
    
    console.log('✅ Creando gráficas...');
    this.crearGraficaVentas();
    this.crearGraficaPagos();
  }

  crearGraficaVentas(): void {
    if (!this.ventasChartRef?.nativeElement || !this.reporte) return;

    // Destruir gráfica anterior si existe
    this.ventasChart?.destroy();

    const datos = this.reporte.datosPorPeriodo;
    const labels = datos.map(d => this.formatPeriodoLabel(d.periodo));
    const ingresos = datos.map(d => d.totalIngresos);
    const ventas = datos.map(d => d.totalVentas);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos ($)',
            data: ingresos,
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Cantidad de Ventas',
            data: ventas,
            type: 'line',
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.raw as number;
                if (label.includes('Ingresos')) {
                  return `${label}: $${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
                }
                return `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Ingresos ($)'
            },
            ticks: {
              callback: (value) => '$' + Number(value).toLocaleString('es-MX')
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Cantidad'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    };

    this.ventasChart = new Chart(this.ventasChartRef.nativeElement, config);
  }

  crearGraficaPagos(): void {
    if (!this.pagosChartRef?.nativeElement || !this.reporte) return;

    // Destruir gráfica anterior si existe
    this.pagosChart?.destroy();

    const resumen = this.reporte.resumenGeneral;
    
    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Efectivo', 'Tarjeta', 'Transferencia'],
        datasets: [{
          data: [
            resumen.totalEfectivo,
            resumen.totalTarjeta,
            resumen.totalTransferencia
          ],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',  // Verde - Efectivo
            'rgba(59, 130, 246, 0.8)',  // Azul - Tarjeta
            'rgba(139, 92, 246, 0.8)'   // Morado - Transferencia
          ],
          borderColor: [
            'rgb(16, 185, 129)',
            'rgb(59, 130, 246)',
            'rgb(139, 92, 246)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = resumen.totalEfectivo + resumen.totalTarjeta + resumen.totalTransferencia;
                const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: $${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${porcentaje}%)`;
              }
            }
          }
        }
      }
    };

    this.pagosChart = new Chart(this.pagosChartRef.nativeElement, config);
  }

  formatPeriodoLabel(periodo: string): string {
    if (!periodo) return '';
    
    // Si es una fecha ISO, formatear
    if (periodo.includes('-')) {
      const date = new Date(periodo);
      if (!isNaN(date.getTime())) {
        const options: Intl.DateTimeFormatOptions = 
          this.filtro.tipoAgrupacion === 'dia' 
            ? { day: '2-digit', month: 'short' }
            : this.filtro.tipoAgrupacion === 'semana'
            ? { day: '2-digit', month: 'short' }
            : this.filtro.tipoAgrupacion === 'mes'
            ? { month: 'short', year: 'numeric' }
            : { year: 'numeric' };
        return date.toLocaleDateString('es-MX', options);
      }
    }
    return periodo;
  }

  // ============================================
  // 📥 EXPORTACIÓN
  // ============================================

  exportarExcel(): void {
    this.exportando = true;
    this.reportsService.exportarExcel(this.filtro).subscribe({
      next: () => {
        this.exportando = false;
      },
      error: (err) => {
        console.error('Error exportando Excel:', err);
        this.error = 'Error al generar el archivo Excel';
        this.exportando = false;
      }
    });
  }

  exportarPDF(): void {
    this.exportando = true;
    this.reportsService.exportarPDF(this.filtro).subscribe({
      next: () => {
        this.exportando = false;
      },
      error: (err) => {
        console.error('Error exportando PDF:', err);
        this.error = 'Error al generar el archivo PDF';
        this.exportando = false;
      }
    });
  }

  // ============================================
  // 🧾 VISTA CAJERO - MIS VENTAS DEL DÍA
  // ============================================

  loadMisVentasHoy(): void {
    console.log('[REPORTS DEBUG - CAJERO] Loading mis ventas hoy...');
    const userId = this.authService.getUserId();
    console.log('[REPORTS DEBUG - CAJERO] User ID:', userId);
    if (!userId) {
      console.error('[REPORTS DEBUG - CAJERO] No user ID found!');
      this.loading = false;
      return;
    }

    this.loading = true;
    console.log('[REPORTS DEBUG - CAJERO] Calling getMisVentasHoy API...');
    this.reportsService.getMisVentasHoy(userId).subscribe({
      next: (data) => {
        console.log('[REPORTS DEBUG - CAJERO] Data received:', data);
        this.misVentasHoy = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando mis ventas de hoy:', error);
        console.error('[REPORTS DEBUG - CAJERO] Full error:', JSON.stringify(error));
        this.loading = false;
      }
    });
  }

  getTotalMisVentas(): number {
    return this.misVentasHoy.reduce((sum, v) => sum + (v.total || v.montoTotal || 0), 0);
  }

  getCantidadVentas(): number {
    return this.misVentasHoy.length;
  }

  // ============================================
  // 🛠️ UTILIDADES
  // ============================================

  cambiarTab(tab: 'resumen' | 'periodos' | 'productos'): void {
    this.tabActiva = tab;
    
    // Si cambiamos al tab de gráficas y hay datos, recrear las gráficas
    if (tab === 'resumen' && this.reporte) {
      setTimeout(() => {
        this.actualizarGraficas();
      }, 100);
    }
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getFirstDayOfMonth(): string {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  }

  // Helpers para el template
  toLocal(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-MX');
  }

  getVariacionPorcentaje(actual: number, anterior: number): string {
    if (anterior === 0) return actual > 0 ? '+100%' : '0%';
    const variacion = ((actual - anterior) / anterior) * 100;
    const signo = variacion >= 0 ? '+' : '';
    return `${signo}${variacion.toFixed(1)}%`;
  }

  getMetodoPagoIcon(metodo: string): string {
    switch (metodo?.toLowerCase()) {
      case 'efectivo': return '💵';
      case 'tarjeta': return '💳';
      case 'transferencia': return '🏦';
      default: return '💰';
    }
  }
}
