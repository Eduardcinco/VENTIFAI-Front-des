import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './components/toast/toast.component';
import { AiChatFloatComponent } from './components/ai-chat-float/ai-chat-float.component';
import { AuthService } from './services/auth.service';
import { SidebarService } from './services/sidebar.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterModule, ToastComponent, AiChatFloatComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('FRONT');
  showAiChat = signal(false);

  constructor(private auth: AuthService, private sidebarService: SidebarService) {
    // Evaluar si debe mostrarse el chat según autenticación y rol permitido
    const evalShow = () => {
      const isAuth = this.auth.isAuthenticated();
      const role = (this.auth.getRole() || '').toLowerCase();
      const allowed = role.includes('dueno') || role.includes('dueño') || role.includes('owner') || role.includes('gerente') || role.includes('manager');
      this.showAiChat.set(isAuth && allowed);
    };

    evalShow();
    this.auth.currentSession$.subscribe(() => evalShow());
  }

  toggleSidebar() {
    this.sidebarService.toggle();
  }
}
