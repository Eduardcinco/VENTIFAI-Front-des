import { Component, OnDestroy, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { AlertasService } from '../../services/alertas.service';
import { AuthService } from '../../services/auth.service';
import { PermissionsService, PermisosPorRol } from '../../services/permissions.service';
import { Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  imports: [CommonModule, NgIf, RouterModule]
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() user: any = null;
  @Input() getUserInitials: () => string = () => 'U';
  @Input() logout: () => void = () => {};
  isOpen = true;
  sub!: Subscription;
  stockBajoCount = 0;
  private _alertaSub?: Subscription;
  fotoPerfilUrl: string | null = null;
  
  //  Permisos del usuario actual
  permisos: PermisosPorRol;

  constructor(
    private sidebarService: SidebarService,
    private alertasService: AlertasService,
    private authService: AuthService,
    public permissionsService: PermissionsService,
    private router: Router
  ) {
    // Inicializar permisos en el constructor
    this.permisos = this.permissionsService.getPermisos();
  }

  private sessionSub?: Subscription;
  
  ngOnInit(): void {
    this.sub = this.sidebarService.isOpen$.subscribe(v => (this.isOpen = v));
    this._alertaSub = this.alertasService.stockBajoCount.subscribe(count => {
      this.stockBajoCount = count;
    });
    this.loadProfilePhoto();
    
    // Suscribirse a cambios de sesión para recargar permisos
    // Esto actualiza el sidebar cuando refreshSession() trae permisosExtra del backend
    this.sessionSub = this.authService.currentSession$.subscribe(session => {
      if (session) {
        this.permisos = this.permissionsService.getPermisos();
        // Actualizar foto perfil desde sesión si existe
            const foto = (session as any)?.fotoPerfilUrl || (session as any)?.usuario?.fotoPerfilUrl;
            if (foto) {
              this.fotoPerfilUrl = (foto as string).startsWith('http')
                ? (foto as string)
                : `http://localhost:5129${foto}`;
            } else {
              this.fotoPerfilUrl = null;
            }
        console.log('🔄 Sidebar: permisos actualizados', {
          rol: session.rol,
          extras: session.permisosExtra?.modulos || [],
          verInventario: this.permisos.verInventario,
          verConfiguracion: this.permisos.verConfiguracion
        });
      }
    });
  }

    loadProfilePhoto(): void {
      // Preferir foto de sesión, si está disponible
      const session = (this.authService as any).getCurrentSession?.();
      const fromSession = session?.fotoPerfilUrl;
      if (fromSession) {
        this.fotoPerfilUrl = fromSession.startsWith('http')
          ? fromSession
          : `http://localhost:5129${fromSession}`;
        return;
      }
      // Fallback: localStorage (legacy)
      const saved = localStorage.getItem('usuario-foto-perfil');
      this.fotoPerfilUrl = saved ? `http://localhost:5129${saved}` : null;
    }

    getUserDisplayName(): string {
      return this.authService.getUserName() || this.authService.getUserEmail() || 'Usuario';
    }

    isDueno(): boolean { return this.permissionsService.isDueno(); }

    getRoleLabel(): string {
      return this.permissionsService.getRolLabel();
    }

    getUserInitialsInternal(): string {
      const name = this.authService.getUserName();
      if (!name) return 'U';
      const parts = name.split(' ').filter(p => p.length > 0);
      if (parts.length === 0) return 'U';
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this._alertaSub?.unsubscribe();
    this.sessionSub?.unsubscribe();
  }

  closeOnSmall() {
    // on small screens auto-close after selection
    if (window.innerWidth <= 768) this.sidebarService.close();
  }

  performLogout() {
    try {
      if (this.logout) this.logout();
    } catch (e) {
      console.error('Logout function failed', e);
    }
    // close sidebar after logout (if running on small screens)
    this.sidebarService.close();
  }

  openProfile() {
    this.router.navigate(['/dashboard/settings']);
    this.closeOnSmall();
  }
}
