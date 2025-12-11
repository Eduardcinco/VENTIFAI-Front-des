import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ModalConfig {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-container" [class]="config.type" (click)="$event.stopPropagation()">
        <div class="modal-icon">
          @switch (config.type) {
            @case ('info') { <span>ℹ️</span> }
            @case ('warning') { <span>⚠️</span> }
            @case ('error') { <span>❌</span> }
            @case ('success') { <span>✅</span> }
            @case ('confirm') { <span>❓</span> }
          }
        </div>
        
        <div class="modal-content">
          <h3 class="modal-title">{{ config.title }}</h3>
          <p class="modal-message">{{ config.message }}</p>
        </div>
        
        <div class="modal-actions">
          @if (config.type === 'confirm') {
            <button class="btn btn-cancel" (click)="onCancel()">
              {{ config.cancelText || 'Cancelar' }}
            </button>
            <button class="btn btn-confirm" (click)="onConfirm()">
              {{ config.confirmText || 'Confirmar' }}
            </button>
          } @else {
            <button class="btn btn-ok" (click)="onConfirm()">
              {{ config.confirmText || 'Entendido' }}
            </button>
          }
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-container {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
      position: relative;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .modal-container.info::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #3b82f6, #2563eb);
      border-radius: 20px 20px 0 0;
    }

    .modal-container.warning::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #f59e0b, #d97706);
      border-radius: 20px 20px 0 0;
    }

    .modal-container.error::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #ef4444, #dc2626);
      border-radius: 20px 20px 0 0;
    }

    .modal-container.success::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #10b981, #059669);
      border-radius: 20px 20px 0 0;
    }

    .modal-container.confirm::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #8b5cf6, #7c3aed);
      border-radius: 20px 20px 0 0;
    }

    .modal-icon {
      text-align: center;
      font-size: 4rem;
      margin-bottom: 1rem;
      animation: bounce 0.6s ease;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .modal-content {
      text-align: center;
      margin-bottom: 2rem;
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 0.75rem;
    }

    .modal-message {
      font-size: 1rem;
      color: #64748b;
      margin: 0;
      line-height: 1.6;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }

    .btn {
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: 120px;
    }

    .btn-ok {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .btn-ok:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
    }

    .btn-confirm {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .btn-confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
    }

    .btn-cancel {
      background: #e2e8f0;
      color: #475569;
    }

    .btn-cancel:hover {
      background: #cbd5e1;
      transform: translateY(-2px);
    }

    @media (max-width: 480px) {
      .modal-container {
        padding: 1.5rem;
        max-width: 95%;
      }

      .modal-icon {
        font-size: 3rem;
      }

      .modal-title {
        font-size: 1.25rem;
      }

      .modal-message {
        font-size: 0.95rem;
      }

      .btn {
        padding: 0.65rem 1.5rem;
        font-size: 0.9rem;
        min-width: 100px;
      }

      .modal-actions {
        flex-direction: column-reverse;
      }
    }
  `]
})
export class ModalComponent {
  visible = false;
  config: ModalConfig = {
    title: '',
    message: '',
    type: 'info'
  };
  
  private resolveCallback?: (value: boolean) => void;

  show(config: ModalConfig): Promise<boolean> {
    this.config = config;
    this.visible = true;
    
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
    });
  }

  onConfirm() {
    this.visible = false;
    this.resolveCallback?.(true);
  }

  onCancel() {
    this.visible = false;
    this.resolveCallback?.(false);
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }
}
