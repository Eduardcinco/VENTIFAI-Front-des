import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductsService, Product } from '../../services/products.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit {
  products: Product[] = [];
  loading = false;

  constructor(private productsSvc: ProductsService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.productsSvc.list().subscribe({ next: (res: Product[]) => { this.products = res; this.loading = false }, error: () => { this.loading = false } });
  }
}
