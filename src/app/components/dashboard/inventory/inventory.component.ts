import { Component, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { ProductsService } from '../../../services/products.service';
import { CategoriesService } from '../../../services/categories.service';
import { CajaService } from '../../../services/caja.service';
import { AlertasService } from '../../../services/alertas.service';
import { AuthService } from '../../../services/auth.service';
import { PermissionsService, PermisosPorRol } from '../../../services/permissions.service';
import { ModalService } from '../../../services/modal.service';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']
})
export class InventoryComponent {
    // Estado de caja
    cajaState: { abierta: boolean; caja: any | null } = { abierta: false, caja: null };
  products: any[] = [];
  categories: { id: number; name: string; parentId?: number | null }[] = [];
  search = '';
  showFilters = false;
  showForm = false;
  editingProduct: any = null;
  
  // Toggle para mostrar productos ocultos (desactivados)
  mostrarOcultos = false;
  
  // Filtros avanzados
  filterCategories: string[] = [];
  filterBrands: string[] = [];
  filterLowStock = false;
  
  // 🔐 Permisos del usuario actual
  permisos!: PermisosPorRol;

  // Formulario de producto
  form = {
    id: null as number | null,
    nombre: '',
    categoria: '', // legacy text category (kept for backward compatibility)
    nuevaCategoria: '', // used to create a new category on demand
    selectedCategoryId: null as number | null,
    codigoBarras: '',
    descripcion: '',
    precioCompra: 0,
    precioVenta: 0,
    cantidadInicial: 0,
    merma: 0,
    stock: 0,
    stockMinimo: 5 // ⭐ Valor por defecto razonable
  };

  // Errores de validación provenientes del backend
  fieldErrors: { [key: string]: string } = {};
  private resetFieldErrors() { this.fieldErrors = {}; }

  // Merma modal state
  showMerma = false;
  mermaTarget: any = null;
  mermaCantidad: number = 0;
  mermaMotivo: string = '';

  // Descuento modal state
  showDescuento = false;
  descuentoTarget: any = null;
  descuentoForm!: FormGroup;

  // Reabastecer modal state
  showReabastecer = false;
  reabastecerTarget: any = null;
  reabastecerForm!: FormGroup;

  constructor(
    private cdr: ChangeDetectorRef, 
    private router: Router, 
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private cajaService: CajaService,
    private alertasService: AlertasService,
    private authService: AuthService,
    private fb: FormBuilder,
    public permissionsService: PermissionsService,
    private modal: ModalService
  ) {
    // Cargar permisos
    this.permisos = this.permissionsService.getPermisos();
    this.loadProducts();
    this.loadCategories();
    // Suscripción al estado de caja
    this.cajaService.getCurrent().subscribe({
      next: (resp) => { this.cajaState = resp; },
      error: () => { this.cajaState = { abierta: false, caja: null }; }
    });
    this.cajaService.current$.subscribe(state => { this.cajaState = state; });
    this.resetFieldErrors();
    // Inicializar formulario de descuentos
    this.descuentoForm = this.fb.group({
      porcentaje: [null],
      fechaInicio: [null],
      fechaFin: [null],
      horaInicio: [null],
      horaFin: [null]
    });

    // Inicializar formulario de reabastecer
    this.reabastecerForm = this.fb.group({
      precioCompra: [0],
      precioVenta: [0],
      cantidadComprada: [0],
      merma: [0],
      stockMinimo: [5]
    });

    // Auto-refresh al entrar a Inventario
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd && ev.urlAfterRedirects.includes('/dashboard/inventory')) {
        this.loadProducts();
        this.loadCategories();
      }
    });
  }

  isDueno(): boolean { return this.authService.isDueno(); }
  
  loadProducts() {
    const negocioId = this.authService.getBusinessId();
    // Usar filtro según toggle: activos o todos
    const filtro = this.mostrarOcultos ? 'todos' : 'activos';
    this.productsService.list(filtro).subscribe({
      next: (res: any) => {
        const list = res || [];
        // Filtrado defensivo por negocioId si el backend llegara a devolver otros
        this.products = negocioId ? list.filter((p: any) => !p.negocioId || String(p.negocioId) === String(negocioId)) : list;
      },
      error: () => console.error('Error cargando productos')
    });
  }

  // Toggle mostrar ocultos
  onToggleMostrarOcultos() {
    this.loadProducts();
  }

  loadCategories() {
    this.categoriesService.getAll().subscribe({
      next: (res: any) => this.categories = (res || []).map((c: any) => ({ id: c.id, name: c.name || c.nombre || c.category || c.categoria, parentId: c.parentId ?? null })),
      error: () => console.error('Error cargando categorías')
    });
  }

  // Forzar actualización al cambiar filtros
  onFilterChange() {
    this.cdr.detectChanges();
  }

  createNewCategoryInline() {
    const name = this.form.nuevaCategoria.trim();
    if (!name) return;
    
    // 🚫 Bloquear duplicados
    if (this.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert('Ya existe una categoría con ese nombre');
      return;
    }
    
    this.categoriesService.create({ name }).subscribe({
      next: (cat: any) => {
        const created = { id: cat.id, name: cat.name || name };
        this.categories.unshift(created);
        this.form.selectedCategoryId = created.id;
        this.form.nuevaCategoria = '';
        alert('Categoría creada');
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'Error creando categoría');
      }
    });
  }

  toggleCategory(cat: string, checked: any) {
    const isChecked = checked.target ? checked.target.checked : checked;
    if (isChecked) {
      if (!this.filterCategories.includes(cat)) this.filterCategories.push(cat);
    } else {
      this.filterCategories = this.filterCategories.filter(c => c !== cat);
    }
    this.onFilterChange();
  }

  toggleBrand(brand: string, checked: any) {
    const isChecked = checked.target ? checked.target.checked : checked;
    if (isChecked) {
      if (!this.filterBrands.includes(brand)) this.filterBrands.push(brand);
    } else {
      this.filterBrands = this.filterBrands.filter(b => b !== brand);
    }
    this.onFilterChange();
  }

  get categoriesList() {
    return this.categories.map(c => c.name);
  }
  
  get brands() {
    return Array.from(new Set(this.products.map((p: any) => p.marca || p.brand).filter(b => b)));
  }

  get filteredProducts() {
    return this.products.filter((p: any) => {
      const nombre = p.nombre || p.name || '';
      const categoria = p.categoria || p.category || '';
      const marca = p.marca || p.brand || '';
      const codigoBarras = p.codigoBarras || p.barcode || '';
      
      const matchesSearch =
        nombre.toLowerCase().includes(this.search.toLowerCase()) ||
        marca.toLowerCase().includes(this.search.toLowerCase()) ||
        categoria.toLowerCase().includes(this.search.toLowerCase()) ||
        codigoBarras.includes(this.search);
      
      const matchesCategory = this.filterCategories.length === 0 || this.filterCategories.includes(categoria);
      const matchesBrand = this.filterBrands.length === 0 || this.filterBrands.includes(marca);
      const stock = p.stock || p.cantidadDisponible || 0;
      const matchesStock = !this.filterLowStock || stock < 10;
      
      return matchesSearch && matchesCategory && matchesBrand && matchesStock;
    });
  }

  get totalStock() {
    return this.filteredProducts.reduce((acc: number, p: any) => acc + (p.stock || p.cantidadDisponible || 0), 0);
  }

  get totalValue() {
    return this.filteredProducts.reduce((acc: number, p: any) => {
      const stock = p.stock || p.cantidadDisponible || 0;
      const price = p.precioVenta || p.price || 0;
      return acc + (price * stock);
    }, 0);
  }

  get gananciaEstimada() {
    return this.filteredProducts.reduce((acc: number, p: any) => {
      const stock = p.stock || p.cantidadDisponible || 0;
      const precioVenta = p.precioVenta || p.price || 0;
      const precioCompra = p.precioCompra || p.costPrice || 0;
      return acc + ((precioVenta - precioCompra) * stock);
    }, 0);
  }

  trackByProduct(index: number, item: any) {
    return item.id || index;
  }

  // Formulario de productos
  openForm() {
    this.showForm = true;
    this.resetForm();
  }

  closeForm() {
    this.showForm = false;
    this.editingProduct = null;
    this.resetForm();
  }

  resetForm() {
    this.form = {
      id: null,
      nombre: '',
      categoria: '',
      nuevaCategoria: '',
      selectedCategoryId: null,
      codigoBarras: '',
      descripcion: '',
      precioCompra: 0,
      precioVenta: 0,
      cantidadInicial: 0,
      merma: 0,
      stock: 0,
      stockMinimo: 5 // ⭐ Valor por defecto
    };
    this.resetFieldErrors();
  }

  get gananciaUnitaria() {
    return this.form.precioVenta - this.form.precioCompra;
  }

  get gananciaTotal() {
    const cantidadVendible = this.form.cantidadInicial - this.form.merma;
    return this.gananciaUnitaria * cantidadVendible;
  }

  get stockFinal() {
    return this.form.cantidadInicial - this.form.merma;
  }

  saveProduct() {
    // Validaciones
    if (!this.form.nombre.trim()) {
      alert('El nombre del producto es obligatorio');
      return;
    }

    const newCatName = this.form.nuevaCategoria.trim();
    const selectedCategoryId = this.form.selectedCategoryId;
    const categoriaFinal = this.form.nuevaCategoria.trim() || this.form.categoria;
    if (!selectedCategoryId && !newCatName) {
      alert('Selecciona una categoría o crea una nueva');
      return;
    }

    if (this.form.precioCompra <= 0 || this.form.precioVenta <= 0) {
      alert('Los precios deben ser mayores a 0');
      return;
    }

    if (this.form.cantidadInicial < 0 || this.form.merma < 0) {
      alert('Las cantidades no pueden ser negativas');
      return;
    }

    if (this.form.merma > this.form.cantidadInicial) {
      alert('La merma no puede ser mayor a la cantidad inicial');
      return;
    }

    const buildPayload = (categoryId: number | null) => ({
      nombre: this.form.nombre.trim(),
      categoryId: categoryId ?? undefined,
      codigoBarras: this.form.codigoBarras.trim() || null,
      descripcion: this.form.descripcion.trim() || null,
      precioCompra: Number(this.form.precioCompra),
      precioVenta: Number(this.form.precioVenta),
      // stockActual lo calcula el backend con cantidadInicial - merma
      merma: Number(this.form.merma),
      cantidadInicial: Number(this.form.cantidadInicial),
      stockMinimo: Number(this.form.stockMinimo) || 5 // ⭐ Enviar al backend
    });

    const proceedWithSave = (categoryId: number | null) => {
      const payload = buildPayload(categoryId);
      if (this.form.id) {
      // Actualizar producto existente
      this.productsService.update(this.form.id, payload).subscribe({
        next: () => {
          alert('Producto actualizado exitosamente');
          this.loadProducts();
          this.closeForm();
          // ⭐ Refresh alertas automáticamente
          this.alertasService.refresh();
        },
        error: (err) => {
          console.error(err);
          if (err?.status === 400 && err?.error?.fieldErrors) {
            this.fieldErrors = err.error.fieldErrors || {};
          } else {
            alert(err?.error?.message || 'Error al actualizar el producto');
          }
        }
      });
    } else {
      // Crear nuevo producto
      this.productsService.create(payload).subscribe({
        next: () => {
          alert('Producto creado exitosamente');
          this.loadProducts();
          this.closeForm();
          // ⭐ Refresh alertas automáticamente
          this.alertasService.refresh();
        },
        error: (err) => {
          console.error(err);
          if (err?.status === 400 && err?.error?.fieldErrors) {
            this.fieldErrors = err.error.fieldErrors || {};
          } else {
            alert(err?.error?.message || 'Error al crear el producto');
          }
        }
      });
    }
    };

    // Si hay nueva categoría, crearla primero y luego guardar
    if (!selectedCategoryId && newCatName) {
      this.categoriesService.create({ name: newCatName }).subscribe({
        next: (cat: any) => {
          // Añadir al listado y seleccionar
          this.categories.unshift({ id: cat.id, name: cat.name || newCatName });
          this.form.selectedCategoryId = cat.id;
          proceedWithSave(cat.id);
        },
        error: (err) => {
          console.error(err);
          alert(err?.error?.message || 'Error creando categoría');
        }
      });
    } else {
      proceedWithSave(selectedCategoryId!);
    }
  }

  editProduct(product: any) {
    this.editingProduct = product;
    const currentStock = product.stock || product.cantidadDisponible || product.stockActual || 0;
    const currentMerma = product.merma || 0;
    this.form = {
      id: product.id,
      nombre: product.nombre || product.name || '',
      categoria: product.categoria || product.category || '',
      nuevaCategoria: '',
      selectedCategoryId: product.categoryId || null,
      codigoBarras: product.codigoBarras || product.barcode || '',
      descripcion: product.descripcion || product.description || '',
      precioCompra: product.precioCompra || product.costPrice || 0,
      precioVenta: product.precioVenta || product.price || 0,
      cantidadInicial: currentStock + currentMerma, // 🔄 Permitir aumentar desde aquí
      merma: currentMerma,
      stock: currentStock,
      stockMinimo: product.stockMinimo || 5
    };
    this.showForm = true;
  }

  deleteProduct(product: any) {
    if (!confirm(`¿Estás seguro de eliminar el producto "${product.nombre || product.name}"?`)) {
      return;
    }

    this.productsService.delete(product.id).subscribe({
      next: () => {
        alert('Producto eliminado exitosamente');
        this.loadProducts();
        // ⭐ Refresh alertas automáticamente
        this.alertasService.refresh();
      },
      error: (err) => {
        console.error(err);
        alert('Error al eliminar el producto');
      }
    });
  }

  goToNew() {
    this.openForm();
  }

  // Desactivar producto (soft delete) - pone Activo = false
  toggleActivoProduct(p: any) {
    const nuevoEstado = !(p.activo ?? true);
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    if (!confirm(`¿${nuevoEstado ? 'Activar' : 'Desactivar'} el producto "${p.nombre || p.name}"?`)) {
      return;
    }

    this.productsService.toggleActivo(p.id, nuevoEstado).subscribe({
      next: () => {
        alert(`Producto ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`);
        this.loadProducts();
        this.alertasService.refresh();
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || `Error al ${accion} el producto`);
      }
    });
  }

  // Merma handlers
  openMermaModal(p: any) {
    this.mermaTarget = p;
    this.mermaCantidad = 1;
    this.mermaMotivo = '';
    this.showMerma = true;
  }

  closeMermaModal() {
    this.showMerma = false;
    this.mermaTarget = null;
    this.mermaCantidad = 0;
    this.mermaMotivo = '';
  }

  confirmMerma() {
    if (!this.mermaTarget) return;
    const stockActual = this.mermaTarget.stock || this.mermaTarget.cantidadDisponible || 0;
    if (!this.mermaCantidad || this.mermaCantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    if (this.mermaCantidad > stockActual) {
      alert('No puedes descontar más que el stock actual');
      return;
    }
    // Usar endpoint dedicado para auditoría
    this.productsService.addMerma(this.mermaTarget.id, this.mermaCantidad, this.mermaMotivo).subscribe({
      next: () => {
        alert('Merma aplicada');
        this.closeMermaModal();
        this.loadProducts();
        this.alertasService.refresh();
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'Error al aplicar merma');
      }
    });
  }

  // Descuento handlers
  abrirModalDescuento(producto: any) {
    this.descuentoTarget = producto;
    // Pre-llenar formulario con descuento existente si lo hay
    this.descuentoForm.patchValue({
      porcentaje: producto.descuentoPorcentaje || null,
      fechaInicio: producto.descuentoFechaInicio ? producto.descuentoFechaInicio.split('T')[0] : null,
      fechaFin: producto.descuentoFechaFin ? producto.descuentoFechaFin.split('T')[0] : null,
      horaInicio: producto.descuentoHoraInicio ? producto.descuentoHoraInicio.substring(0, 5) : null,
      horaFin: producto.descuentoHoraFin ? producto.descuentoHoraFin.substring(0, 5) : null
    });
    this.showDescuento = true;
  }

  cerrarModalDescuento() {
    this.showDescuento = false;
    this.descuentoTarget = null;
    this.descuentoForm.reset();
  }

  aplicarDescuento() {
    if (!this.descuentoTarget) return;
    const val = this.descuentoForm.value;
    
    // Validaciones
    if (!val.porcentaje || val.porcentaje <= 0 || val.porcentaje > 100) {
      alert('El porcentaje debe estar entre 1 y 100');
      return;
    }

    const dto = {
      Porcentaje: val.porcentaje,
      FechaInicio: val.fechaInicio ? new Date(val.fechaInicio).toISOString() : null,
      FechaFin: val.fechaFin ? new Date(val.fechaFin).toISOString() : null,
      HoraInicio: val.horaInicio ? val.horaInicio + ':00' : null,
      HoraFin: val.horaFin ? val.horaFin + ':00' : null
    };

    this.productsService.aplicarDescuento(this.descuentoTarget.id, dto).subscribe({
      next: () => {
        alert('Descuento aplicado exitosamente');
        this.cerrarModalDescuento();
        this.loadProducts();
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'Error al aplicar descuento');
      }
    });
  }

  removerDescuento() {
    if (!this.descuentoTarget) return;
    if (!confirm(`¿Estás seguro de remover el descuento de "${this.descuentoTarget.nombre || this.descuentoTarget.name}"?`)) {
      return;
    }

    this.productsService.aplicarDescuento(this.descuentoTarget.id, { Porcentaje: null }).subscribe({
      next: () => {
        alert('Descuento removido exitosamente');
        this.cerrarModalDescuento();
        this.loadProducts();
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'Error al remover descuento');
      }
    });
  }

  // Reabastecer handlers
  abrirModalReabastecer(producto: any) {
    this.reabastecerTarget = producto;
    // Pre-llenar con valores actuales del producto
    this.reabastecerForm.patchValue({
      precioCompra: producto.precioCompra || 0,
      precioVenta: producto.precioVenta || producto.price || 0,
      cantidadComprada: 0,
      merma: 0,
      stockMinimo: producto.stockMinimo || 5
    });
    this.showReabastecer = true;
  }

  cerrarModalReabastecer() {
    this.showReabastecer = false;
    this.reabastecerTarget = null;
    this.reabastecerForm.reset();
  }

  confirmarReabastecer() {
    if (!this.reabastecerTarget) return;
    const val = this.reabastecerForm.value;

    // Validaciones
    if (!val.cantidadComprada || val.cantidadComprada <= 0) {
      alert('Debes ingresar una cantidad mayor a 0 para reabastecer');
      return;
    }

    if (val.precioCompra <= 0 || val.precioVenta <= 0) {
      alert('Los precios deben ser mayores a 0');
      return;
    }

    if (val.merma < 0 || val.merma > val.cantidadComprada) {
      alert('La merma no puede ser negativa ni mayor a la cantidad comprada');
      return;
    }

    const dto = {
      precioCompra: Number(val.precioCompra),
      precioVenta: Number(val.precioVenta),
      cantidadComprada: Number(val.cantidadComprada),
      merma: Number(val.merma),
      stockMinimo: Number(val.stockMinimo)
    };

    this.productsService.reabastecer(this.reabastecerTarget.id, dto).subscribe({
      next: () => {
        alert('Producto reabastecido exitosamente');
        this.cerrarModalReabastecer();
        this.loadProducts();
        this.alertasService.refresh();
      },
      error: (err) => {
        console.error(err);
        alert(err?.error?.message || 'Error al reabastecer el producto');
      }
    });
  }

  get stockNuevo() {
    if (!this.reabastecerTarget) return 0;
    const stockActual = this.reabastecerTarget.stock || this.reabastecerTarget.cantidadDisponible || 0;
    const val = this.reabastecerForm.value;
    const cantidadNeta = (val.cantidadComprada || 0) - (val.merma || 0);
    return stockActual + cantidadNeta;
  }

  get costoReabastecimiento() {
    const val = this.reabastecerForm.value;
    return (val.precioCompra || 0) * (val.cantidadComprada || 0);
  }

  get nuevaGananciaUnitaria() {
    const val = this.reabastecerForm.value;
    return (val.precioVenta || 0) - (val.precioCompra || 0);
  }
}
