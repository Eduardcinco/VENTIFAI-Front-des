import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { PermissionsService, PermisosPorRol } from '../../../services/permissions.service';
import { jwtDecode } from 'jwt-decode';
import { ProductsService } from '../../../services/products.service';
import { ReportsService } from '../../../services/reports.service';
import { AlertasService } from '../../../services/alertas.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
    imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.css']
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
  currentUser: any = {
    name: 'Usuario',
    businessName: 'Mi Negocio',
    email: 'email@example.com'
  };
  greeting: string = '';
  firstName: string = '';

  // Estadísticas en vivo
  stats = {
    totalProducts: 0,
    todaySales: 0,
    totalRevenue: 0,
    lowStockProducts: 0
  };

  // Productos con bajo stock
  lowStockAlert = true; // Si hay productos con bajo stock
  
  // 🔐 Permisos del usuario actual
  permisos: PermisosPorRol;

  private _navSub?: Subscription;

  constructor(
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private productsService: ProductsService,
    private reportsService: ReportsService,
    private alertasService: AlertasService,
    private router: Router
  ) {
    // Inicializar permisos en el constructor
    this.permisos = this.permissionsService.getPermisos();
  }

  ngOnInit(): void {
    // Obtener datos del usuario logueado
    const token = this.authService.getToken();
    if (token) {
      try {
        this.currentUser = jwtDecode(token);
      } catch {}
    }
    this.setGreeting();
    this.setFirstName();
    this.loadStats();
    // Refrescar al entrar de nuevo a esta vista
    this._navSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.loadStats();
    });
    
    // Suscribirse a cambios de sesión para actualizar permisos
    this.authService.currentSession$.subscribe(session => {
      if (session) {
        this.permisos = this.permissionsService.getPermisos();
      }
    });
  }

  ngOnDestroy(): void {
    this._navSub?.unsubscribe();
  }

  setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Buenos días';
    else if (hour < 19) this.greeting = 'Buenas tardes';
    else this.greeting = 'Buenas noches';
  }

  setFirstName(): void {
    if (this.currentUser?.name) {
      this.firstName = this.currentUser.name.split(' ')[0];
    } else {
      this.firstName = 'Usuario';
    }
  }

  // Acciones rápidas
  newSale(): void {
    console.log('Ir a nueva venta');
  }

  manageInventory(): void {
    console.log('Ir a inventario');
  }

  viewReports(): void {
    console.log('Ir a reportes');
  }

  private loadStats(): void {
    // Productos activos
    this.productsService.list('activos').subscribe({
      next: (products) => {
        this.stats.totalProducts = products?.length || 0;
      },
      error: () => { this.stats.totalProducts = 0; }
    });

    // Stock bajo
    this.alertasService.getProductosStockBajo().subscribe({
      next: (items) => this.stats.lowStockProducts = items?.length || 0,
      error: () => { this.stats.lowStockProducts = 0; }
    });

    // Ventas de hoy (conteo e ingresos) vía reportes
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const fecha = `${y}-${m}-${d}`;
    this.reportsService.getReporteVentas({
      fechaInicio: fecha,
      fechaFin: fecha,
      tipoAgrupacion: 'dia'
    }).subscribe({
      next: (rep) => {
        this.stats.todaySales = rep?.resumenGeneral?.totalVentas || 0;
        this.stats.totalRevenue = rep?.resumenGeneral?.totalIngresos || 0;
      },
      error: () => {
        this.stats.todaySales = 0;
        this.stats.totalRevenue = 0;
      }
    });
  }
}
