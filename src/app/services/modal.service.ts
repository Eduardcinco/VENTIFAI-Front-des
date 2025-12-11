import { Injectable, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { ModalComponent, ModalConfig } from '../components/modal/modal.component';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalComponent?: ModalComponent;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  private ensureModal() {
    if (!this.modalComponent) {
      const componentRef = createComponent(ModalComponent, {
        environmentInjector: this.injector
      });
      
      this.appRef.attachView(componentRef.hostView);
      document.body.appendChild(componentRef.location.nativeElement);
      this.modalComponent = componentRef.instance;
    }
  }

  async alert(message: string, title: string = 'Información', type: 'info' | 'warning' | 'error' | 'success' = 'info'): Promise<void> {
    this.ensureModal();
    await this.modalComponent!.show({
      title,
      message,
      type,
      confirmText: 'Entendido'
    });
  }

  async confirm(message: string, title: string = 'Confirmación'): Promise<boolean> {
    this.ensureModal();
    return await this.modalComponent!.show({
      title,
      message,
      type: 'confirm',
      confirmText: 'Confirmar',
      cancelText: 'Cancelar'
    });
  }

  async success(message: string, title: string = '¡Éxito!'): Promise<void> {
    await this.alert(message, title, 'success');
  }

  async warning(message: string, title: string = 'Advertencia'): Promise<void> {
    await this.alert(message, title, 'warning');
  }

  async error(message: string, title: string = 'Error'): Promise<void> {
    await this.alert(message, title, 'error');
  }
}
