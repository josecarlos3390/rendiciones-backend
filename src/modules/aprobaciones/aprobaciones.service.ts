import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { EstadoRendicion } from "@common/enums";
import {
  IAprobacionesRepository,
  APROBACIONES_REPOSITORY,
} from "./repositories/aprobaciones.repository.interface";
import { RendMService } from "@modules/rend-m/rend-m.service";

@Injectable()
export class AprobacionesService {
  private readonly logger = new Logger(AprobacionesService.name);

  constructor(
    @Inject(APROBACIONES_REPOSITORY)
    private readonly repo: IAprobacionesRepository,
    private readonly rendMSvc: RendMService,
  ) {}

  /** GET /aprobaciones/pendientes — rendiciones que esperan MI aprobación (nivel 1) */
  async getPendientes(loginAprob: string) {
    return this.repo.findPendientesParaAprobador(loginAprob);
  }

  /** GET /aprobaciones/pendientes-nivel2 — rendiciones de nivel 2 aprobadas por nivel 1 */
  async getPendientesNivel2(loginAprob: string) {
    return this.repo.findPendientesNivel2(loginAprob);
  }

  /** GET /aprobaciones/count — badge contador del sidebar (nivel 1) */
  async countPendientes(loginAprob: string) {
    const count = await this.repo.countPendientes(loginAprob);
    return { count };
  }

  /** GET /aprobaciones/count-nivel2 — badge contador de nivel 2 */
  async countPendientesNivel2(loginAprob: string) {
    const count = await this.repo.countPendientesNivel2(loginAprob);
    return { count };
  }

  /** GET /aprobaciones/:idRendicion — niveles de una rendición */
  async getNiveles(idRendicion: number) {
    return this.repo.findByRendicion(idRendicion);
  }

  /**
   * POST /aprobaciones/:idRendicion/enviar
   * El dueño de la rendición la envía → genera cadena de aprobaciones
   */
  async enviar(idRendicion: number, subId: string, loginUsuario: string) {
    const rend = await this.rendMSvc.findOne(idRendicion);
    if (!rend)
      throw new NotFoundException(`Rendición ${idRendicion} no encontrada`);

    if (String(rend.U_IdUsuario) !== subId) {
      throw new ForbiddenException("Solo el dueño puede enviar esta rendición");
    }
    if (rend.U_Estado !== EstadoRendicion.ABIERTO) {
      throw new BadRequestException(
        "Solo se pueden enviar rendiciones en estado ABIERTO (1)",
      );
    }

    // Resolver cadena de aprobadores desde U_NomSup
    const cadena = await this.repo.resolverCadenaAprobadores(loginUsuario);

    if (!cadena.length) {
      // Sin aprobadores → se aprueba automáticamente
      await this.rendMSvc.updateEstado(idRendicion, EstadoRendicion.APROBADO); // 7=APROBADO
      this.logger.log(
        `Rendición ${idRendicion} auto-aprobada (sin cadena de aprobación)`,
      );
      return {
        message:
          "Rendición aprobada automáticamente — no tiene aprobadores configurados",
        niveles: [],
      };
    }

    // Crear registros de aprobación (transaccional: limpia anteriores e inserta nuevos)
    const niveles = cadena.map((ap, idx) => ({
      U_IdRendicion: idRendicion,
      U_Nivel: idx + 1,
      U_LoginAprob: ap.login,
      U_NomAprob: ap.nombre,
    }));
    await this.repo.recrearNiveles(idRendicion, niveles);

    // Cambiar estado a ENVIADO (4)
    await this.rendMSvc.updateEstado(idRendicion, EstadoRendicion.ENVIADO); // 4=ENVIADO

    this.logger.log(
      `Rendición ${idRendicion} enviada — ${cadena.length} nivel(es) de aprobación`,
    );
    return {
      message: `Rendición enviada — ${cadena.length} nivel(es) de aprobación`,
      niveles,
    };
  }

  /**
   * POST /aprobaciones/:idRendicion/aprobar
   * Un aprobador aprueba su nivel
   */
  async aprobar(idRendicion: number, loginAprob: string, comentario?: string) {
    const rend = await this.rendMSvc.findOne(idRendicion);
    if (!rend)
      throw new NotFoundException(`Rendición ${idRendicion} no encontrada`);
    if (rend.U_Estado !== EstadoRendicion.ENVIADO)
      throw new BadRequestException(
        "La rendición no está en estado ENVIADO (4)",
      );

    // Verificar que sea el turno de este aprobador
    const pendientes = await this.repo.findPendientesParaAprobador(loginAprob);
    const miAprobacion = pendientes.find(
      (p) => p.U_IdRendicion === idRendicion,
    );
    if (!miAprobacion) {
      throw new ForbiddenException(
        "No tenés una aprobación pendiente para esta rendición o no es tu turno",
      );
    }

    const resultado = await this.repo.aprobarNivelConCabecera(
      idRendicion,
      miAprobacion.U_Nivel,
      comentario,
    );
    this.logger.log(
      `Rendición ${idRendicion} — nivel ${miAprobacion.U_Nivel} aprobado por ${loginAprob}`,
    );

    if (resultado.estadoFinal === "APROBADO") {
      this.logger.log(`Rendición ${idRendicion} — APROBADA COMPLETAMENTE`);
      return {
        message: "Rendición aprobada completamente",
        estadoFinal: "APROBADO",
      };
    }

    return {
      message: `Nivel ${miAprobacion.U_Nivel} aprobado — esperando niveles superiores`,
      estadoFinal: "ENVIADO",
    };
  }

  /**
   * POST /aprobaciones/:idRendicion/rechazar
   * Un aprobador rechaza → vuelve a ABIERTO
   */
  async rechazar(idRendicion: number, loginAprob: string, comentario?: string) {
    const rend = await this.rendMSvc.findOne(idRendicion);
    if (!rend)
      throw new NotFoundException(`Rendición ${idRendicion} no encontrada`);
    if (rend.U_Estado !== EstadoRendicion.ENVIADO)
      throw new BadRequestException(
        "La rendición no está en estado ENVIADO (4)",
      );

    const pendientes = await this.repo.findPendientesParaAprobador(loginAprob);
    const miAprobacion = pendientes.find(
      (p) => p.U_IdRendicion === idRendicion,
    );
    if (!miAprobacion) {
      throw new ForbiddenException(
        "No tenés una aprobación pendiente para esta rendición",
      );
    }

    // Rechazar nivel y volver cabecera a ABIERTO en una sola transacción
    await this.repo.rechazarNivelConCabecera(
      idRendicion,
      miAprobacion.U_Nivel,
      comentario,
    );

    this.logger.log(
      `Rendición ${idRendicion} RECHAZADA por ${loginAprob} — vuelve a ABIERTO`,
    );
    return {
      message:
        "Rendición rechazada — vuelve al estado ABIERTO para correcciones",
      estadoFinal: "ABIERTO",
    };
  }
}
