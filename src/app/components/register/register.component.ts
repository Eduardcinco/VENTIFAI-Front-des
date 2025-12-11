import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  formData = { businessName: '', name: '', email: '', password: '' };
  loading = false;
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.loading = true;
    this.errorMessage = '';
    this.auth.register(this.formData).subscribe({
      next: (res) => {
        this.loading = false;
        console.log('Registro success:', res);
        console.log('NegocioId obtenido:', this.auth.getBusinessId()); // ⭐ Debug
        if (this.auth.getToken()) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'No se recibió token. Contacta soporte.';
        }
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 400 || err?.status === 409) {
          const msg = err?.error?.message || 'Correo actualmente en uso';
          this.errorMessage = msg;
          setTimeout(() => {
            const emailInput = document.getElementById('email') as HTMLInputElement;
            if (emailInput) emailInput.focus();
          }, 100);
        } else {
          this.errorMessage = 'Error al registrar. Intenta de nuevo.';
        }
        console.error('Registro error:', err);
      }
    });
  }
}
