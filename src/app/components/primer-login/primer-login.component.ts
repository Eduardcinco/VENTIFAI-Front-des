import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-primer-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="overlay-modal">
      <div class="modal-primer-acceso">
        <div class="header-icon">🔒</div>
        <h2>Cambio de Contraseña Obligatorio</h2>
        <p class="subtitle">Por seguridad, debes cambiar tu contraseña temporal antes de continuar.</p>
        
        <form [formGroup]="form" (ngSubmit)="cambiarPassword()">
          <div class="form-group">
            <label for="password">Nueva Contraseña *</label>
            <div class="input-wrapper">
              <input 
                id="password" 
                [type]="mostrarPassword ? 'text' : 'password'" 
                formControlName="password" 
                class="form-control"
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" class="toggle-password" (click)="mostrarPassword = !mostrarPassword">
                {{ mostrarPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
            <small class="hint">Debe tener al menos 6 caracteres</small>
            <small class="error" *ngIf="form.get('password')?.touched && form.get('password')?.hasError('minlength')">
              La contraseña debe tener al menos 6 caracteres
            </small>
          </div>
          
          <div class="form-group">
            <label for="confirmPassword">Confirmar Contraseña *</label>
            <input 
              id="confirmPassword" 
              type="password" 
              formControlName="confirmPassword" 
              class="form-control"
              placeholder="Repetir contraseña"
            />
            <small class="error" *ngIf="form.get('confirmPassword')?.touched && passwordsDoNotMatch()">
              Las contraseñas no coinciden
            </small>
          </div>
          
          <div class="alert-info" *ngIf="errorMsg">
            ⚠️ {{ errorMsg }}
          </div>
          
          <button 
            type="submit" 
            class="btn-submit" 
            [disabled]="!form.valid || passwordsDoNotMatch() || loading"
          >
            {{ loading ? 'Cambiando...' : 'Cambiar y Continuar' }}
          </button>
        </form>
        
        <div class="footer-note">
          <small>Esta acción es obligatoria para garantizar la seguridad de tu cuenta.</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay-modal {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .modal-primer-acceso {
      background: white;
      padding: 2.5rem;
      border-radius: 16px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .header-icon {
      font-size: 3rem;
      text-align: center;
      margin-bottom: 1rem;
      animation: bounce 1s ease infinite;
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    h2 {
      margin: 0 0 0.5rem 0;
      color: #1f2937;
      font-size: 1.5rem;
      text-align: center;
      font-weight: 700;
    }
    
    .subtitle {
      text-align: center;
      color: #6b7280;
      margin-bottom: 2rem;
      font-size: 0.95rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .form-control {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 0.95rem;
      transition: all 0.2s;
    }
    
    .form-control:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    .toggle-password {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0.5rem;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    
    .toggle-password:hover {
      opacity: 1;
    }
    
    .hint {
      display: block;
      color: #6b7280;
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }
    
    .error {
      display: block;
      color: #dc2626;
      font-size: 0.8rem;
      margin-top: 0.25rem;
      font-weight: 500;
    }
    
    .alert-info {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      border-radius: 6px;
      color: #92400e;
      font-size: 0.9rem;
    }
    
    .btn-submit {
      width: 100%;
      padding: 0.875rem;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 1rem;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    
    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }
    
    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    .footer-note {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer-note small {
      color: #6b7280;
      font-size: 0.85rem;
    }
  `]
})
export class PrimerLoginComponent {
  mostrarPassword = false;
  loading = false;
  errorMsg = '';
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  passwordsDoNotMatch(): boolean {
    const pass = this.form.get('password')?.value;
    const confirm = this.form.get('confirmPassword')?.value;
    return pass !== confirm && (this.form.get('confirmPassword')?.touched || false);
  }

  cambiarPassword() {
    if (!this.form.valid || this.passwordsDoNotMatch()) {
      this.errorMsg = 'Por favor corrige los errores antes de continuar';
      return;
    }

    const password = this.form.get('password')?.value;
    if (!password) return;

    this.loading = true;
    this.errorMsg = '';

    this.authService.cambiarPasswordPrimerAcceso(password).subscribe({
      next: () => {
        this.loading = false;
        alert('✅ Contraseña actualizada exitosamente. ¡Bienvenido al sistema!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Error al cambiar contraseña. Intenta nuevamente.';
        console.error('Error:', err);
      }
    });
  }
}
