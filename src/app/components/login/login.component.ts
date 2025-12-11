import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  formData = { email: '', password: '' };
  loading = false;
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.loading = true;
    this.errorMessage = '';
    this.auth.login(this.formData).subscribe({
      next: (res) => {
        this.loading = false;
        console.log('Login success:', res);
        console.log('NegocioId obtenido:', this.auth.getBusinessId()); // ⭐ Debug
        
        if (!this.auth.getToken()) {
          this.errorMessage = 'No se recibió token. Contacta soporte.';
          return;
        }
        
        // 🆕 NUEVO: Verificar si es primer acceso
        if (this.auth.getPrimerAcceso()) {
          // Redirigir a pantalla de cambio obligatorio
          this.router.navigate(['/primer-login']);
        } else {
          // Login normal
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Login failed';
        console.error('Login error:', err);
      }
    });
  }
}
