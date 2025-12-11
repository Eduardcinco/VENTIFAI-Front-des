import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-node',
  standalone: true,
  imports: [CommonModule, CategoryNodeComponent],
  template: `
    <div class="cat-node">
      <label [attr.for]="'category-' + node.id">
        <input id="category-{{node.id}}" name="categoryId" type="radio" formControlName="categoryId" [value]="node.id" />
        {{ node.name }}
      </label>
      <button type="button" (click)="addChild()">Agregar subcategoría</button>
      <div class="children" *ngIf="node.children?.length">
        <app-category-node *ngFor="let child of node.children" [node]="child" [form]="form" (addCategory)="addCategory.emit($event)"></app-category-node>
      </div>
    </div>
  `,
  styles: [`.cat-node { margin-left: 1em; } .children { margin-left: 1em; }`]
})
export class CategoryNodeComponent {
  @Input() node: any;
  @Input() form!: FormGroup;
  @Output() addCategory = new EventEmitter<number | null>();

  addChild() {
    this.addCategory.emit(this.node.id);
  }
}
