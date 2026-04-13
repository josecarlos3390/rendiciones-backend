import {
  Injectable, Inject, NotFoundException,
  BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { ConfigService }            from '@nestjs/config';
import { IIntegracionRepository, INTEGRACION_REPOSITORY } from './repositories/integracion.repository.interface';
import { RendMService }          from '../rend-m/rend-m.service';
import { RendDService }          from '../rend-d/rend-d.service';
import { SapSlService }          from './sap-sl.service';
import { SyncRendicionDto }      from './dto/sync-rendicion.dto';
import { PrctjHanaRepository }   from '../prctj/repositories/prctj.hana.repository';
import { RendPrctj }             from '../prctj/interfaces/prctj.interface';
import { IRendCmpRepository, REND_CMP_REPOSITORY, SapFieldMapping } from '../rend-cmp/repositories/rend-cmp.repository.interface';

@Injectable()
export class IntegracionService {
  private readonly logger = new Logger(IntegracionService.name);

  private get isOffline(): boolean {
    return this.config.get<string>('app.mode', 'ONLINE').toUpperCase() === 'OFFLINE';
  }

  constructor(
    @Inject(INTEGRACION_REPOSITORY)
    private readonly repo:     IIntegracionRepository,
    private readonly rendMSvc: RendMService,
    private readonly rendDSvc: RendDService,
    private readonly sapSl:    SapSlService,
    private readonly prctjRepo: PrctjHanaRepository,
    private readonly config:   ConfigService,
    @Inject(REND_CMP_REPOSITORY)
    private readonly rendCmpRepo: IRendCmpRepository,
  ) {}

  async getPendientes(
    loginAprob: string,
    isAdmin: boolean,
    sinAprobador: boolean,
  ) {
    if (isAdmin || sinAprobador) {
      const cascada = sinAprobador; // true = toda la jerarquía en cascada
      return this.repo.findPendientesByAprobador(loginAprob, cascada);
    }
    return [];
  }

  async getMisRendiciones(idUsuario: string) {
    return this.repo.findMisRendiciones(idUsuario);
  }

  async countPendientes(
    loginAprob: string,
    isAdmin: boolean,
    sinAprobador: boolean,
  ): Promise<{ count: number }> {
    if (isAdmin || sinAprobador) {
      const cascada = sinAprobador;
      const count = await this.repo.countPendientesByAprobador(loginAprob, cascada);
      return { count };
    }
    return { count: 0 };
  }

  async getHistorial(idRendicion: number) {
    return this.repo.findByRendicion(idRendicion);
  }

  async sincronizar(
    idRendicion:  number,
    loginAdmin:   string,   // req.user.username — para log/auditoría en REND_SYNC
    idUsuarioSub: string,   // req.user.sub (como string) — para comparar con U_IdUsuario de REND_M
    role:         string,   // 'ADMIN' | 'USER'
    dto:          SyncRendicionDto,
    genDocPre:    boolean,  // puede generar preliminar directamente
    sinAprobador: boolean,  // no tiene aprobador configurado
  ) {
    // ── 1. Obtener cabecera ───────────────────────────────────────────────
    const rend = await this.rendMSvc.findOne(idRendicion);
    if (!rend) throw new NotFoundException(`Rendición ${idRendicion} no encontrada`);

    // ── 2. Validar acceso — U_IdUsuario guarda String(sub), no el username ─
    // ADMIN puede sincronizar cualquier rendición.
    // USER solo puede sincronizar las propias.
    if (role !== 'ADMIN' && rend.U_IdUsuario !== idUsuarioSub) {
      throw new ForbiddenException(
        `No tienes permiso para sincronizar la rendición ${idRendicion}`,
      );
    }

    // ── 3. Validar estado ─────────────────────────────────────────────────
    // Estados permitidos:
    // - 1 (ABIERTO): solo si tiene genDocPre y sinAprobador
    // - 7 (APROBADO): cualquier usuario con acceso
    // - 6 (ERROR_SYNC): cualquier usuario con acceso
    const puedeSincronizarDirecto = genDocPre && sinAprobador;
    const estadosPermitidos = puedeSincronizarDirecto ? [1, 7, 6] : [7, 6];
    
    if (!estadosPermitidos.includes(rend.U_Estado)) {
      const mensaje = puedeSincronizarDirecto
        ? 'Solo se pueden sincronizar rendiciones en estado ABIERTO, APROBADO o ERROR_SYNC'
        : 'Solo se pueden sincronizar rendiciones en estado APROBADO (7) o ERROR_SYNC (6)';
      throw new BadRequestException(mensaje);
    }

    // ── 4. Obtener detalle filtrando por idRendicion + idUsuario del propietario ─
    // Pasamos rend.U_IdUsuario (el sub del propietario) para que el repo filtre
    // correctamente, incluso cuando quien ejecuta es un ADMIN diferente.
    const detalles = await this.rendDSvc.findByRendicion(idRendicion, role, rend.U_IdUsuario);

    this.logger.log(`Sincronización ${idRendicion}: ${detalles.length} detalles obtenidos`);
    if (detalles.length > 0) {
      this.logger.debug(`Primer detalle: U_RD_IdRD=${detalles[0].U_RD_IdRD}, U_RD_Cuenta=${detalles[0].U_RD_Cuenta}, U_RD_Importe=${detalles[0].U_RD_Importe}`);
    }

    if (!detalles || detalles.length === 0) {
      throw new BadRequestException(
        `La rendición ${idRendicion} no tiene documentos de detalle para sincronizar`,
      );
    }

    // ── 5. Validar que cada impuesto con monto > 0 tenga cuenta asignada ──
    const erroresCuentas: string[] = [];

    detalles.forEach((d, idx) => {
      const nro   = d.U_RD_NumDocumento || `línea ${idx + 1}`;
      const tipo  = d.U_RD_TipoDoc      || '';
      const label = `Doc. ${nro}${tipo ? ` (${tipo})` : ''}`;

      if ((d.U_MontoIVA   ?? 0) > 0 && !d.U_CuentaIVA?.trim())
        erroresCuentas.push(`${label}: IVA ${d.U_MontoIVA} sin cuenta contable`);

      if ((d.U_MontoIT    ?? 0) > 0 && !d.U_CuentaIT?.trim())
        erroresCuentas.push(`${label}: IT ${d.U_MontoIT} sin cuenta contable`);

      if ((d.U_MontoIUE   ?? 0) > 0 && !d.U_CuentaIUE?.trim())
        erroresCuentas.push(`${label}: IUE ${d.U_MontoIUE} sin cuenta contable`);

      if ((d.U_MontoRCIVA ?? 0) > 0 && !d.U_CuentaRCIVA?.trim())
        erroresCuentas.push(`${label}: RC-IVA ${d.U_MontoRCIVA} sin cuenta contable`);
    });

    if (erroresCuentas.length > 0) {
      throw new BadRequestException(
        `No se puede sincronizar: los siguientes impuestos no tienen cuenta contable asignada:\n` +
        erroresCuentas.map(e => `  • ${e}`).join('\n') +
        `\n\nVerificá la configuración en Administración → Documentos del perfil correspondiente.`,
      );
    }

    // ── 6. Calcular número de intento ─────────────────────────────────────
    const historial = await this.repo.findByRendicion(idRendicion);
    const intento   = historial.length + 1;

    this.logger.log(
      `Sincronizando rendición ${idRendicion} (propietario: ${rend.U_IdUsuario}) ` +
      `— ejecutado por: ${loginAdmin} (${role}) — intento ${intento}`,
    );

    // ── 7. Login en SAP Service Layer (solo en modo ONLINE) ──────────────
    // En modo OFFLINE no hay SAP disponible — se registra el asiento localmente
    // con un número de documento simulado y se marca como SINCRONIZADO.
    if (this.isOffline) {
      const distribucionesMap = new Map<number, RendPrctj[]>();
      const idUsuarioNum = Number(rend.U_IdUsuario);
      for (const d of detalles) {
        const dist = await this.prctjRepo.findByLinea(idRendicion, d.U_RD_IdRD, idUsuarioNum);
        if (dist.length > 0) distribucionesMap.set(d.U_RD_IdRD, dist);
      }

      // Generar número de documento simulado para modo offline
      const nroDocERP = `OFFLINE-${idRendicion}-${Date.now()}`;

      await this.repo.create({
        idRendicion,
        estado:    'OK',
        nroDocERP,
        loginAdmin,
        mensaje:   `[OFFLINE] Asiento registrado localmente — sin conexión SAP`,
        intento,
      });

      await this.rendMSvc.updatePreliminar(idRendicion, nroDocERP);
      await this.rendMSvc.updateEstado(idRendicion, 5);

      this.logger.log(`[OFFLINE] Rendición ${idRendicion} marcada como sincronizada`);
      return {
        success:   true,
        nroDocERP,
        mensaje:   `Rendición registrada en modo OFFLINE (Doc. ${nroDocERP})`,
        estado:    'SINCRONIZADO',
      };
    }

    // Validar credenciales SAP
    if (!dto.sapUser?.trim() || !dto.sapPassword?.trim()) {
      throw new BadRequestException('Credenciales SAP requeridas (sapUser y sapPassword)');
    }

    let session: Awaited<ReturnType<SapSlService['login']>> | null = null;

    try {
      session = await this.sapSl.login(dto.sapUser, dto.sapPassword);

      // ── 8. Cargar distribuciones PRCTJ para cada línea ────────────────
      const distribucionesMap = new Map<number, RendPrctj[]>();
      const idUsuarioNum = Number(rend.U_IdUsuario);
      for (const d of detalles) {
        const dist = await this.prctjRepo.findByLinea(idRendicion, d.U_RD_IdRD, idUsuarioNum);
        if (dist.length > 0) {
          distribucionesMap.set(d.U_RD_IdRD, dist);
        }
      }

      // ── 9. Obtener tipo de cambio si BolivianosEs=SISTEMA ─────────────
      let tasaCambio: number | undefined;
      const bolivianosEs = this.config.get<string>('app.bolivianosEs', 'LOCAL').toUpperCase();
      
      if (bolivianosEs === 'SISTEMA') {
        const fechaCabecera = rend.U_FechaFinal?.substring(0, 10)
                           ?? new Date().toISOString().substring(0, 10);
        
        this.logger.log(`Obteniendo tipo de cambio USD para fecha ${fechaCabecera}`);
        tasaCambio = await this.sapSl.obtenerTasaCambio(session, 'USD', fechaCabecera);
        this.logger.log(`Tasa de cambio aplicada: ${tasaCambio}`);
      }

      // ── 10. Obtener mapeo de campos UDF desde REND_CMP ─────────────────
      let fieldMapping: SapFieldMapping;
      try {
        fieldMapping = await this.rendCmpRepo.getFieldMapping();
        this.logger.debug(`Mapeo de campos SAP cargado: ${JSON.stringify(fieldMapping)}`);
      } catch (err: any) {
        this.logger.warn(`Error cargando mapeo de campos desde REND_CMP: ${err.message}. Usando valores por defecto.`);
        // Valores por defecto si no se puede cargar (usando U_IdCampo como clave)
        fieldMapping = {
          1:  'U_TIPODOC',   // Tipo de Documento
          2:  'U_CODFORPI',  // Codi Formulario Poliza
          3:  'U_FECHAFAC',  // Fecha Factura
          4:  'U_NROTRAM',   // Numero Tramite
          5:  'U_NUMPOL',    // Numero Poliza
          6:  'U_NIT',       // NIT
          7:  'U_CARDNAME',  // Razon Social
          8:  'U_IMPORTE',   // Importe
          9:  'U_CODALFA',   // Codi de Control
          10: 'U_ICE',       // Ice
          11: 'U_EXENTO',    // Exento
          12: 'U_NumAuto',   // Numero de Autorizacion
          13: 'U_BOLBSP',    // Boleto BSP
          14: 'U_NumDoc',    // Numero de Factura
          15: 'U_DESCTOBR',  // Descuento BR
          16: 'U_TASACERO',  // Tasa Cero
          17: 'U_TASAS',     // Tasa
          18: 'U_B_cuf',     // Codigo unico factura
          19: 'U_GIFTCARD',  // gift card
          20: 'U_RCIVA',     // RCIVA
        };
      }

      // ── 11. Construir payload del JournalVoucher ───────────────────────
      const payload = this.sapSl.buildJournalPayload(rend, detalles, distribucionesMap, tasaCambio, fieldMapping);

      // ── 10. Enviar a SAP Service Layer ────────────────────────────────
      const nroDocERP = await this.sapSl.crearAsientoPreliminar(session, payload);

      // ── 10. Registrar éxito en REND_SYNC ───────────────────────────────
      await this.repo.create({
        idRendicion,
        estado:    'OK',
        nroDocERP,
        loginAdmin,
        mensaje:   `Asiento creado en SAP por usuario SAP: ${dto.sapUser} / app: ${loginAdmin}`,
        intento,
      });

      // ── 11. Guardar número de documento preliminar en REND_M.U_Preliminar ─
      await this.rendMSvc.updatePreliminar(idRendicion, nroDocERP);

      // ── 12. Cambiar estado a SINCRONIZADO (5) ─────────────────────────
      await this.rendMSvc.updateEstado(idRendicion, 5);

      this.logger.log(`Rendición ${idRendicion} sincronizada — Doc. SAP: ${nroDocERP}`);
      return {
        success:   true,
        nroDocERP,
        mensaje:   `Asiento preliminar creado correctamente en SAP (Doc. ${nroDocERP})`,
        estado:    'SINCRONIZADO',
      };

    } catch (err: any) {
      const mensaje = err?.message ?? 'Error desconocido al sincronizar con SAP';

      await this.repo.create({
        idRendicion,
        estado:    'ERROR',
        loginAdmin,
        mensaje,
        intento,
      });

      await this.rendMSvc.updateEstado(idRendicion, 6);

      this.logger.error(`Error sincronizando rendición ${idRendicion}: ${mensaje}`);
      return {
        success: false,
        mensaje,
        estado:  'ERROR_SYNC',
      };

    } finally {
      // ── 11. Siempre cerrar sesión SAP (éxito o error) ─────────────────
      if (session) {
        await this.sapSl.logout(session);
      }
    }
  }
}