import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-setup-node',
  standalone: true,
  imports: [CommonModule, CategorySetupNodeComponent],
  template: `
    <div class="cat-node">
      <span>{{ node.name }}</span>
      <button type="button" (click)="addChild()">Agregar subcategoría</button>
      <button type="button" (click)="edit()">Editar</button>
      <button type="button" (click)="delete()">Eliminar</button>
      <div class="children" *ngIf="node.children?.length">
        <app-category-setup-node *ngFor="let child of node.children" [node]="child" (addCategory)="addCategory.emit($event)" (editCategory)="editCategory.emit($event)" (deleteCategory)="deleteCategory.emit($event)"></app-category-setup-node>
      </div>
    </div>
  `,
  styles: [`.cat-node { margin-left: 1em; } .children { margin-left: 1em; }`]
})
export class CategorySetupNodeComponent {
  @Input() node: any;
  @Output() addCategory = new EventEmitter<number | null>();
  @Output() editCategory = new EventEmitter<any>();
  @Output() deleteCategory = new EventEmitter<any>();

  addChild() {
    this.addCategory.emit(this.node.id);
  }
  edit() {
    this.editCategory.emit(this.node);
  }
  delete() {
    this.deleteCategory.emit(this.node);
  }
}
