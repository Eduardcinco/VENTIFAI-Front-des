import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * 🔐 SISTEMA DE PERMISOS POR ROL + PERMISOS EXTRA TEMPORALES
 * 
 * ROLES BASE:
 * - DUEÑO: Control total de todos los apartados
 * - GERENTE: Control total, excepto editar información del negocio
 * - CAJERO: Solo punto de venta + reportes de sus propias ventas del día
 * - ALMACENISTA: Solo inventario + mermas (agregar productos recibidos, registrar mermas)
 * 
 * PERMISOS EXTRA:
 * El dueño o gerente puede asignar módulos adicionales temporalmente a cualquier empleado.
 * Ejemplo: El cajero hoy también puede ver inventario porque el almacenista descansa.
 * Los permisos extra se combinan (OR) con los permisos del rol base.
 */

export type RolUsuario = 'dueno' | 'gerente' | 'cajero' | 'almacenista';

/**
 * Módulos que se pueden asignar como permisos extra
 */
export type ModuloExtra = 'inventario' | 'pos' | 'caja' | 'reportes';

export interface PermisosExtra {
  modulos: ModuloExtra[];
  asignadoPor?: string;      // Quién lo asignó
  fechaAsignacion?: string;  // Cuándo se asignó
  nota?: string;             // Ej: "Cubre a Juan que está de vacaciones"
}

export interface PermisosPorRol {
  // Navegación - qué secciones puede ver
  verInicio: boolean;
  verInventario: boolean;
  verPuntoVenta: boolean;
  verCaja: boolean;
  verReportes: boolean;
  verConfiguracion: boolean;
  
  // Inventario
  agregarProducto: boolean;
  editarProducto: boolean;
  eliminarProducto: boolean;
  aplicarDescuento: boolean;
  registrarMerma: boolean;
  verTodoInventario: boolean;
  
  // Punto de Venta
  realizarVenta: boolean;
  aplicarDescuentoVenta: boolean;
  imprimirTicket: boolean;
  
  // Caja
  abrirCaja: boolean;
  cerrarCaja: boolean;
  verMovimientosCaja: boolean;
  
  // Reportes
  verReportesGlobales: boolean;        // Todo el negocio
  verReportesPropios: boolean;         // Solo sus ventas
  reportesSoloHoy: boolean;            // Limitar a ventas del día
  
  // Usuarios
  verUsuarios: boolean;
  crearUsuarios: boolean;
  editarUsuarios: boolean;
  eliminarUsuarios: boolean;
  
  // Configuración del negocio
  editarNombreNegocio: boolean;
  editarConfiguracion: boolean;
  
  // Descuentos masivos
  aplicarDescuentosMasivos: boolean;
}

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  
  constructor(private authService: AuthService) {}

  /**
   * Obtener el rol normalizado del usuario actual
   */
  getRol(): RolUsuario {
    const rol = (this.authService.getRole() || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .replace('ñ', 'n');
    
    if (['dueno', 'dueño', 'owner', 'admin'].some(r => rol.includes(r))) {
      return 'dueno';
    }
    if (rol.includes('gerente') || rol.includes('manager')) {
      return 'gerente';
    }
    if (rol.includes('cajero') || rol.includes('cashier')) {
      return 'cajero';
    }
    if (rol.includes('almacen') || rol.includes('bodega') || rol.includes('warehouse')) {
      return 'almacenista';
    }
    
    // Por defecto, si el rol no coincide, tratarlo como cajero (permisos mínimos)
    return 'cajero';
  }

  /**
   * Obtener label amigable del rol
   */
  getRolLabel(): string {
    const rol = this.getRol();
    const labels: Record<RolUsuario, string> = {
      dueno: 'Dueño',
      gerente: 'Gerente',
      cajero: 'Cajero',
      almacenista: 'Almacenista'
    };
    return labels[rol] || 'Usuario';
  }

  // ═══════════════════════════════════════════════════════════
  // 🆕 PERMISOS EXTRA (módulos adicionales temporales)
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtener permisos extra del usuario actual desde la sesión del AuthService
   * Los permisos vienen del backend en /api/auth/login y /api/system/session
   */
  getPermisosExtra(): PermisosExtra {
    // Obtener desde el caché de sesión del AuthService
    const session = this.authService.getCurrentSession();
    if (session?.permisosExtra && session.permisosExtra.modulos?.length > 0) {
      // Convertir los módulos a tipo ModuloExtra
      return {
        modulos: session.permisosExtra.modulos as ModuloExtra[],
        asignadoPor: session.permisosExtra.asignadoPor,
        fechaAsignacion: session.permisosExtra.fechaAsignacion,
        nota: session.permisosExtra.nota
      };
    }
    return { modulos: [] };
  }

  /**
   * Verificar si el usuario tiene un módulo extra asignado
   */
  tieneModuloExtra(modulo: ModuloExtra): boolean {
    const extras = this.getPermisosExtra();
    return extras.modulos.includes(modulo);
  }

  /**
   * Obtener lista de módulos extra activos
   */
  getModulosExtra(): ModuloExtra[] {
    return this.getPermisosExtra().modulos;
  }

  /**
   * Obtener todos los permisos del usuario actual
   * COMBINA: permisos del rol base + permisos extra asignados
   */
  getPermisos(): PermisosPorRol {
    const rol = this.getRol();
    const permisosBase = this.getPermisosPorRol(rol);
    
    // Si es dueño o gerente, ya tiene todo - no necesita extras
    if (rol === 'dueno' || rol === 'gerente') {
      return permisosBase;
    }
    
    // Combinar con permisos extra
    const extras = this.getPermisosExtra();
    const permisosCombinados = { ...permisosBase };
    
    extras.modulos.forEach(modulo => {
      switch (modulo) {
        case 'inventario':
          permisosCombinados.verInventario = true;
          permisosCombinados.agregarProducto = true;
          permisosCombinados.editarProducto = true;
          permisosCombinados.registrarMerma = true;
          permisosCombinados.verTodoInventario = true;
          break;
        case 'pos':
          permisosCombinados.verPuntoVenta = true;
          permisosCombinados.realizarVenta = true;
          permisosCombinados.imprimirTicket = true;
          permisosCombinados.verCaja = true;
          permisosCombinados.abrirCaja = true;
          permisosCombinados.cerrarCaja = true;
          break;
        case 'caja':
          permisosCombinados.verCaja = true;
          permisosCombinados.abrirCaja = true;
          permisosCombinados.cerrarCaja = true;
          permisosCombinados.verMovimientosCaja = true;
          break;
        case 'reportes':
          permisosCombinados.verReportes = true;
          permisosCombinados.verReportesPropios = true;
          // No damos reportes globales, solo propios
          break;
      }
    });
    
    return permisosCombinados;
  }

  /**
   * Verificar un permiso específico
   */
  puede(permiso: keyof PermisosPorRol): boolean {
    const permisos = this.getPermisos();
    return permisos[permiso] === true;
  }

  /**
   * Verificar si es dueño
   */
  isDueno(): boolean {
    return this.getRol() === 'dueno';
  }

  /**
   * Verificar si es gerente
   */
  isGerente(): boolean {
    return this.getRol() === 'gerente';
  }

  /**
   * Verificar si es cajero
   */
  isCajero(): boolean {
    return this.getRol() === 'cajero';
  }

  /**
   * Verificar si es almacenista
   */
  isAlmacenista(): boolean {
    return this.getRol() === 'almacenista';
  }

  /**
   * Verificar si tiene acceso administrativo (dueño o gerente)
   */
  isAdmin(): boolean {
    const rol = this.getRol();
    return rol === 'dueno' || rol === 'gerente';
  }

  /**
   * Obtener rutas permitidas para el rol actual
   */
  getRutasPermitidas(): string[] {
    const permisos = this.getPermisos();
    const rutas: string[] = [];
    
    if (permisos.verInicio) rutas.push('/dashboard');
    if (permisos.verInventario) rutas.push('/dashboard/inventory');
    // clientes eliminado: no ruta
    if (permisos.verPuntoVenta) rutas.push('/dashboard/pos');
    if (permisos.verCaja) rutas.push('/dashboard/caja');
    if (permisos.verReportes) rutas.push('/dashboard/reports');
    if (permisos.verConfiguracion) rutas.push('/dashboard/settings');
    
    return rutas;
  }

  /**
   * Verificar si puede acceder a una ruta específica
   */
  puedeAccederRuta(ruta: string): boolean {
    const rutasPermitidas = this.getRutasPermitidas();
    // Normalizar ruta
    const rutaNormalizada = ruta.split('?')[0].toLowerCase();
    return rutasPermitidas.some(r => rutaNormalizada.startsWith(r.toLowerCase()));
  }

  /**
   * Obtener la ruta por defecto según el rol
   */
  getRutaDefault(): string {
    const rol = this.getRol();
    switch (rol) {
      case 'cajero':
        return '/dashboard/pos';
      case 'almacenista':
        return '/dashboard/inventory';
      default:
        return '/dashboard';
    }
  }

  /**
   * 📋 DEFINICIÓN DE PERMISOS POR ROL
   */
  private getPermisosPorRol(rol: RolUsuario): PermisosPorRol {
    switch (rol) {
      
      // ═══════════════════════════════════════════════════════════
      // 👑 DUEÑO - Control total de todos los apartados
      // ═══════════════════════════════════════════════════════════
      case 'dueno':
        return {
          verInicio: true,
          verInventario: true,
          verPuntoVenta: true,
          verCaja: true,
          verReportes: true,
          verConfiguracion: true,
          
          agregarProducto: true,
          editarProducto: true,
          eliminarProducto: true,
          aplicarDescuento: true,
          registrarMerma: true,
          verTodoInventario: true,
          
          realizarVenta: true,
          aplicarDescuentoVenta: true,
          imprimirTicket: true,
          
          abrirCaja: true,
          cerrarCaja: true,
          verMovimientosCaja: true,
          
          verReportesGlobales: true,
          verReportesPropios: true,
          reportesSoloHoy: false,
          
          verUsuarios: true,
          crearUsuarios: true,
          editarUsuarios: true,
          eliminarUsuarios: true,
          
          editarNombreNegocio: true,
          editarConfiguracion: true,
          
          aplicarDescuentosMasivos: true,
        };

      // ═══════════════════════════════════════════════════════════
      // 👔 GERENTE - Igual que dueño, pero NO puede editar nombre del negocio
      // ═══════════════════════════════════════════════════════════
      case 'gerente':
        return {
          verInicio: true,
          verInventario: true,
          verPuntoVenta: true,
          verCaja: true,
          verReportes: true,
          verConfiguracion: true,
          
          agregarProducto: true,
          editarProducto: true,
          eliminarProducto: true,
          aplicarDescuento: true,
          registrarMerma: true,
          verTodoInventario: true,
          
          realizarVenta: true,
          aplicarDescuentoVenta: true,
          imprimirTicket: true,
          
          abrirCaja: true,
          cerrarCaja: true,
          verMovimientosCaja: true,
          
          verReportesGlobales: true,
          verReportesPropios: true,
          reportesSoloHoy: false,
          
          verUsuarios: true,
          crearUsuarios: true,
          editarUsuarios: true,
          eliminarUsuarios: true,
          
          editarNombreNegocio: false,  // ❌ No puede cambiar el nombre del negocio
          editarConfiguracion: true,    // ✅ Pero sí puede ver/editar otras configs
          
          aplicarDescuentosMasivos: true,
        };

      // ═══════════════════════════════════════════════════════════
      // 🧾 CAJERO - Solo punto de venta + reportes de sus ventas del día
      // ═══════════════════════════════════════════════════════════
      case 'cajero':
        return {
          verInicio: true,
          verInventario: false,         // ❌ No ve inventario
          verPuntoVenta: true,          // ✅ Sí ve punto de venta
          verCaja: true,                // ✅ Puede abrir/cerrar su caja
          verReportes: true,            // ✅ Pero solo sus ventas
          verConfiguracion: false,      // ❌ No ve configuración
          
          agregarProducto: false,
          editarProducto: false,
          eliminarProducto: false,
          aplicarDescuento: false,      // ❌ No puede aplicar descuentos
          registrarMerma: false,
          verTodoInventario: false,
          
          realizarVenta: true,          // ✅ Puede vender
          aplicarDescuentoVenta: false, // ❌ No puede dar descuentos en venta
          imprimirTicket: true,         // ✅ Puede imprimir ticket
          
          abrirCaja: true,
          cerrarCaja: true,
          verMovimientosCaja: true,
          
          verReportesGlobales: false,   // ❌ No ve todo el negocio
          verReportesPropios: true,     // ✅ Solo sus ventas
          reportesSoloHoy: true,        // ⚠️ Solo del día actual
          
          verUsuarios: false,
          crearUsuarios: false,
          editarUsuarios: false,
          eliminarUsuarios: false,
          
          editarNombreNegocio: false,
          editarConfiguracion: false,
          
          aplicarDescuentosMasivos: false,
        };

      // ═══════════════════════════════════════════════════════════
      // 📦 ALMACENISTA - Solo inventario + mermas
      // ═══════════════════════════════════════════════════════════
      case 'almacenista':
        return {
          verInicio: true,
          verInventario: true,          // ✅ Sí ve inventario
          verPuntoVenta: false,         // ❌ No ve punto de venta
          verCaja: false,               // ❌ No ve caja
          verReportes: false,           // ❌ No ve reportes
          verConfiguracion: false,      // ❌ No ve configuración
          
          agregarProducto: true,        // ✅ Puede agregar productos recibidos
          editarProducto: true,         // ✅ Puede editar stock
          eliminarProducto: false,      // ❌ No puede eliminar
          aplicarDescuento: false,      // ❌ No puede aplicar descuentos
          registrarMerma: true,         // ✅ Puede registrar mermas
          verTodoInventario: true,
          
          realizarVenta: false,
          aplicarDescuentoVenta: false,
          imprimirTicket: false,
          
          abrirCaja: false,
          cerrarCaja: false,
          verMovimientosCaja: false,
          
          verReportesGlobales: false,
          verReportesPropios: false,
          reportesSoloHoy: false,
          
          verUsuarios: false,
          crearUsuarios: false,
          editarUsuarios: false,
          eliminarUsuarios: false,
          
          editarNombreNegocio: false,
          editarConfiguracion: false,
          
          aplicarDescuentosMasivos: false,
        };

      default:
        // Por seguridad, permisos mínimos
        return this.getPermisosPorRol('cajero');
    }
  }
}
