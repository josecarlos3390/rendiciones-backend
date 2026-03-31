import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TipoDocSapRepository, CreateTipoDocSapDto, UpdateTipoDocSapDto, TipoDocSap } from './repositories/tipo-doc-sap.hana.repository';

/**
 * Valores hardcodeados de los tipos de documento SAP B1.
 * Se usan en modo ONLINE (HANA) donde la tabla REND_TIPO_DOC_SAP no existe.
 * En modo OFFLINE (Postgres) se usa la tabla REND_TIPO_DOC_SAP configurable.
 */
const TIPOS_DOC_SAP_HANA: TipoDocSap[] = [
  { U_IdTipo: 1,  U_Nombre: 'COMPRA',                    U_EsTipoF: 'F', U_PermiteGU: 'Y', U_PermiteGD: 'Y', U_Orden: 1,  U_Activo: 'Y' },
  { U_IdTipo: 2,  U_Nombre: 'Boleto BSP',                U_EsTipoF: 'F', U_PermiteGU: 'N', U_PermiteGD: 'N', U_Orden: 2,  U_Activo: 'Y' },
  { U_IdTipo: 3,  U_Nombre: 'Importación',               U_EsTipoF: 'F', U_PermiteGU: 'N', U_PermiteGD: 'N', U_Orden: 3,  U_Activo: 'Y' },
  { U_IdTipo: 4,  U_Nombre: 'Recibo de alquiler',        U_EsTipoF: 'R', U_PermiteGU: 'Y', U_PermiteGD: 'Y', U_Orden: 4,  U_Activo: 'Y' },
  { U_IdTipo: 5,  U_Nombre: 'Nota de débito proveedor',  U_EsTipoF: 'F', U_PermiteGU: 'N', U_PermiteGD: 'N', U_Orden: 5,  U_Activo: 'Y' },
  { U_IdTipo: 6,  U_Nombre: 'Nota de crédito cliente',   U_EsTipoF: 'F', U_PermiteGU: 'N', U_PermiteGD: 'N', U_Orden: 6,  U_Activo: 'Y' },
  { U_IdTipo: 7,  U_Nombre: 'VENTA',                     U_EsTipoF: 'F', U_PermiteGU: 'N', U_PermiteGD: 'N', U_Orden: 7,  U_Activo: 'Y' },
  { U_IdTipo: 8,  U_Nombre: 'Nota de débito cliente',    U_EsTipoF: 'F', U_PermiteGU: 'N', U_PermiteGD: 'N', U_Orden: 8,  U_Activo: 'Y' },
  { U_IdTipo: 9,  U_Nombre: 'Nota de crédito proveedor', U_EsTipoF: 'F', U_PermiteGU: 'N', U_PermiteGD: 'N', U_Orden: 9,  U_Activo: 'Y' },
  { U_IdTipo: 10, U_Nombre: 'SIN ASIGNAR',               U_EsTipoF: 'R', U_PermiteGU: 'Y', U_PermiteGD: 'Y', U_Orden: 10, U_Activo: 'Y' },
];

@Injectable()
export class TipoDocSapService {
  constructor(
    private readonly repo:   TipoDocSapRepository,
    private readonly config: ConfigService,
  ) {}

  private get isHana(): boolean {
    return (this.config.get<string>('app.dbType') ?? 'HANA').toUpperCase() === 'HANA';
  }

  findAll(): Promise<TipoDocSap[]> | TipoDocSap[] {
    if (this.isHana) return TIPOS_DOC_SAP_HANA;
    return this.repo.findAll();
  }

  findActivos(): Promise<TipoDocSap[]> | TipoDocSap[] {
    if (this.isHana) return TIPOS_DOC_SAP_HANA.filter(t => t.U_Activo === 'Y');
    return this.repo.findActivos();
  }

  async findOne(idTipo: number): Promise<TipoDocSap> {
    if (this.isHana) {
      const item = TIPOS_DOC_SAP_HANA.find(t => t.U_IdTipo === idTipo);
      if (!item) throw new NotFoundException(`Tipo de documento ${idTipo} no encontrado`);
      return item;
    }
    const item = await this.repo.findOne(idTipo);
    if (!item) throw new NotFoundException(`Tipo de documento ${idTipo} no encontrado`);
    return item;
  }

  async create(dto: CreateTipoDocSapDto): Promise<TipoDocSap> {
    if (this.isHana) throw new ConflictException(
      'Los tipos de documento SAP son fijos en modo ONLINE (HANA). Usa modo OFFLINE para configurarlos.',
    );
    const exists = await this.repo.exists(dto.idTipo);
    if (exists) throw new ConflictException(`El código SAP ${dto.idTipo} ya existe`);
    return this.repo.create(dto);
  }

  async update(idTipo: number, dto: UpdateTipoDocSapDto): Promise<TipoDocSap> {
    if (this.isHana) throw new ConflictException(
      'Los tipos de documento SAP son fijos en modo ONLINE (HANA).',
    );
    const exists = await this.repo.exists(idTipo);
    if (!exists) throw new NotFoundException(`Tipo de documento ${idTipo} no encontrado`);
    await this.repo.update(idTipo, dto);
    return this.repo.findOne(idTipo);
  }

  async remove(idTipo: number): Promise<{ affected: number }> {
    if (this.isHana) throw new ConflictException(
      'Los tipos de documento SAP son fijos en modo ONLINE (HANA).',
    );
    const exists = await this.repo.exists(idTipo);
    if (!exists) throw new NotFoundException(`Tipo de documento ${idTipo} no encontrado`);
    return this.repo.remove(idTipo);
  }
}