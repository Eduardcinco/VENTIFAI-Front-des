import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * 🤖 SERVICIO DE INTELIGENCIA ARTIFICIAL
 * Conecta con el backend que hace proxy a OpenRouter
 * 
 * Endpoints disponibles:
 * - POST /api/ai/chat - Chat de ayuda sobre Ventify
 * - POST /api/ai/post-producto - Genera copys para redes sociales
 */

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiChatRequest {
  messages: AiChatMessage[];
}

export interface AiChatResponse {
  message: string;
}

export interface AiPostRequest {
  productoId: number;
  plataforma?: 'instagram' | 'facebook' | 'tiktok' | 'todas';
}

export interface AiPostResponse {
  copies: string;
}

export interface AiMetricsResponse {
  ventasHoy: number;
  totalIngresos: number;
  ticketPromedio: number;
  metodoPago: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
  };
  modoCajaAbierta: boolean;
  inicioReal?: string;
  finReal?: string;
  mensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private readonly apiUrl = `${environment.apiUrl}//ai`;

  constructor(private http: HttpClient) {}

  /**
   * 💬 Chat con IA sobre Ventify (POS, inventario, reportes, etc.)
   * @param messages Historial de mensajes del chat
   * @returns Observable con la respuesta de la IA
   */
  chat(messages: AiChatMessage[]): Observable<AiChatResponse> {
    return this.http.post<AiChatResponse>(`${this.apiUrl}/chat`, { messages });
  }

  /**
   * 💬 Pregunta rápida (simplificado)
   * @param question Pregunta del usuario
   * @returns Observable con la respuesta de la IA
   */
  preguntaRapida(question: string): Observable<AiChatResponse> {
    const messages: AiChatMessage[] = [
      { role: 'user', content: question }
    ];
    return this.chat(messages);
  }

  /**
   * 📱 Genera copys para redes sociales de un producto
   * @param productoId ID del producto
   * @param plataforma Red social objetivo (opcional, por defecto 'todas')
   * @returns Observable con 3 versiones de copy
   */
  generarPost(productoId: number, plataforma: 'instagram' | 'facebook' | 'tiktok' | 'todas' = 'todas'): Observable<AiPostResponse> {
    return this.http.post<AiPostResponse>(`${this.apiUrl}/post-producto`, {
      productoId,
      plataforma
    });
  }

  /**
   * 📊 Obtiene métricas del día actual o caja abierta
   * @returns Observable con KPIs en tiempo real del negocio del usuario
   */
  getMetricsToday(): Observable<AiMetricsResponse> {
    return this.http.get<AiMetricsResponse>(`${this.apiUrl}/metrics/today`);
  }
}
