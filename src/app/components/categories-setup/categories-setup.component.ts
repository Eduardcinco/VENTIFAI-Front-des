import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { CategorySetupNodeComponent } from './category-setup-node.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CategoriesService } from '../../services/categories.service';

@Component({
  selector: 'app-categories-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, CategorySetupNodeComponent],
  templateUrl: './categories-setup.component.html',
  styleUrls: ['./categories-setup.component.css']
})
export class CategoriesSetupComponent {
  search = '';
  categoriesTree: any[] = [];
  loadingCategories = true;
  errorMsg = '';
  newCategory = '';

  constructor(private cats: CategoriesService, private router: Router, private dialog: MatDialog) {
    this.loadCategories();
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

  onAddCategory(parentId: number | null = null) {
    const name = prompt('Nombre de la nueva categoría:');
    if (!name) return;
    this.cats.create({ name, parentId }).subscribe({ next: () => this.loadCategories() });
  }

  onEditCategory(cat: any) {
    const name = prompt('Editar nombre de la categoría:', cat.name);
    if (!name) return;
    this.cats.update(cat.id, { name, parentId: cat.parentId }).subscribe({ next: () => this.loadCategories() });
  }

  onDeleteCategory(cat: any) {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    this.cats.delete(cat.id).subscribe({
      next: () => this.loadCategories(),
      error: (err) => {
        if (err.status === 409) {
          this.errorMsg = err.error?.message || 'No se puede eliminar: la categoría tiene subcategorías.';
        } else {
          this.errorMsg = 'Error al eliminar la categoría.';
        }
      }
    });
  }

  clearError() { this.errorMsg = ''; }



  addNew() {
    const v = this.newCategory?.trim();
    if (!v) return;
    this.newCategory = '';
  }
}
