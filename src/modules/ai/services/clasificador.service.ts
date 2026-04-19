import { Injectable, Logger, Inject } from "@nestjs/common";
import { AiConfigService } from "./ai-config.service";
import { AppModeService } from "./app-mode.service";
import {
  ClaudeService,
  CuentaIA,
  ProyectoIA,
  NormaIA,
  HistorialIA,
} from "./claude.service";
import { SugerirClasificacionDto } from "../dto/sugerir-clasificacion.dto";
import { ClasificacionSugeridaResponse } from "../interfaces/clasificacion-sugerida.interface";
import { SapService } from "../../sap/sap.service";
import { CoaService } from "../../coa/coa.service";
import { NormasService } from "../../normas/normas.service";
import { ProyectosService } from "../../proyectos/proyectos.service";
import { IRendDRepository } from "../../rend-d/repositories/rend-d.repository.interface";

/**
 * Servicio para sugerir clasificaciones de gastos usando IA
 * Funciona tanto en modo ONLINE (SAP Service Layer) como OFFLINE (Postgres local)
 */
@Injectable()
export class ClasificadorService {
  private readonly logger = new Logger(ClasificadorService.name);

  constructor(
    private readonly aiConfig: AiConfigService,
    private readonly appMode: AppModeService,
    private readonly claudeService: ClaudeService,
    private readonly sapService: SapService,
    private readonly coaService: CoaService,
    private readonly normasService: NormasService,
    private readonly proyectosService: ProyectosService,
    @Inject("REND_D_REPOSITORY")
    private readonly rendDRepo: IRendDRepository,
  ) {}

  /**
   * Sugiere clasificación contable para un gasto
   * Adapta automáticamente según el modo ONLINE/OFFLINE
   */
  async sugerirClasificacion(
    dto: SugerirClasificacionDto,
  ): Promise<ClasificacionSugeridaResponse> {
    // Verificar que IA esté habilitada
    if (!this.aiConfig.enabled) {
      throw new Error("Las funcionalidades de IA no están habilitadas");
    }

    const esOnline = this.appMode.isOnline;
    this.logger.log(
      `Sugiriendo clasificación en modo ${esOnline ? "ONLINE" : "OFFLINE"}`,
    );

    // Obtener catálogos según el modo
    const { cuentas, normas, proyectos, historial } =
      await this.obtenerDatosContexto(dto.usuarioId, esOnline);

    // Llamar a Claude para sugerir clasificación
    const sugerencia = await this.claudeService.sugerirClasificacion({
      concepto: dto.concepto,
      monto: dto.monto,
      proveedor: dto.proveedor,
      esOnline,
      cuentasDisponibles: cuentas,
      normasDisponibles: normas,
      proyectosDisponibles: proyectos,
      historialUsuario: historial,
    });

    // Construir respuesta según el modo
    const response: ClasificacionSugeridaResponse = {
      modo: esOnline ? "ONLINE" : "OFFLINE",
      cuentaContable: sugerencia.cuentaContable,
      razon: sugerencia.razon,
      fuenteDatos: esOnline ? "sap_service_layer" : "postgres_local",
      timestamp: new Date().toISOString(),
    };

    // Solo incluir norma en modo OFFLINE
    if (!esOnline && sugerencia.norma) {
      response.norma = sugerencia.norma;
    }

    // Incluir proyecto si existe
    if (sugerencia.proyecto !== undefined) {
      response.proyecto = sugerencia.proyecto;
    }

    this.logger.log(
      `Sugerencia generada: Cuenta ${response.cuentaContable.codigo} (confianza: ${response.cuentaContable.confianza})`,
    );

    return response;
  }

  /**
   * Obtiene los datos de contexto según el modo
   */
  private async obtenerDatosContexto(
    usuarioId: string | undefined,
    esOnline: boolean,
  ): Promise<{
    cuentas: CuentaIA[];
    normas?: NormaIA[];
    proyectos?: ProyectoIA[];
    historial: HistorialIA[];
  }> {
    if (esOnline) {
      return this.obtenerDatosOnline(usuarioId);
    } else {
      return this.obtenerDatosOffline(usuarioId);
    }
  }

  /**
   * Obtiene datos desde SAP Service Layer (modo ONLINE)
   * ✅ IMPLEMENTADO: Usa SapService para obtener datos reales
   */
  private async obtenerDatosOnline(usuarioId?: string): Promise<{
    cuentas: CuentaIA[];
    proyectos: ProyectoIA[];
    historial: HistorialIA[];
  }> {
    this.logger.debug("Obteniendo datos desde SAP Service Layer");

    try {
      // Obtener datos reales desde SAP Service Layer
      const [chartOfAccounts, projects] = await Promise.all([
        this.sapService.getChartOfAccounts().catch((err) => {
          this.logger.warn(
            "Error obteniendo ChartOfAccounts de SAP:",
            err.message,
          );
          return [];
        }),
        this.sapService.getProjects().catch((err) => {
          this.logger.warn("Error obteniendo Projects de SAP:", err.message);
          return [];
        }),
      ]);

      // Mapear cuentas al formato esperado por la IA
      const cuentas = chartOfAccounts.map((cuenta) => ({
        code: cuenta.code,
        name: cuenta.name,
        formatCode: cuenta.formatCode,
        type: "Expense",
      }));

      // Mapear proyectos al formato esperado
      const proyectos = projects.map((proj) => ({
        code: proj.code,
        name: proj.name,
      }));

      this.logger.log(
        `Datos SAP obtenidos: ${cuentas.length} cuentas, ${proyectos.length} proyectos`,
      );

      // Historial del usuario
      const historial = await this.obtenerHistorialUsuario(usuarioId);

      // Si no se obtuvieron datos, usar datos de fallback para no romper la funcionalidad
      if (cuentas.length === 0) {
        this.logger.warn("No se obtuvieron cuentas de SAP, usando fallback");
        const fallback = this.obtenerDatosFallbackOnline();
        return { ...fallback, historial };
      }

      return {
        cuentas,
        proyectos:
          proyectos.length > 0 ? proyectos : this.obtenerProyectosFallback(),
        historial,
      };
    } catch (error) {
      this.logger.error("Error obteniendo datos de SAP:", error);
      const fallback = this.obtenerDatosFallbackOnline();
      const historial = await this.obtenerHistorialUsuario(usuarioId);
      return { ...fallback, historial };
    }
  }

  /**
   * Datos fallback para modo ONLINE cuando SAP no responde
   */
  private obtenerDatosFallbackOnline(): {
    cuentas: CuentaIA[];
    proyectos: ProyectoIA[];
    historial: HistorialIA[];
  } {
    this.logger.warn("Usando datos fallback para modo ONLINE");
    return {
      cuentas: [
        {
          code: "6.1.1.01",
          name: "Combustibles y Lubricantes",
          type: "Expense",
        },
        { code: "6.1.1.02", name: "Materiales de Oficina", type: "Expense" },
        {
          code: "6.1.1.03",
          name: "Servicios de Telecomunicaciones",
          type: "Expense",
        },
        {
          code: "6.2.1.01",
          name: "Gastos de Viaje - Transporte",
          type: "Expense",
        },
        {
          code: "6.2.1.02",
          name: "Gastos de Viaje - Alojamiento",
          type: "Expense",
        },
        {
          code: "6.2.1.03",
          name: "Gastos de Viaje - Alimentación",
          type: "Expense",
        },
        { code: "6.3.1.01", name: "Gastos de Representación", type: "Expense" },
        { code: "6.4.1.01", name: "Servicios Profesionales", type: "Expense" },
      ],
      proyectos: this.obtenerProyectosFallback(),
      historial: [],
    };
  }

  private obtenerProyectosFallback(): ProyectoIA[] {
    return [
      { code: "PRJ-2026-01", name: "Proyecto Norte" },
      { code: "PRJ-2026-02", name: "Proyecto Sur" },
      { code: "PRJ-2026-03", name: "Expansión 2026" },
    ];
  }

  /**
   * Obtiene datos desde Postgres local (modo OFFLINE)
   * ✅ IMPLEMENTADO: Usa servicios reales de COA, Normas y Proyectos
   */
  private async obtenerDatosOffline(usuarioId?: string): Promise<{
    cuentas: CuentaIA[];
    normas: NormaIA[];
    proyectos: ProyectoIA[];
    historial: HistorialIA[];
  }> {
    this.logger.debug("Obteniendo datos desde PostgreSQL local (modo OFFLINE)");

    try {
      // Obtener datos reales desde la base de datos local
      const [cuentasCOA, normasDB, proyectosDB] = await Promise.all([
        this.coaService.findAll({ activa: true }).catch((err) => {
          this.logger.warn("Error obteniendo COA:", err.message);
          return [];
        }),
        this.normasService.findAll({ activa: true }).catch((err) => {
          this.logger.warn("Error obteniendo Normas:", err.message);
          return [];
        }),
        this.proyectosService.findAll({ activo: true }).catch((err) => {
          this.logger.warn("Error obteniendo Proyectos:", err.message);
          return [];
        }),
      ]);

      // Mapear cuentas al formato esperado por la IA
      const cuentas = cuentasCOA.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        formatCode: c.formatCode,
        type: "Gasto",
      }));

      // Mapear normas al formato esperado
      const normas = normasDB.map((n) => ({
        idNorma: n.id,
        descripcion: n.descripcion,
        code: n.code,
      }));

      // Mapear proyectos al formato esperado
      const proyectos = proyectosDB.map((p) => ({
        idProyecto: p.id,
        code: p.code,
        name: p.name,
      }));

      this.logger.log(
        `Datos OFFLINE obtenidos: ${cuentas.length} cuentas, ${normas.length} normas, ${proyectos.length} proyectos`,
      );

      // Historial del usuario
      const historial = await this.obtenerHistorialUsuario(usuarioId);

      // Si no hay datos, usar fallback
      if (
        cuentas.length === 0 &&
        normas.length === 0 &&
        proyectos.length === 0
      ) {
        this.logger.warn(
          "No se obtuvieron datos de la base local, usando fallback",
        );
        const fallback = this.obtenerDatosFallbackOffline();
        return { ...fallback, historial };
      }

      return {
        cuentas:
          cuentas.length > 0 ? cuentas : this.obtenerCuentasFallbackOffline(),
        normas:
          normas.length > 0 ? normas : this.obtenerNormasFallbackOffline(),
        proyectos:
          proyectos.length > 0
            ? proyectos
            : this.obtenerProyectosFallbackOffline(),
        historial,
      };
    } catch (error) {
      this.logger.error("Error obteniendo datos OFFLINE:", error);
      const fallback = this.obtenerDatosFallbackOffline();
      const historial = await this.obtenerHistorialUsuario(usuarioId);
      return { ...fallback, historial };
    }
  }

  /**
   * Datos fallback para modo OFFLINE
   */
  private obtenerDatosFallbackOffline(): {
    cuentas: CuentaIA[];
    normas: NormaIA[];
    proyectos: ProyectoIA[];
    historial: HistorialIA[];
  } {
    this.logger.warn("Usando datos fallback para modo OFFLINE");
    return {
      cuentas: this.obtenerCuentasFallbackOffline(),
      normas: this.obtenerNormasFallbackOffline(),
      proyectos: this.obtenerProyectosFallbackOffline(),
      historial: [],
    };
  }

  private obtenerCuentasFallbackOffline(): CuentaIA[] {
    return [
      {
        id: 1,
        code: "6.1.1.01",
        name: "Combustible y lubricantes",
        type: "Gasto",
      },
      { id: 2, code: "6.1.1.02", name: "Materiales de oficina", type: "Gasto" },
      {
        id: 3,
        code: "6.1.1.03",
        name: "Servicios de telecomunicaciones",
        type: "Gasto",
      },
      {
        id: 4,
        code: "6.2.1.01",
        name: "Gastos de viaje - Transporte",
        type: "Gasto",
      },
      {
        id: 5,
        code: "6.2.1.02",
        name: "Gastos de viaje - Alojamiento",
        type: "Gasto",
      },
      {
        id: 6,
        code: "6.2.1.03",
        name: "Gastos de viaje - Alimentación",
        type: "Gasto",
      },
      {
        id: 7,
        code: "6.3.1.01",
        name: "Gastos de representación",
        type: "Gasto",
      },
      {
        id: 8,
        code: "6.4.1.01",
        name: "Servicios profesionales",
        type: "Gasto",
      },
    ];
  }

  private obtenerNormasFallbackOffline(): NormaIA[] {
    return [
      { idNorma: 1, descripcion: "Gastos de Viaje Nacional" },
      { idNorma: 2, descripcion: "Gastos de Viaje Internacional" },
      { idNorma: 3, descripcion: "Gastos de Representación" },
      { idNorma: 4, descripcion: "Materiales y Suministros" },
      { idNorma: 5, descripcion: "Servicios Profesionales" },
    ];
  }

  private obtenerProyectosFallbackOffline(): ProyectoIA[] {
    return [
      { idProyecto: 1, code: "PRJ-001", name: "Proyecto Norte" },
      { idProyecto: 2, code: "PRJ-002", name: "Proyecto Sur" },
      { idProyecto: 3, code: "PRJ-003", name: "Expansión 2026" },
    ];
  }

  /**
   * Obtiene el historial de clasificaciones previas del usuario desde REND_D.
   * Si no hay usuarioId o falla la consulta, devuelve array vacío.
   */
  private async obtenerHistorialUsuario(
    usuarioId?: string,
    limit = 20,
  ): Promise<Array<{ concepto: string; cuenta: string; norma?: string }>> {
    const id = usuarioId ? Number(usuarioId) : NaN;
    if (isNaN(id)) {
      return [];
    }

    try {
      const rows = await this.rendDRepo.findHistorialClasificaciones(id, limit);
      this.logger.log(
        `Historial de clasificaciones obtenido: ${rows.length} registros para usuario ${id}`,
      );
      return rows.map((r) => ({
        concepto: r.concepto,
        cuenta: r.cuenta,
        norma: r.norma ?? undefined,
      }));
    } catch (err: unknown) {
      this.logger.warn(
        "Error obteniendo historial de clasificaciones:",
        err instanceof Error ? err.message : String(err),
      );
      return [];
    }
  }
}
