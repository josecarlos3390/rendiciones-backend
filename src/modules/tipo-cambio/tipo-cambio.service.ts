import {
  Injectable,
  Inject,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ITipoCambioRepository,
  TIPO_CAMBIO_REPOSITORY,
} from "./repositories/tipo-cambio.repository.interface";
import {
  ITipoCambio,
  ITipoCambioFilter,
} from "./interfaces/tipo-cambio.interface";
import {
  CreateTipoCambioDto,
  UpdateTipoCambioDto,
} from "./dto/create-tipo-cambio.dto";

/**
 * Servicio de Tipos de Cambio
 *
 * En modo ONLINE: Consulta a SAP Service Layer (implementado en SapSlService)
 * En modo OFFLINE: Consulta a base de datos local (vía repository)
 */
@Injectable()
export class TipoCambioService {
  private readonly logger = new Logger(TipoCambioService.name);

  constructor(
    @Inject(TIPO_CAMBIO_REPOSITORY)
    private readonly repo: ITipoCambioRepository,
    private readonly config: ConfigService,
  ) {}

  private get isOffline(): boolean {
    return (
      this.config.get<string>("app.mode", "ONLINE").toUpperCase() === "OFFLINE"
    );
  }

  /**
   * Obtener el tipo de cambio para una fecha y moneda específicas
   *
   * @param fecha - Fecha en formato YYYY-MM-DD
   * @param moneda - Código de moneda (ej: 'USD')
   * @returns Tasa de cambio
   * @throws NotFoundException si no existe tipo de cambio
   */
  async obtenerTasa(fecha: string, moneda: string = "USD"): Promise<number> {
    this.logger.debug(
      `Obteniendo tasa de cambio para ${moneda} en fecha ${fecha}`,
    );

    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new InternalServerErrorException(
        `Formato de fecha inválido: ${fecha}. Use YYYY-MM-DD`,
      );
    }

    const tasa = await this.repo.findByFechaMoneda(fecha, moneda);

    if (tasa === null) {
      throw new NotFoundException(
        `No se encontró tipo de cambio para ${moneda} en fecha ${fecha}. ` +
          `Registre el tipo de cambio en Administración > Tipos de Cambio.`,
      );
    }

    if (tasa <= 0) {
      throw new InternalServerErrorException(
        `Tipo de cambio inválido (${tasa}) para ${moneda} en fecha ${fecha}`,
      );
    }

    this.logger.debug(`Tasa encontrada: ${tasa}`);
    return tasa;
  }

  /**
   * Verificar si existe tipo de cambio para una fecha/moneda
   */
  async existeTasa(fecha: string, moneda: string = "USD"): Promise<boolean> {
    return this.repo.exists(fecha, moneda);
  }

  // ── CRUD (solo para modo OFFLINE) ─────────────────────────────────────────

  async create(data: CreateTipoCambioDto): Promise<ITipoCambio> {
    try {
      return await this.repo.create(data);
    } catch (error: unknown) {
      // Si ya existe, actualizar en lugar de crear
      if (error instanceof Error && error.message.includes("DUPLICATE")) {
        this.logger.warn(
          `Tipo de cambio existente, actualizando: ${data.moneda} - ${data.fecha}`,
        );

        // Buscar el registro existente para obtener su ID
        const existente = await this.repo.findByFechaMonedaCompleto(
          data.fecha,
          data.moneda,
        );
        if (existente?.U_IdTipoCambio) {
          return this.repo.update(existente.U_IdTipoCambio, {
            tasa: data.tasa,
            activo: "Y",
          });
        }
      }
      throw error;
    }
  }

  async update(id: number, data: UpdateTipoCambioDto): Promise<ITipoCambio> {
    return this.repo.update(id, data);
  }

  async findAll(filter?: ITipoCambioFilter): Promise<ITipoCambio[]> {
    return this.repo.findAll(filter);
  }

  async remove(id: number): Promise<void> {
    return this.repo.remove(id);
  }

  async findByFechaMoneda(
    fecha: string,
    moneda: string,
  ): Promise<ITipoCambio | null> {
    return this.repo.findByFechaMonedaCompleto(fecha, moneda);
  }
}
