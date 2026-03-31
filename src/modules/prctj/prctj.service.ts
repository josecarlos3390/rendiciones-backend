import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrctjHanaRepository } from './repositories/prctj.hana.repository';
import { RendDService }        from '../rend-d/rend-d.service';
import { RendMService }        from '../rend-m/rend-m.service';
import { SavePrctjDto }        from './dto/prctj.dto';

@Injectable()
export class PrctjService {
  private readonly logger = new Logger(PrctjService.name);

  constructor(
    private readonly repo:      PrctjHanaRepository,
    private readonly rendDSvc:  RendDService,
    private readonly rendMSvc:  RendMService,
  ) {}

  /** GET — distribuciones de una línea */
  async findByLinea(
    idRendicion:   number,
    idRD:          number,
    role:          string,
    idUsuario:     string,
    loginUsername: string,
    esAprobador:   boolean,
    sinAprobador:  boolean,
  ) {
    // Reusar la misma validación de acceso que rend-d
    await this.rendDSvc.findByRendicion(idRendicion, role, idUsuario, loginUsername, esAprobador, sinAprobador);
    return this.repo.findByLinea(idRendicion, idRD);
  }

  /**
   * SAVE — reemplaza todas las distribuciones de una línea.
   * Valida:
   *  - La rendición existe y el usuario tiene acceso de escritura
   *  - La línea REND_D existe dentro de esa rendición
   *  - Los porcentajes suman exactamente 100
   *  - No hay líneas con porcentaje 0
   */
  async save(
    idRendicion:   number,
    idRD:          number,
    dto:           SavePrctjDto,
    role:          string,
    idUsuario:     string,
    idUsuarioNum:  number,
    loginUsername: string,
    esAprobador:   boolean,
  ) {
    // Validar acceso a la rendición
    const cabecera = await this.rendMSvc.findOne(idRendicion);
    if (!cabecera) throw new NotFoundException(`Rendición ${idRendicion} no encontrada`);

    if (role !== 'ADMIN') {
      const esPropietario = cabecera.U_IdUsuario === idUsuario;
      const puedeEditar   = esPropietario
        ? cabecera.U_Estado === 1
        : esAprobador && cabecera.U_Estado === 4;

      if (!esPropietario && !esAprobador) {
        throw new ForbiddenException('No tenés acceso a esta rendición');
      }
      if (!puedeEditar) {
        throw new ForbiddenException(
          esPropietario
            ? 'Solo se puede modificar la distribución en estado ABIERTO'
            : 'El aprobador solo puede modificar en estado ENVIADO',
        );
      }

      // Aprobador: verificar que sea subordinado suyo
      if (!esPropietario && esAprobador) {
        const esSub = await this.rendMSvc.isSubordinado(cabecera.U_IdUsuario, loginUsername);
        if (!esSub) throw new ForbiddenException('No tenés permiso sobre esta rendición');
      }
    }

    // Validar que la línea REND_D existe
    const detalles = await this.rendDSvc.findByRendicion(
      idRendicion, role, idUsuario, loginUsername, esAprobador, false,
    );
    const lineaRD = detalles.find((d: any) => d.U_RD_IdRD === idRD);
    if (!lineaRD) throw new NotFoundException(`Línea REND_D ${idRD} no encontrada en rendición ${idRendicion}`);

    // Validar porcentajes
    const totalPct = dto.lineas.reduce((sum, l) => sum + l.porcentaje, 0);
    const diff     = Math.abs(totalPct - 100);
    if (diff > 0.01) {
      throw new BadRequestException(
        `Los porcentajes deben sumar 100%. Suma actual: ${totalPct.toFixed(2)}%`,
      );
    }

    if (dto.lineas.some(l => l.porcentaje <= 0)) {
      throw new BadRequestException('Ninguna línea puede tener porcentaje 0 o negativo');
    }

    if (dto.lineas.some(l => !l.cuenta?.trim())) {
      throw new BadRequestException('Todas las líneas deben tener una cuenta contable');
    }

    // Importe base para PRCT_MONTO:
    // Siempre U_RD_Importe — el importe que ingresó el usuario.
    // El cálculo de retenciones e impuestos sigue aplicándose sobre el total, sin cambios.
    const importe = (lineaRD as any).U_RD_Importe ?? 0;

    // Reemplazar
    await this.repo.deleteByLinea(idRendicion, idRD);
    await this.repo.insertLineas(idRendicion, idRD, idUsuarioNum, importe, dto.lineas);

    this.logger.log(`PRCTJ guardado: Rend=${idRendicion} RD=${idRD} ${dto.lineas.length} líneas`);
    return this.repo.findByLinea(idRendicion, idRD);
  }

  /** DELETE — elimina toda la distribución de una línea */
  async delete(
    idRendicion:  number,
    idRD:         number,
    role:         string,
    idUsuario:    string,
  ) {
    const cabecera = await this.rendMSvc.findOne(idRendicion);
    if (!cabecera) throw new NotFoundException(`Rendición ${idRendicion} no encontrada`);

    if (role !== 'ADMIN') {
      if (cabecera.U_IdUsuario !== idUsuario) {
        throw new ForbiddenException('No tenés acceso a esta rendición');
      }
      if (cabecera.U_Estado !== 1) {
        throw new ForbiddenException('Solo se puede eliminar la distribución en estado ABIERTO');
      }
    }

    await this.repo.deleteByLinea(idRendicion, idRD);
    return { deleted: true };
  }
}