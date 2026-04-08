import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { ITipoCambioRepository } from './tipo-cambio.repository.interface';
import { ITipoCambio, ITipoCambioFilter } from '../interfaces/tipo-cambio.interface';
import { CreateTipoCambioDto, UpdateTipoCambioDto } from '../dto/create-tipo-cambio.dto';

/**
 * Implementación del repositorio de tipos de cambio para SAP HANA
 * Usado en modo ONLINE (con SAP)
 */
@Injectable()
export class TipoCambioHanaRepository implements ITipoCambioRepository {
  private readonly logger = new Logger(TipoCambioHanaRepository.name);
  private readonly tableName = '"REND_TIPO_CAMBIO"';

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {}

  async findByFechaMoneda(fecha: string, moneda: string): Promise<number | null> {
    const sql = `
      SELECT "U_Tasa" 
      FROM ${this.tableName} 
      WHERE "U_Fecha" = ? 
        AND "U_Moneda" = ? 
        AND "U_Activo" = 'Y'
    `;
    
    try {
      const result = await this.db.queryOne<{ U_Tasa: number }>(sql, [fecha, moneda.toUpperCase()]);
      return result?.U_Tasa ?? null;
    } catch (error) {
      this.logger.error(`Error al buscar tipo de cambio: ${error.message}`);
      return null;
    }
  }

  async findByFechaMonedaCompleto(fecha: string, moneda: string): Promise<ITipoCambio | null> {
    const sql = `
      SELECT * 
      FROM ${this.tableName} 
      WHERE "U_Fecha" = ? 
        AND "U_Moneda" = ? 
        AND "U_Activo" = 'Y'
    `;
    
    return this.db.queryOne<ITipoCambio>(sql, [fecha, moneda.toUpperCase()]);
  }

  async create(data: CreateTipoCambioDto): Promise<ITipoCambio> {
    // Verificar si ya existe
    const exists = await this.exists(data.U_Fecha, data.U_Moneda);
    if (exists) {
      throw new Error(`Ya existe un tipo de cambio para ${data.U_Moneda} en fecha ${data.U_Fecha}`);
    }

    const sql = `
      INSERT INTO ${this.tableName} 
      ("U_Fecha", "U_Moneda", "U_Tasa", "U_Activo")
      VALUES (?, ?, ?, ?)
    `;

    await this.db.execute(sql, [
      data.U_Fecha,
      data.U_Moneda.toUpperCase(),
      data.U_Tasa,
      data.U_Activo ?? 'Y',
    ]);

    // Retornar el registro creado
    const created = await this.findByFechaMonedaCompleto(data.U_Fecha, data.U_Moneda);
    if (!created) {
      throw new Error('No se pudo crear el tipo de cambio');
    }
    return created;
  }

  async update(id: number, data: UpdateTipoCambioDto): Promise<ITipoCambio> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.U_Fecha !== undefined) {
      fields.push('"U_Fecha" = ?');
      values.push(data.U_Fecha);
    }
    if (data.U_Moneda !== undefined) {
      fields.push('"U_Moneda" = ?');
      values.push(data.U_Moneda.toUpperCase());
    }
    if (data.U_Tasa !== undefined) {
      fields.push('"U_Tasa" = ?');
      values.push(data.U_Tasa);
    }
    if (data.U_Activo !== undefined) {
      fields.push('"U_Activo" = ?');
      values.push(data.U_Activo);
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    const sql = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE "U_IdTipoCambio" = ?`;
    values.push(id);

    await this.db.execute(sql, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`No se encontró el tipo de cambio con id ${id}`);
    }
    return updated;
  }

  async findAll(filter?: ITipoCambioFilter): Promise<ITipoCambio[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params: any[] = [];

    if (filter?.fecha) {
      sql += ` AND "U_Fecha" = ?`;
      params.push(filter.fecha);
    }
    if (filter?.moneda) {
      sql += ` AND "U_Moneda" = ?`;
      params.push(filter.moneda.toUpperCase());
    }
    if (filter?.activo !== undefined) {
      sql += ` AND "U_Activo" = ?`;
      params.push(filter.activo);
    }

    sql += ` ORDER BY "U_Fecha" DESC, "U_Moneda"`;

    return this.db.query<ITipoCambio>(sql, params);
  }

  async remove(id: number): Promise<void> {
    const sql = `UPDATE ${this.tableName} SET "U_Activo" = 'N' WHERE "U_IdTipoCambio" = ?`;
    await this.db.execute(sql, [id]);
  }

  async exists(fecha: string, moneda: string): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE "U_Fecha" = ? AND "U_Moneda" = ?
    `;
    const result = await this.db.queryOne<{ count: number }>(sql, [fecha, moneda.toUpperCase()]);
    return (result?.count ?? 0) > 0;
  }

  private async findById(id: number): Promise<ITipoCambio | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE "U_IdTipoCambio" = ?`;
    return this.db.queryOne<ITipoCambio>(sql, [id]);
  }
}
