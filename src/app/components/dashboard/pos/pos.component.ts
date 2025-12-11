import { Component, computed, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductsService } from '../../../services/products.service';
import { VentasService } from '../../../services/ventas.service';
import { CajaService } from '../../../services/caja.service';
import { AuthService } from '../../../services/auth.service';
import { AlertasService } from '../../../services/alertas.service';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.css']
})
export class PosComponent {
  cart = signal<any[]>([]);
  products: any[] = [];
  allProducts: any[] = [];
  searchTerm = '';
  paymentMethod = 'efectivo';
  cajaState: { abierta: boolean; caja: any | null } = { abierta: false, caja: null };
  isCartCollapsed = false;
  
  // Cálculo de cambio
  montoRecibido: number = 0;

  loading = false;

  constructor(
    private productsService: ProductsService, 
    private ventasService: VentasService, 
    private cajaService: CajaService,
    private auth: AuthService,
    private alertasService: AlertasService,
    private router: Router,
    private modal: ModalService
  ) {
    this.loadProducts();
    this.loadCaja();
    // Suscribirse a cambios de caja abierta/cerrada en tiempo real
    this.cajaService.current$.subscribe(state => { this.cajaState = state; });

    // Auto-refresh al entrar a la ruta POS
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd && ev.urlAfterRedirects.includes('/dashboard/pos')) {
        this.loadProducts();
        this.loadCaja();
      }
    });
  }

  loadProducts(){
    this.productsService.list().subscribe({ 
      next: (res: any) => {
        this.allProducts = res || [];
        this.products = [...this.allProducts];
      }, 
      error: () => {
        console.error('Error cargando productos');
        this.allProducts = [];
        this.products = [];
      }
    });
  }

  loadCaja(){
    this.cajaService.getCurrent().subscribe({ 
      next: (resp) => this.cajaState = resp,
      error: () => this.cajaState = { abierta: false, caja: null }
    });
  }

  // Búsqueda por nombre, ID o código de barras
  searchProducts() {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.products = [...this.allProducts];
      return;
    }

    this.products = this.allProducts.filter((p: any) => {
      const nombre = (p.nombre || p.name || '').toLowerCase();
      const id = String(p.id || '');
      const codigoBarras = (p.codigoBarras || p.barcode || '').toLowerCase();
      
      return nombre.includes(term) || 
             id.includes(term) || 
             codigoBarras.includes(term);
    });
  }

  add(p: any){
    const stock = p.stock || p.cantidadDisponible || 0;
    
    if (stock <= 0) {
      this.modal.warning(`${p.nombre || p.name} no tiene stock disponible`, 'Sin Stock');
      return;
    }

    const found = this.cart().find(c => c.id === p.id);
    
    // Usar precioFinal que viene del backend (ya calculado con descuentos)
    const precioFinal = p.precioFinal || p.precioVenta || p.price || 0;
    const precioOriginal = p.precioVenta || p.price || 0;
    
    if (found) {
      if (found.qty >= stock) {
        this.modal.warning(`No hay más stock disponible de ${p.nombre || p.name}. Stock actual: ${stock}`, 'Stock Insuficiente');
        return;
      }
      found.qty = (found.qty || 1) + 1;
      this.cart.set([...this.cart()]);
    } else {
      this.cart.set([...this.cart(), { 
        ...p, 
        qty: 1,
        precioUnitario: precioFinal,
        precioOriginal: precioOriginal,
        precioFinal: precioFinal,
        tieneDescuento: p.tieneDescuento || false,
        descuentoPorcentaje: p.descuentoPorcentaje || 0,
        ahorro: p.ahorro || 0
      }]);
    }
  }

  removeItem(i: number){ 
    const next = [...this.cart()];
    next.splice(i, 1);
    this.cart.set(next);
  }

  updateQty(item: any, newQty: number) {
    const stock = item.stock || item.cantidadDisponible || 0;
    
    if (newQty <= 0) {
      const index = this.cart().indexOf(item);
      if (index > -1) {
        const next = [...this.cart()];
        next.splice(index, 1);
        this.cart.set(next);
      }
      return;
    }

    if (newQty > stock) {
      this.modal.warning(`Solo hay ${stock} unidades disponibles`, 'Stock Insuficiente');
      item.qty = stock;
      return;
    }

    item.qty = newQty;
    this.cart.set([...this.cart()]);
  }

  total = computed(() => {
    const cartItems = this.cart();
    console.log('[POS DEBUG] Cart items:', cartItems);
    const totalCalculated = cartItems.reduce((s, t) => {
      const precio = t.precioUnitario || t.precioVenta || t.price || 0;
      const cantidad = t.qty || 1;
      console.log('[POS DEBUG] Item:', t.nombre || t.name, 'Precio:', precio, 'Qty:', cantidad);
      return s + (precio * cantidad);
    }, 0);
    console.log('[POS DEBUG] Total calculated:', totalCalculated);
    return totalCalculated;
  });

  get cambio() {
    const total = this.total();
    const cambio = this.montoRecibido - total;
    return cambio >= 0 ? cambio : 0;
  }

  get faltante() {
    const total = this.total();
    const faltante = total - this.montoRecibido;
    return faltante > 0 ? faltante : 0;
  }

  async createSale(){
    if (!this.cajaState.abierta || !this.cajaState.caja || !this.cajaState.caja.id) {
      this.modal.warning('Debes abrir una caja antes de realizar ventas', 'Caja Cerrada');
      return;
    }

    if (this.cart().length === 0) {
      this.modal.warning('El carrito está vacío', 'Carrito Vacío');
      return;
    }

    if (this.paymentMethod === 'efectivo' && this.montoRecibido < this.total()) {
      this.modal.warning(`Falta recibir $${this.faltante.toFixed(2)}`, 'Pago Insuficiente');
      return;
    }

    const items = this.cart().map(i => ({ 
      productoId: i.id, 
      cantidad: i.qty || 1, 
      precio: i.precioUnitario || i.precioVenta || i.price || 0 
    }));

    const payload = { 
      items, 
      total: this.total(), 
      paymentMethod: this.paymentMethod, 
      cajaId: this.cajaState.caja.id,
      empleadoId: this.auth.getEmployeeId(),
      negocioId: this.auth.getBusinessId(),
      montoRecibido: this.paymentMethod === 'efectivo' ? this.montoRecibido : this.total(),
      cambio: this.paymentMethod === 'efectivo' ? this.cambio : 0
    };

    this.loading = true;
    
    this.ventasService.create(payload).subscribe({ 
      next: async (res) => {
        this.loading = false;
        await this.modal.success(
          `Total: $${this.total().toFixed(2)}\nRecibido: $${this.montoRecibido.toFixed(2)}\nCambio: $${this.cambio.toFixed(2)}`,
          '¡Venta Registrada!'
        );
        this.cart.set([]);
        this.montoRecibido = 0;
        this.searchTerm = '';
        this.loadProducts(); // Recargar para actualizar stock
        this.loadCaja(); // Refrescar estado de caja (montoActual actualizado en backend)
        // ⭐ Refresh alertas automáticamente después de venta (stock cambió)
        this.alertasService.refresh();
      }, 
      error: (e) => { 
        this.loading = false; 
        console.error(e); 
        this.modal.error('Error registrando la venta: ' + (e.error?.message || 'Error desconocido'));
      }
    });
  }  async clearCart() {
    const confirmed = await this.modal.confirm('¿Estás seguro de vaciar el carrito?', 'Vaciar Carrito');
    if (confirmed) {
      this.cart.set([]);
      this.montoRecibido = 0;
    }
  }
}
