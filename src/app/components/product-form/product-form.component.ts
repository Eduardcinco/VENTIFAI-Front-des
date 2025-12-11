import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { CategoryNodeComponent } from './category-node.component';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ProductsService } from '../../services/products.service';
import { CategoriesService } from '../../services/categories.service';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, CategoryNodeComponent],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css']
})
export class ProductFormComponent {
  form: any;
  isEdit = false;
  editingId: number | null = null;

  categoriesTree: any[] = [];
  selectedCategoryId: number | null = null;
  loadingCategories = true;

  // Estado para generar posts con IA
  generandoPost = false;
  copysGenerados: string[] = [];
  mostrarCopys = false;

  constructor(
    private fb: FormBuilder,
    private products: ProductsService,
    private cats: CategoriesService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private aiService: AiService,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      codigoBarras: [''],
      precioCompra: [0],
      precioVenta: [0],
      stockActual: [0],
      stockMinimo: [0],
      unidadMedida: [''],
      imagenUrl: [''],
      categoryId: [null, Validators.required]
    });
    this.loadCategories();
    // detect edit mode from route
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.editingId = +idParam;
      this.loadProduct(this.editingId);
    }
  }

  loadProduct(id: number) {
    this.products.get(id).subscribe({
      next: (p: any) => {
        this.form.patchValue({
          nombre: p.nombre || p.name || '',
          descripcion: p.descripcion || '',
          codigoBarras: p.codigoBarras || p.sku || '',
          precioCompra: p.precioCompra ?? 0,
          precioVenta: p.precioVenta ?? p.price ?? 0,
          stockActual: p.stockActual ?? p.stock ?? 0,
          stockMinimo: p.stockMinimo ?? 0,
          unidadMedida: p.unidadMedida || '',
          imagenUrl: p.imagenUrl || '',
          categoryId: p.categoryId ?? null
        });
      },
      error: (e) => console.error('Error loading product', e)
    });
  }

  loadCategories() {
    this.loadingCategories = true;
    this.cats.getAll().subscribe({
      next: (cats) => {
        this.categoriesTree = this.buildTree(cats);
        this.loadingCategories = false;
      },
      error: () => { this.loadingCategories = false; }
    });
  }

  buildTree(categories: any[]): any[] {
    const map = new Map<number, any>();
    categories.forEach(cat => map.set(cat.id, { ...cat, children: [] }));
    const tree: any[] = [];
    map.forEach(cat => {
      if (cat.parentId) {
        const parent = map.get(cat.parentId);
        if (parent) parent.children.push(cat);
      } else {
        tree.push(cat);
      }
    });
    return tree;
  }

  onAddCategory(parentId: number | null) {
    const name = prompt('Nombre de la nueva categoría:');
    if (!name) return;
    this.cats.create({ name, parentId }).subscribe({ next: () => this.loadCategories() });
  }

  getCategoryPath(cat: any): string {
    let path = cat.name;
    let current = cat;
    while (current.parentId) {
      const parent = this.findCategoryById(current.parentId);
      if (parent) path = parent.name + ' > ' + path;
      current = parent;
    }
    return path;
  }

  findCategoryById(id: number): any {
    const stack = [...this.categoriesTree];
    while (stack.length) {
      const node = stack.pop();
      if (node.id === id) return node;
      stack.push(...node.children);
    }
    return null;
  }



  submit() {
    if (this.form.invalid) return;
    const fv = this.form.value;
    const payload = {
      nombre: fv.nombre,
      descripcion: fv.descripcion,
      codigoBarras: fv.codigoBarras,
      precioCompra: fv.precioCompra,
      precioVenta: fv.precioVenta,
      stockActual: fv.stockActual,
      stockMinimo: fv.stockMinimo,
      unidadMedida: fv.unidadMedida,
      imagenUrl: fv.imagenUrl,
      categoryId: fv.categoryId
    };
    if (this.isEdit && this.editingId) {
      this.products.update(this.editingId, payload).subscribe({
        next: () => { this.router.navigate(['/dashboard/inventory']); },
        error: (e) => { console.error(e); }
      });
    } else {
      this.products.create(payload).subscribe({
        next: () => { this.router.navigate(['/dashboard/inventory']); },
        error: (e) => { console.error(e); }
      });
    }
  }

  cancel() {
    this.router.navigate(['/dashboard/inventory']);
  }

  // ============================================
  // 🤖 GENERAR COPYS CON IA
  // ============================================

  generarCopys(plataforma: 'instagram' | 'facebook' | 'tiktok' | 'todas' = 'todas'): void {
    if (!this.isEdit || !this.editingId) {
      this.toast.warning('Primero guarda el producto para generar copys');
      return;
    }

    this.generandoPost = true;
    this.copysGenerados = [];
    this.mostrarCopys = false;

    this.aiService.generarPost(this.editingId, plataforma).subscribe({
      next: (response) => {
        // Separar los copys (están separados por líneas en blanco)
        this.copysGenerados = response.copies
          .split(/\n{2,}/)
          .filter(c => c.trim())
          .map(c => c.trim());
        
        this.mostrarCopys = true;
        this.generandoPost = false;
        this.toast.success('¡Copys generados con IA!');
      },
      error: (err) => {
        console.error('Error generando copys:', err);
        this.toast.error('No pude generar los copys. Intenta de nuevo.');
        this.generandoPost = false;
      }
    });
  }

  copiarCopy(copy: string): void {
    navigator.clipboard.writeText(copy).then(() => {
      this.toast.success('¡Copiado al portapapeles!');
    }).catch(err => {
      console.error('Error copiando:', err);
      this.toast.error('No se pudo copiar');
    });
  }

  cerrarCopys(): void {
    this.mostrarCopys = false;
  }
}
