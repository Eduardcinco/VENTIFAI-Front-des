import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timeout?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  private counter = 0;

  get stream() {
    return this.toasts$.asObservable();
  }

  private push(type: Toast['type'], message: string, timeout = 4000) {
    const toast: Toast = { id: ++this.counter, type, message, timeout };
    const current = this.toasts$.getValue();
    this.toasts$.next([...current, toast]);
    if (timeout > 0) {
      setTimeout(() => this.dismiss(toast.id), timeout);
    }
  }

  success(msg: string, timeout?: number) { this.push('success', msg, timeout); }
  error(msg: string, timeout?: number) { this.push('error', msg, timeout); }
  info(msg: string, timeout?: number) { this.push('info', msg, timeout); }
  warning(msg: string, timeout?: number) { this.push('warning', msg, timeout); }

  dismiss(id: number) {
    this.toasts$.next(this.toasts$.getValue().filter(t => t.id !== id));
  }

  clear() { this.toasts$.next([]); }
}
