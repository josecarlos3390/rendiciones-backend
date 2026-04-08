import { Injectable, Logger } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { AppModeService } from './app-mode.service';
import { ClaudeService } from './claude.service';
import { ChatConsultaDto, ChatRespuesta } from '../dto/chat.dto';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly aiConfig: AiConfigService,
    private readonly appMode: AppModeService,
    private readonly claudeService: ClaudeService,
  ) {}

  async procesarConsulta(dto: ChatConsultaDto): Promise<ChatRespuesta> {
    if (!this.aiConfig.enabled) {
      return {
        mensaje: 'Las funcionalidades de IA no están habilitadas. Contacta al administrador.',
        tipo: 'texto',
        sugerencias: ['¿Cómo activar IA?', 'Contactar soporte'],
        timestamp: new Date().toISOString(),
      };
    }

    const esOnline = this.appMode.isOnline;
    this.logger.log(`Chatbot: "${dto.mensaje}" - Modo: ${esOnline ? 'ONLINE' : 'OFFLINE'}`);

    try {
      // Detectar si es consulta contable específica
      if (this.claudeService.esConsultaContable(dto.mensaje)) {
        this.logger.log('Detectada consulta contable boliviana, usando prompt especializado');
        const resultadoContable = await this.claudeService.consultarNormaContable(dto.mensaje);
        
        return {
          mensaje: resultadoContable.respuesta,
          tipo: 'contabilidad',
          datos: { fuentes: resultadoContable.fuentes },
          sugerencias: this.generarSugerenciasContabilidad(dto.mensaje),
          timestamp: new Date().toISOString(),
        };
      }

      const contexto = await this.recolectarContexto(dto.usuarioId, esOnline);
      const respuestaIA = await this.claudeService.procesarChat({
        mensaje: dto.mensaje,
        historial: dto.historial || [],
        contexto: {
          ...contexto,
          paginaActual: dto.paginaActual,
          modo: esOnline ? 'ONLINE' : 'OFFLINE',
        },
      });

      return {
        mensaje: respuestaIA.mensaje,
        tipo: (respuestaIA.tipo as any) || 'texto',
        datos: respuestaIA.datos,
        sugerencias: respuestaIA.sugerencias || this.generarSugerencias(dto.mensaje),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Error chatbot: ${error.message}`);
      return {
        mensaje: this.obtenerRespuestaFallback(dto.mensaje),
        tipo: 'texto',
        sugerencias: ['¿Cuánto he gastado?', 'Crear rendición', 'Ver normas contables'],
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async recolectarContexto(usuarioId: string | undefined, esOnline: boolean) {
    return {
      usuario: { id: usuarioId || '123', nombre: 'Usuario', departamento: 'Comercial' },
      statsMes: { mes: 'Abril 2026', totalGastado: 6500, cantidadRendiciones: 3 },
      rendicionesRecientes: [],
      presupuesto: esOnline ? { asignado: 10000, consumido: 65 } : undefined,
    };
  }

  private generarSugerencias(consulta: string): string[] {
    const temas: Record<string, string[]> = {
      gasto: ['¿Cuál es mi presupuesto?', 'Ver rendiciones'],
      default: ['¿Cuánto he gastado?', 'Crear rendición', 'Ver normas contables'],
    };
    return temas[Object.keys(temas).find(k => consulta.toLowerCase().includes(k)) || 'default'] || temas.default;
  }

  private generarSugerenciasContabilidad(consulta: string): string[] {
    const temas: Record<string, string[]> = {
      it: ['¿Cómo se calcula el IT?', 'Retenciones IT', 'IT vs IUE'],
      iva: ['Crédito fiscal IVA', 'RC-IVA en alquileres', 'Facturas sin crédito fiscal'],
      retencion: ['Retenciones a proveedores', 'Formulario 410', 'Formulario 604'],
      factura: ['Tipos de factura en Bolivia', 'CUF válido', 'Factura electrónica'],
      iue: ['Gastos deducibles IUE', 'Compensación IT/IUE', 'Tasa IUE 25%'],
      default: [
        '¿Qué impuestos tiene una factura?',
        'Retenciones en compras sin factura',
        'Asiento contable de compra',
        'Plazos de declaración'
      ],
    };
    const clave = Object.keys(temas).find(k => consulta.toLowerCase().includes(k));
    return clave ? temas[clave] : temas.default;
  }

  private obtenerRespuestaFallback(consulta: string): string {
    const q = consulta.toLowerCase();
    if (q.includes('hola')) return '¡Hola! Soy tu asistente. ¿En qué puedo ayudarte?';
    if (q.includes('gastado')) return 'Este mes llevas Bs. 6,500 en 3 rendiciones.';
    if (q.includes('presupuesto')) return 'Tu presupuesto es Bs. 10,000. Te quedan Bs. 3,500.';
    return 'Entiendo. ¿Puedes ser más específico? Puedo ayudarte con: gastos, rendiciones, normas...';
  }
}
