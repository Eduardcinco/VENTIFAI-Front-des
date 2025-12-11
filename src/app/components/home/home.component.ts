
import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  isLoggedIn = false;
  currentUser: any = null;
  stats = [
    { label: 'Ventas hoy', value: 0 },
    { label: 'Productos', value: 0 }
  ];
  products = [
    { name: 'Producto demo', category: 'General', stock: 10, price: '$10' }
  ];
  displayName = '';
  greeting = '';

  private auth = inject(AuthService);
  private router = inject(Router);

  constructor() {
    const token = this.auth.getToken();
    this.isLoggedIn = !!token;
    // Solo redirigir si hay token en memoria (sesión activa)
    if (token) {
      this.router.navigate(['/dashboard']);
    }
    // Si tienes endpoint para obtener usuario actual, aquí puedes cargarlo
    // this.auth.getCurrentUser().subscribe(user => this.currentUser = user);
  }

  ngOnInit(): void {
    const user = (this.auth as any).getCurrentUser?.() || (this.auth as any).getUser?.() || {};
    const rawName: string = (user?.nombre || user?.name || user?.fullName || user?.email || '') as string;
    this.displayName = this.buildDisplayName(rawName);
    this.greeting = this.buildGreeting();
  }

  private buildDisplayName(raw: string): string {
    if (!raw) return '';
    const base = raw.includes('@') ? raw.split('@')[0] : raw;
    const parts = base.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '.';
    return parts.slice(0, Math.min(2, parts.length)).join(' ');
  }

  private buildGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Gestiona tu negocio de forma inteligente';
    if (hour < 19) return 'Gestiona tu negocio de forma inteligente';
    return 'Gestiona tu negocio de forma inteligente';
  }
}
