/**
 * 🤖 COMPONENTE DE CHAT FLOTANTE CON IA
 * Botón morado inferior derecha que despliega un panel de chat
 * con inteligencia artificial para ayuda sobre Ventify
 */
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService, AiChatMessage } from '../../services/ai.service';
import { ReportsService } from '../../services/reports.service';
import { ProductsService } from '../../services/products.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ai-chat-float',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat-float.component.html',
  styleUrls: ['./ai-chat-float.component.css']
})
export class AiChatFloatComponent {
  // Estado del panel
  isOpen = signal(false);
  
  // Chat
  messages = signal<AiChatMessage[]>([]);
  currentQuestion = signal('');
  loading = signal(false);
  error = signal<string | null>(null);

  // Auth state
  isAuthenticated = signal(false);
  isOnLoginRoute = signal(false);

  constructor(
    private aiService: AiService,
    private auth: AuthService,
    private router: Router,
    private reports: ReportsService,
    private products: ProductsService
  ) {
    // Inicializar estado de autenticación y ruta
    this.checkAuth();
    this.isOnLoginRoute.set(this.router.url.includes('/login'));

    // Reaccionar a cambios de sesión
    this.auth.currentSession$.subscribe(session => {
      this.isAuthenticated.set(!!session || this.auth.isAuthenticated());
    });
  }

  private checkAuth(): void {
    this.isAuthenticated.set(this.auth.isAuthenticated());
  }

  toggleChat(): void {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen() && this.messages().length === 0) {
      // Mensaje de bienvenida
      this.messages.set([{
        role: 'assistant',
        content: '¡Hola! 👋 Soy tu asistente de Ventify. ¿En qué puedo ayudarte hoy? Puedo responder sobre:\n\n• Punto de venta y ventas\n• Inventario y productos\n• Reportes y estadísticas\n• Mermas y ajustes\n• Configuración del sistema'
      }]);
    }
  }

  enviarPregunta(): void {
    const question = this.currentQuestion().trim();
    if (!question || this.loading()) return;

    // No enviar si no está autenticado
    if (!this.isAuthenticated()) {
      this.error.set('Inicia sesión para usar el asistente.');
      return;
    }

    // Detectar si el usuario pide métricas del negocio
    const qLower = question.toLowerCase();
    const metricsKeywords = ['ventas de hoy', 'ventas del día', 'cuántas ventas', 'total del día', 'ingresos de hoy', 'kpi', 'métricas'];
    const wantsMetrics = metricsKeywords.some(kw => question.toLowerCase().includes(kw));

    if (wantsMetrics) {
      // Mostrar pregunta del usuario
      const userMsg = { role: 'user' as const, content: question };
      this.messages.set([...this.messages(), userMsg]);
      this.currentQuestion.set('');
      this.loading.set(true);
      this.error.set(null);

      // Obtener métricas reales del backend
      this.aiService.getMetricsToday().subscribe({
        next: (metrics) => {
          const response = this.formatMetricsResponse(metrics);
          this.messages.set([
            ...this.messages(),
            { role: 'assistant', content: response }
          ]);
          this.loading.set(false);
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (err) => {
          console.error('Error obteniendo métricas:', err);
          this.error.set('No pude obtener las métricas del negocio. Intenta de nuevo.');
          this.loading.set(false);
        }
      });
      return;
    }

    // Ventas del mes/año/día (reportes agregados)
    const wantsMonthSales = /ventas.*mes|del mes|este mes|mes actual/.test(qLower);
    const wantsYearSales = /ventas.*año|del año|este año|año actual|anio/.test(qLower);
    const wantsDaySales = /ventas.*día|del día|hoy.*ventas/.test(qLower);

    if (wantsMonthSales || wantsYearSales || wantsDaySales) {
      const userMsg = { role: 'user' as const, content: question };
      this.messages.set([...this.messages(), userMsg]);
      this.currentQuestion.set('');
      this.loading.set(true);
      this.error.set(null);

      const now = new Date();
      let inicio: Date;
      let fin: Date;
      let agrupacion: 'dia' | 'semana' | 'mes' | 'anio' = 'dia';

      if (wantsMonthSales) {
        inicio = new Date(now.getFullYear(), now.getMonth(), 1);
        fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        agrupacion = 'dia';
      } else if (wantsYearSales) {
        inicio = new Date(now.getFullYear(), 0, 1);
        fin = new Date(now.getFullYear(), 11, 31);
        agrupacion = 'mes';
      } else {
        // día
        inicio = new Date(now);
        inicio.setHours(0, 0, 0, 0);
        fin = new Date(now);
        fin.setHours(23, 59, 59, 999);
        agrupacion = 'dia';
      }

      this.reports.getReporteVentas({
        fechaInicio: inicio.toISOString(),
        fechaFin: fin.toISOString(),
        tipoAgrupacion: agrupacion
      } as any).subscribe({
        next: (rep: any) => {
          const text = this.formatSalesReport(rep, agrupacion);
          this.messages.set([
            ...this.messages(),
            { role: 'assistant', content: text }
          ]);
          this.loading.set(false);
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (err) => {
          console.error('Error obteniendo reporte de ventas:', err);
          this.error.set('No pude obtener el reporte de ventas. Intenta de nuevo.');
          this.loading.set(false);
        }
      });
      return;
    }

    // Productos e inventario: listar activos, stock bajo, etc.
    const wantsProducts = /productos|inventario|lista de productos|stock/.test(qLower);
    const wantsLowStock = /stock bajo|poco stock|mínimo|minimo/.test(qLower);

    if (wantsProducts || wantsLowStock) {
      const userMsg = { role: 'user' as const, content: question };
      this.messages.set([...this.messages(), userMsg]);
      this.currentQuestion.set('');
      this.loading.set(true);
      this.error.set(null);

      if (wantsLowStock) {
        this.reports.getInventarioStockBajo().subscribe({
          next: (items) => {
            const resp = this.formatLowStock(items);
            this.messages.set([...this.messages(), { role: 'assistant', content: resp }]);
            this.loading.set(false);
            setTimeout(() => this.scrollToBottom(), 100);
          },
          error: (err) => {
            console.error('Error inventario stock bajo:', err);
            this.error.set('No pude obtener productos con stock bajo.');
            this.loading.set(false);
          }
        });
      } else {
        this.products.list('activos').subscribe({
          next: (prods) => {
            const resp = this.formatProductsList(prods);
            this.messages.set([...this.messages(), { role: 'assistant', content: resp }]);
            this.loading.set(false);
            setTimeout(() => this.scrollToBottom(), 100);
          },
          error: (err) => {
            console.error('Error listando productos:', err);
            this.error.set('No pude obtener la lista de productos.');
            this.loading.set(false);
          }
        });
      }
      return;
    }

    // Agregar pregunta del usuario
    const newMessages = [
      ...this.messages(),
      { role: 'user' as const, content: question }
    ];
    this.messages.set(newMessages);
    this.currentQuestion.set('');
    this.loading.set(true);
    this.error.set(null);

    // Enviar a la IA
    this.aiService.chat(newMessages).subscribe({
      next: (response) => {
        this.messages.set([
          ...this.messages(),
          { role: 'assistant', content: response.message }
        ]);
        this.loading.set(false);
        
        // Auto-scroll al final
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        console.error('Error en chat IA:', err);
        this.error.set('No pude procesar tu pregunta. Intenta de nuevo.');
        this.loading.set(false);
      }
    });
  }

  limpiarChat(): void {
    this.messages.set([{
      role: 'assistant',
      content: '¡Hola! 👋 Soy tu asistente de Ventify. ¿En qué puedo ayudarte hoy?'
    }]);
    this.currentQuestion.set('');
    this.error.set(null);
  }

  private scrollToBottom(): void {
    const chatBody = document.querySelector('.ai-chat-messages');
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarPregunta();
    }
  }

  private formatMetricsResponse(metrics: any): string {
    const { ventasHoy, totalIngresos, ticketPromedio, metodoPago, modoCajaAbierta, inicioReal, finReal, mensaje } = metrics;
    
    let response = '📊 **Métricas de tu negocio:**\n\n';
    
    if (modoCajaAbierta && inicioReal) {
      const inicio = new Date(inicioReal).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      response += `🟢 **Caja abierta** desde las ${inicio}\n\n`;
    }
    
    response += `🛒 **Ventas realizadas:** ${ventasHoy || 0}\n`;
    response += `💰 **Total de ingresos:** $${(totalIngresos || 0).toFixed(2)}\n`;
    response += `🧾 **Ticket promedio:** $${(ticketPromedio || 0).toFixed(2)}\n\n`;
    
    if (metodoPago) {
      response += `💳 **Métodos de pago:**\n`;
      response += `  • Efectivo: ${metodoPago.efectivo || 0}%\n`;
      response += `  • Tarjeta: ${metodoPago.tarjeta || 0}%\n`;
      response += `  • Transferencia: ${metodoPago.transferencia || 0}%\n`;
    }
    
    if (mensaje) {
      response += `\n${mensaje}`;
    }
    
    return response;
  }

  private formatSalesReport(rep: any, agrupacion: 'dia' | 'semana' | 'mes' | 'anio'): string {
    // Esperamos estructura de ReporteVentasCompleto
    const total = rep?.resumen?.total || rep?.total || 0;
    const ventas = rep?.resumen?.cantidadVentas || rep?.cantidadVentas || 0;
    const ticketProm = rep?.resumen?.ticketPromedio || rep?.ticketPromedio || 0;
    const byGroup = rep?.agrupado || rep?.series || [];

    let title = '📈 Ventas';
    if (agrupacion === 'mes') title += ' por mes (año actual)';
    else if (agrupacion === 'dia') title += ' del período';

    let s = `${title}\n\n`;
    s += `💵 Total: $${Number(total).toFixed(2)}\n`;
    s += `🛒 Ventas: ${ventas}\n`;
    s += `🧾 Ticket promedio: $${Number(ticketProm).toFixed(2)}\n\n`;

    if (Array.isArray(byGroup) && byGroup.length) {
      s += `Desglose:\n`;
      byGroup.slice(0, 12).forEach((g: any) => {
        const label = g?.label || g?.nombre || g?.fecha || g?.mes || 'Periodo';
        const subtotal = g?.total || g?.monto || 0;
        s += ` • ${label}: $${Number(subtotal).toFixed(2)}\n`;
      });
    }
    return s;
  }

  private formatProductsList(prods: any[]): string {
    if (!prods || prods.length === 0) return 'No hay productos activos.';
    const total = prods.length;
    let s = `🧩 Productos activos (${total}):\n\n`;
    prods.slice(0, 20).forEach(p => {
      const nombre = p.nombre || p.name || 'Sin nombre';
      const precio = p.precioVenta ?? p.price ?? 0;
      const stock = p.stockActual ?? p.stock ?? 0;
      s += ` • ${nombre} — Precio: $${Number(precio).toFixed(2)} — Stock: ${stock}\n`;
    });
    if (total > 20) s += `\n… y ${total - 20} más`;
    return s;
  }

  private formatLowStock(items: any[]): string {
    if (!items || items.length === 0) return 'No hay productos con stock bajo.';
    let s = `⚠️ Productos con stock bajo (${items.length}):\n\n`;
    items.slice(0, 20).forEach(it => {
      const nombre = it.nombre || it.name || 'Sin nombre';
      const stock = it.stockActual ?? it.stock ?? 0;
      const minimo = it.stockMinimo ?? it.minimo ?? 0;
      s += ` • ${nombre} — Stock: ${stock} (mínimo ${minimo})\n`;
    });
    if (items.length > 20) s += `\n… y ${items.length - 20} más`;
    return s;
  }
}
