import { Component, OnDestroy } from '@angular/core';
import { CommonModule, NgFor, NgClass } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, NgFor, NgClass],
  template: `
    <div class="toast-container">
      <div *ngFor="let t of toasts" class="toast" [ngClass]="t.type" (click)="dismiss(t.id)">
        <span class="icon" aria-hidden="true">{{ icon(t.type) }}</span>
        <span class="message">{{ t.message }}</span>
        <button class="close" (click)="dismiss(t.id); $event.stopPropagation()">×</button>
      </div>
    </div>
  `,
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnDestroy {
  toasts: Toast[] = [];
  private sub: Subscription;

  constructor(private toast: ToastService) {
    this.sub = this.toast.stream.subscribe(list => this.toasts = list);
  }

  icon(type: Toast['type']) {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '⛔';
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
    }
  }

  dismiss(id: number) { this.toast.dismiss(id); }

  ngOnDestroy() { this.sub.unsubscribe(); }
}
