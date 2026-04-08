import { Injectable, Logger } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { AppModeService } from './app-mode.service';
import { ClaudeService } from './claude.service';
import {
  AnalisisRendicionResponse,
  AnalisisContext,
} from '../interfaces/analisis-rendicion.interface';

/**
 * Servicio para analizar rendiciones y asistir a aprobadores
 * Funciona tanto en modo ONLINE como OFFLINE
 */
@Injectable()
export class AnalisisRendicionService {
  private readonly logger = new Logger(AnalisisRendicionService.name);

  constructor(
    private readonly aiConfig: AiConfigService,
    private readonly appMode: AppModeService,
    private readonly claudeService: ClaudeService,
  ) {}

  /**
   * Analiza una rendición para asistir al aprobador
   * @param idRendicion ID de la rendición
   * @param usuarioId ID del usuario solicitante
   */
  async analizarRendicion(
    idRendicion: number,
    usuarioId?: string,
  ): Promise<AnalisisRendicionResponse> {
    // Verificar que IA esté habilitada
    if (!this.aiConfig.enabled) {
      throw new Error('Las funcionalidades de IA no están habilitadas');
    }

    const esOnline = this.appMode.isOnline;
    this.logger.log(`Analizando rendición ${idRendicion} en modo ${esOnline ? 'ONLINE' : 'OFFLINE'}`);

    // Obtener datos del contexto
    const contexto = await this.obtenerContextoAnalisis(idRendicion, usuarioId, esOnline);

    // Realizar análisis con Claude
    const analisisIA = await this.claudeService.analizarRendicion(contexto);

    // Construir respuesta
    const response: AnalisisRendicionResponse = {
      idRendicion,
      modo: esOnline ? 'ONLINE' : 'OFFLINE',
      scoreRiesgo: analisisIA.scoreRiesgo,
      nivel: analisisIA.nivel,
      recomendacion: analisisIA.recomendacion,
      justificacion: analisisIA.justificacion,
      factoresPositivos: analisisIA.factoresPositivos,
      factoresRiesgo: analisisIA.factoresRiesgo,
      analisisSolicitante: contexto.historial.length > 0
        ? this.calcularStatsSolicitante(contexto.solicitante, contexto.historial)
        : {
            nombre: contexto.solicitante.nombre,
            rendicionesPrevias: 0,
            tasaAprobacion: 0,
            montoPromedio: 0,
            antiguedadMeses: this.calcularAntiguedad(contexto.solicitante.fechaRegistro),
          },
      analisisMontos: {
        montoActual: contexto.rendicion.monto,
        montoPromedioUsuario: this.calcularMontoPromedio(contexto.historial),
        montoPromedioDepartamento: contexto.statsDepartamento?.montoPromedio || 0,
        variacionPorcentaje: 0,
        esAnormal: false,
      },
      alertas: analisisIA.alertas || [],
      datosSAP: esOnline ? await this.obtenerDatosSAP(idRendicion) : null,
      timestamp: new Date().toISOString(),
    };

    // Calcular variación porcentaje
    if (response.analisisMontos.montoPromedioUsuario > 0) {
      response.analisisMontos.variacionPorcentaje = Math.round(
        ((response.analisisMontos.montoActual - response.analisisMontos.montoPromedioUsuario) /
          response.analisisMontos.montoPromedioUsuario) *
          100,
      );
    }

    // Determinar si es anormal
    response.analisisMontos.esAnormal =
      Math.abs(response.analisisMontos.variacionPorcentaje) > 50;

    // Agregar análisis de facturas si hay
    if (contexto.facturas.length > 0) {
      response.analisisFacturas = {
        totalFacturas: contexto.facturas.length,
        facturasValidadas: contexto.facturas.filter((f) => f.validadoSiat).length,
        facturasConDiscrepancia: 0, // Se calcularía con validación SIAT real
        facturasSospechosas: contexto.facturas.filter(
          (f) => f.monto > 10000 || !f.cuf,
        ).length,
      };
    }

    this.logger.log(`Análisis completado: Score ${response.scoreRiesgo}, Nivel ${response.nivel}`);

    return response;
  }

  /**
   * Obtiene el contexto completo para el análisis
   */
  private async obtenerContextoAnalisis(
    idRendicion: number,
    usuarioId: string | undefined,
    esOnline: boolean,
  ): Promise<AnalisisContext> {
    // Por ahora usamos datos mock
    // En implementación real, se consultarían los repositorios/SAP

    const fechaBase = new Date();
    fechaBase.setMonth(fechaBase.getMonth() - 6);

    return {
      idRendicion,
      rendicion: {
        monto: 3500,
        fecha: new Date().toISOString(),
        estado: 'PENDIENTE',
        descripcion: 'Gastos de viaje a Santa Cruz',
      },
      solicitante: {
        id: usuarioId || '123',
        nombre: 'Juan Pérez',
        departamento: 'Comercial',
        fechaRegistro: fechaBase.toISOString(),
      },
      historial: [
        { idRendicion: 1, monto: 2800, estado: 'APROBADA', fecha: '2026-01-15' },
        { idRendicion: 2, monto: 1500, estado: 'APROBADA', fecha: '2026-02-10' },
        { idRendicion: 3, monto: 4200, estado: 'APROBADA', fecha: '2026-03-05' },
      ],
      facturas: [
        {
          nit: '123456789',
          proveedor: 'Aerolínea BOA',
          monto: 2500,
          cuf: 'A1B2C3D4E5F6',
          validadoSiat: true,
        },
        {
          nit: '987654321',
          proveedor: 'Hotel Camino Real',
          monto: 800,
          cuf: 'F6E5D4C3B2A1',
          validadoSiat: true,
        },
        {
          nit: '555555555',
          proveedor: 'Restaurant El Fogón',
          monto: 200,
          cuf: undefined,
          validadoSiat: false,
        },
      ],
      statsDepartamento: {
        montoPromedio: 3200,
        cantidadRendiciones: 45,
      },
      esOnline,
    };
  }

  /**
   * Calcula estadísticas del solicitante
   */
  private calcularStatsSolicitante(
    solicitante: any,
    historial: any[],
  ): {
    nombre: string;
    rendicionesPrevias: number;
    tasaAprobacion: number;
    montoPromedio: number;
    antiguedadMeses: number;
  } {
    const aprobadas = historial.filter((h) => h.estado === 'APROBADA').length;
    const montoTotal = historial.reduce((sum, h) => sum + h.monto, 0);

    return {
      nombre: solicitante.nombre,
      rendicionesPrevias: historial.length,
      tasaAprobacion: historial.length > 0 ? Math.round((aprobadas / historial.length) * 100) : 0,
      montoPromedio: historial.length > 0 ? Math.round(montoTotal / historial.length) : 0,
      antiguedadMeses: this.calcularAntiguedad(solicitante.fechaRegistro),
    };
  }

  /**
   * Calcula la antigüedad en meses
   */
  private calcularAntiguedad(fechaRegistro: string): number {
    const registro = new Date(fechaRegistro);
    const ahora = new Date();
    const diffTime = Math.abs(ahora.getTime() - registro.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  }

  /**
   * Calcula el monto promedio del historial
   */
  private calcularMontoPromedio(historial: any[]): number {
    if (historial.length === 0) return 0;
    const total = historial.reduce((sum, h) => sum + h.monto, 0);
    return Math.round(total / historial.length);
  }

  /**
   * Obtiene datos de SAP (solo modo ONLINE)
   */
  private async obtenerDatosSAP(_idRendicion: number): Promise<{
    presupuestoDisponible: number;
    presupuestoConsumido: number;
    proveedoresVerificados: boolean;
  } | null> {
    // En implementación real, consultaría el SapService
    return {
      presupuestoDisponible: 15000,
      presupuestoConsumido: 65,
      proveedoresVerificados: true,
    };
  }
}
