/**
 * 📊 INTERFACES PARA EL SISTEMA DE REPORTES
 */

export interface FiltroReporte {
  fechaInicio: string; // 'YYYY-MM-DD'
  fechaFin: string;
  tipoAgrupacion: 'dia' | 'semana' | 'mes' | 'anio';
  formato?: 'excel' | 'pdf';
  metodoPago?: 'efectivo' | 'tarjeta' | 'transferencia' | '';
  cajerosIds?: number[];
}

export interface ReporteVentasCompleto {
  nombreNegocio: string;
  fechaGeneracion: string;
  tipoReporte: string;
  fechaInicio: string;
  fechaFin: string;
  // Ventana aplicada por backend (modo caja abierta)
  ModoCajaAbierta?: boolean;
  InicioReal?: string; // ISO
  FinReal?: string;    // ISO
  resumenGeneral: ReporteVentasAgregado;
  datosPorPeriodo: ReporteVentasAgregado[];
  topProductos: ProductoMasVendido[];
}

export interface ReporteVentasAgregado {
  periodo: string;
  fechaInicio: string;
  fechaFin?: string;
  totalVentas: number;
  totalIngresos: number;
  totalSubtotal: number;
  totalIva: number;
  totalDescuentos: number;
  ticketPromedio: number;
  ventaMaxima: number;
  ventaMinima: number;
  cajerosActivos: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  ventasEfectivo: number;
  ventasTarjeta: number;
  ventasTransferencia: number;
}

export interface ProductoMasVendido {
  productoId: number;
  productoNombre: string;
  codigoBarras?: string;
  categoriaNombre?: string;
  cantidadVendida: number;
  totalVentas: number;
  numeroTransacciones: number;
  precioPromedio: number;
}

/**
 * Opciones de agrupación para los filtros
 */
export const TIPOS_AGRUPACION = [
  { value: 'dia', label: 'Por Día', icon: '📅' },
  { value: 'semana', label: 'Por Semana', icon: '📆' },
  { value: 'mes', label: 'Por Mes', icon: '🗓️' },
  { value: 'anio', label: 'Por Año', icon: '📊' }
] as const;

/**
 * Opciones de método de pago para filtros
 */
export const METODOS_PAGO = [
  { value: '', label: 'Todos', icon: '💰' },
  { value: 'efectivo', label: 'Efectivo', icon: '💵' },
  { value: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { value: 'transferencia', label: 'Transferencia', icon: '🏦' }
] as const;
