import { Injectable, Logger, NotImplementedException } from "@nestjs/common";
import { SapService } from "../../../modules/sap/sap.service";
import { ITipoCambioRepository } from "./tipo-cambio.repository.interface";
import {
  ITipoCambio,
  ITipoCambioFilter,
} from "../interfaces/tipo-cambio.interface";
import {
  CreateTipoCambioDto,
  UpdateTipoCambioDto,
} from "../dto/create-tipo-cambio.dto";

/**
 * Implementación del repositorio de tipos de cambio para modo ONLINE (SAP)
 *
 * En modo ONLINE, los tipos de cambio se obtienen directamente desde
 * SAP Service Layer consultando la tabla estándar ORTT (Exchange Rates).
 *
 * NO se usa tabla local REND_TIPO_CAMBIO en HANA.
 * El mantenimiento de tipos de cambio se hace directamente en SAP B1.
 */
@Injectable()
export class TipoCambioHanaRepository implements ITipoCambioRepository {
  private readonly logger = new Logger(TipoCambioHanaRepository.name);

  constructor(private readonly sapService: SapService) {}

  async findByFechaMoneda(
    fecha: string,
    moneda: string,
  ): Promise<number | null> {
    return this.sapService.getTipoCambio(fecha, moneda);
  }

  async findByFechaMonedaCompleto(
    fecha: string,
    moneda: string,
  ): Promise<ITipoCambio | null> {
    const tasa = await this.sapService.getTipoCambio(fecha, moneda);
    if (tasa === null) return null;

    return {
      U_Fecha: fecha,
      U_Moneda: moneda.toUpperCase(),
      U_Tasa: tasa,
      U_Activo: "Y",
    };
  }

  async create(_data: CreateTipoCambioDto): Promise<ITipoCambio> {
    throw new NotImplementedException(
      "En modo ONLINE los tipos de cambio se administran directamente en SAP B1. " +
        "No se permite creación desde esta aplicación.",
    );
  }

  async update(_id: number, _data: UpdateTipoCambioDto): Promise<ITipoCambio> {
    throw new NotImplementedException(
      "En modo ONLINE los tipos de cambio se administran directamente en SAP B1. " +
        "No se permite actualización desde esta aplicación.",
    );
  }

  async findAll(_filter?: ITipoCambioFilter): Promise<ITipoCambio[]> {
    // En modo ONLINE no listamos tipos de cambio desde aquí
    // Se consultan directamente desde SAP B1 cuando se necesiten
    this.logger.warn(
      "findAll no implementado para modo ONLINE. Use findByFechaMoneda() para consultar SAP.",
    );
    return [];
  }

  async remove(_id: number): Promise<void> {
    throw new NotImplementedException(
      "En modo ONLINE los tipos de cambio se administran directamente en SAP B1. " +
        "No se permite eliminación desde esta aplicación.",
    );
  }

  async exists(fecha: string, moneda: string): Promise<boolean> {
    const tasa = await this.sapService.getTipoCambio(fecha, moneda);
    return tasa !== null;
  }
}
