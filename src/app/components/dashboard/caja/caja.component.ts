import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CajaService, MovimientoCaja } from '../../../services/caja.service';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './caja.component.html',
  styleUrls: ['./caja.component.css']
})
export class CajaComponent {
  current: any = null;
  openingAmount: number = 0;
  closingAmount: number | null = null;
  loading = false;
  loadingMovimiento = false; // Flag para evitar doble registro

  // Movimientos
  movimientos: any[] = [];
  resumen: any = null;
  showModal = false;
  tipoMovimiento: 'entrada' | 'salida' = 'salida';
  monto: number = 0;
  categoria: string = '';
  descripcion: string = '';
  metodoPago: string = 'Efectivo';
  referencia: string = '';

  // Categorías predefinidas
  categoriasGastos = [
    'Pago de Renta',
    'Pago de Internet',
    'Pago de Luz',
    'Pago de Agua',
    'Pago de Teléfono',
    'Compra de Mercancía',
    'Pago a Proveedores',
    'Nómina/Sueldos',
    'Mantenimiento',
    'Retiro Dueño',
    'Impuestos',
    'Gastos Varios'
  ];

  categoriasIngresos = [
    'Aportación de Capital',
    'Préstamo Recibido',
    'Ingreso Extra',
    'Devolución',
    'Venta de Activo'
  ];

  metodosPago = ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta'];

  constructor(
    private cajaService: CajaService, 
    private router: Router,
    private modal: ModalService
  ) {
    this.loadCurrent();
    // Auto-refresh al entrar al módulo de Caja
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd && ev.urlAfterRedirects.includes('/dashboard/caja')) {
        this.loadCurrent();
      }
    });
  }

  loadCurrent(){
    this.cajaService.getCurrent().subscribe({ 
      next: resp => {
        this.current = resp.caja;
        if (resp.abierta) {
          this.cargarMovimientos();
          this.cargarResumen();
        }
      }, 
      error: () => this.current = null 
    });
  }

  cargarMovimientos(): void {
    this.cajaService.getMovimientos().subscribe({
      next: (data) => {
        this.movimientos = data.movimientos || [];
      },
      error: (err) => console.error('Error al cargar movimientos:', err)
    });
  }

  cargarResumen(): void {
    this.cajaService.getResumen().subscribe({
      next: (data) => {
        this.resumen = data;
      },
      error: (err) => console.error('Error al cargar resumen:', err)
    });
  }

  async openCaja(){
    if(this.openingAmount <= 0) {
      this.modal.warning('Ingresa un monto inicial válido', 'Monto Inválido');
      return;
    }
    this.loading = true;
    this.cajaService.open({ montoInicial: this.openingAmount }).subscribe({
      next: async (resp) => {
        this.loading = false;
        this.current = resp.caja;
        this.cajaService.setCurrent(true, resp.caja);
        await this.modal.success('Caja abierta correctamente', '¡Caja Abierta!');
        this.router.navigateByUrl('/dashboard/caja');
      },
      error: async (e) => { 
        this.loading = false; 
        console.error(e); 
        this.modal.error('Error abriendo caja', 'Error');
      }
    });
  }

  async closeCaja(){
    if(!this.current) {
      this.modal.warning('No hay caja abierta', 'Caja Cerrada');
      return;
    }
    this.loading = true;
    this.cajaService.close({ id: this.current.id, montoCierre: this.closingAmount || undefined }).subscribe({ 
      next: async (resp) => { 
        this.loading = false; 
        this.current = null; 
        this.cajaService.setCurrent(false, resp.caja);
        await this.modal.success('Caja cerrada correctamente', '¡Caja Cerrada!');
        this.router.navigateByUrl('/dashboard/caja');
      }, 
      error: async (e) => { 
        this.loading = false; 
        console.error(e); 
        this.modal.error('Error cerrando caja', 'Error');
      } 
    });
  }

  abrirModal(tipo: 'entrada' | 'salida'): void {
    this.tipoMovimiento = tipo;
    this.monto = 0;
    this.categoria = '';
    this.descripcion = '';
    this.metodoPago = 'Efectivo';
    this.referencia = '';
    this.loadingMovimiento = false; // Resetear flag al abrir
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.loadingMovimiento = false; // Resetear flag al cerrar
  }

  async registrarMovimiento(): Promise<void> {
    // Evitar doble registro
    if (this.loadingMovimiento) {
      return;
    }

    if (!this.monto || this.monto <= 0) {
      this.modal.warning('El monto debe ser mayor a 0', 'Monto Inválido');
      return;
    }

    if (!this.categoria) {
      this.modal.warning('Selecciona una categoría', 'Categoría Requerida');
      return;
    }

    this.loadingMovimiento = true; // Bloquear botón

    const movimiento: MovimientoCaja = {
      tipo: this.tipoMovimiento,
      monto: this.monto,
      categoria: this.categoria,
      descripcion: this.descripcion || undefined,
      metodoPago: this.metodoPago,
      referencia: this.referencia || undefined
    };

    this.cajaService.registrarMovimiento(movimiento).subscribe({
      next: async (response) => {
        this.loadingMovimiento = false;
        await this.modal.success(response.message || 'Movimiento registrado correctamente', '¡Éxito!');
        this.cerrarModal();
        this.loadCurrent();
      },
      error: async (err) => {
        this.loadingMovimiento = false;
        this.modal.error(err.error?.message || 'Error al registrar movimiento', 'Error');
      }
    });
  }

  get categorias() {
    return this.tipoMovimiento === 'salida' ? this.categoriasGastos : this.categoriasIngresos;
  }
}
