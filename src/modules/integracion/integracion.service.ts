import {
  Injectable, Inject, NotFoundException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { IIntegracionRepository, INTEGRACION_REPOSITORY } from './repositories/integracion.repository.interface';
import { RendMService } from '../rend-m/rend-m.service';

@Injectable()
export class IntegracionService {
  private readonly logger = new Logger(IntegracionService.name);

  constructor(
    @Inject(INTEGRACION_REPOSITORY)
    private readonly repo: IIntegracionRepository,
    private readonly rendMSvc: RendMService,
  ) {}

  async getPendientes() {
    return this.repo.findPendientes();
  }

  async countPendientes(): Promise<{ count: number }> {
    const count = await this.repo.countPendientes();
    return { count };
  }

  async getHistorial(idRendicion: number) {
    return this.repo.findByRendicion(idRendicion);
  }

  async sincronizar(idRendicion: number, loginAdmin: string) {
    const rend = await this.rendMSvc.findOne(idRendicion);
    if (!rend) throw new NotFoundException(`Rendición ${idRendicion} no encontrada`);

    if (![3, 6].includes(rend.U_Estado)) {
      throw new BadRequestException(
        'Solo se pueden sincronizar rendiciones en estado APROBADO (3) o ERROR_SYNC (6)',
      );
    }

    // Calcular número de intento
    const historial = await this.repo.findByRendicion(idRendicion);
    const intento   = historial.length + 1;

    this.logger.log(`Sincronizando rendición ${idRendicion} — intento ${intento} por ${loginAdmin}`);

    try {
      // ── STUB: reemplazar con llamada real a SAP Service Layer ──────────
      // const nroDocERP = await this.sapService.crearDocumento(rend);
      const nroDocERP = `PENDIENTE-${idRendicion}`;
      // ──────────────────────────────────────────────────────────────────

      await this.repo.create({
        idRendicion,
        estado:    'OK',
        nroDocERP,
        loginAdmin,
        mensaje:   'Integración pendiente — conexión SAP no configurada',
        intento,
      });

      // Cambiar estado a SINCRONIZADO (5)
      await this.rendMSvc.updateEstado(idRendicion, 5);

      this.logger.log(`Rendición ${idRendicion} marcada como SINCRONIZADO`);
      return {
        success:   true,
        nroDocERP,
        mensaje:   'Registrado como pendiente de integración con SAP',
        estado:    'SINCRONIZADO',
      };

    } catch (err: any) {
      const mensaje = err?.message ?? 'Error desconocido al sincronizar';

      await this.repo.create({
        idRendicion,
        estado:    'ERROR',
        loginAdmin,
        mensaje,
        intento,
      });

      // Cambiar estado a ERROR_SYNC (6)
      await this.rendMSvc.updateEstado(idRendicion, 6);

      this.logger.error(`Error sincronizando rendición ${idRendicion}: ${mensaje}`);
      return {
        success: false,
        mensaje,
        estado:  'ERROR_SYNC',
      };
    }
  }
}