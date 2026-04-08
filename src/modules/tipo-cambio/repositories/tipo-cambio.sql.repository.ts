import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { ITipoCambioRepository } from './tipo-cambio.repository.interface';
import { ITipoCambio, ITipoCambioFilter } from '../interfaces/tipo-cambio.interface';
import { CreateTipoCambioDto, UpdateTipoCambioDto } from '../dto/create-tipo-cambio.dto';

/**
 * Implementación del repositorio de tipos de cambio para SQL Server/PostgreSQL
 * Usado en modo OFFLINE (sin SAP)
 */
@Injectable()
export class TipoCambioSqlRepository implements ITipoCambioRepository {
  private readonly logger = new Logger(TipoCambioSqlRepository.name);
  private readonly tableName = 'REND_TIPO_CAMBIO';

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {}

  async findByFechaMoneda(fecha: string, moneda: string): Promise<number | null> {
    const sql = `
      SELECT U_Tasa 
      FROM ${this.tableName} 
      WHERE U_Fecha = $1 
        AND U_Moneda = $2 
        AND U_Activo = 'Y'
    `;
    
    try {
      const result = await this.db.queryOne<{ u_tasa: number }>(sql, [fecha, moneda.toUpperCase()]);
      return result?.u_tasa ?? null;
    } catch (error) {
      this.logger.error(`Error al buscar tipo de cambio: ${error.message}`);
      return null;
    }
  }

  async findByFechaMonedaCompleto(fecha: string, moneda: string): Promise<ITipoCambio | null> {
    const sql = `
      SELECT U_IdTipoCambio, U_Fecha, U_Moneda, U_Tasa, U_Activo
      FROM ${this.tableName} 
      WHERE U_Fecha = $1 
        AND U_Moneda = $2 
        AND U_Activo = 'Y'
    `;
    
    const result = await this.db.queryOne<any>(sql, [fecha, moneda.toUpperCase()]);
    if (!result) return null;

    // Mapear de snake_case a camelCase
    return {
      U_IdTipoCambio: result.u_idtipocambio,
      U_Fecha: result.u_fecha,
      U_Moneda: result.u_moneda,
      U_Tasa: result.u_tasa,
      U_Activo: result.u_activo,
    };
  }

  async create(data: CreateTipoCambioDto): Promise<ITipoCambio> {
    // Verificar si ya existe
    const exists = await this.exists(data.U_Fecha, data.U_Moneda);
    if (exists) {
      throw new Error(`Ya existe un tipo de cambio para ${data.U_Moneda} en fecha ${data.U_Fecha}`);
    }

    const sql = `
      INSERT INTO ${this.tableName} 
      (U_Fecha, U_Moneda, U_Tasa, U_Activo)
      VALUES ($1, $2, $3, $4)
      RETURNING U_IdTipoCambio, U_Fecha, U_Moneda, U_Tasa, U_Activo
    `;

    const result = await this.db.queryOne<any>(sql, [
      data.U_Fecha,
      data.U_Moneda.toUpperCase(),
      data.U_Tasa,
      data.U_Activo ?? 'Y',
    ]);

    if (!result) {
      throw new Error('No se pudo crear el tipo de cambio');
    }

    return {
      U_IdTipoCambio: result.u_idtipocambio,
      U_Fecha: result.u_fecha,
      U_Moneda: result.u_moneda,
      U_Tasa: result.u_tasa,
      U_Activo: result.u_activo,
    };
  }

  async update(id: number, data: UpdateTipoCambioDto): Promise<ITipoCambio> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.U_Fecha !== undefined) {
      fields.push(`U_Fecha = $${paramIndex++}`);
      values.push(data.U_Fecha);
    }
    if (data.U_Moneda !== undefined) {
      fields.push(`U_Moneda = $${paramIndex++}`);
      values.push(data.U_Moneda.toUpperCase());
    }
    if (data.U_Tasa !== undefined) {
      fields.push(`U_Tasa = $${paramIndex++}`);
      values.push(data.U_Tasa);
    }
    if (data.U_Activo !== undefined) {
      fields.push(`U_Activo = $${paramIndex++}`);
      values.push(data.U_Activo);
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    const sql = `
      UPDATE ${this.tableName} 
      SET ${fields.join(', ')} 
      WHERE U_IdTipoCambio = $${paramIndex}
      RETURNING U_IdTipoCambio, U_Fecha, U_Moneda, U_Tasa, U_Activo
    `;
    values.push(id);

    const result = await this.db.queryOne<any>(sql, values);
    if (!result) {
      throw new Error(`No se encontró el tipo de cambio con id ${id}`);
    }

    return {
      U_IdTipoCambio: result.u_idtipocambio,
      U_Fecha: result.u_fecha,
      U_Moneda: result.u_moneda,
      U_Tasa: result.u_tasa,
      U_Activo: result.u_activo,
    };
  }

  async findAll(filter?: ITipoCambioFilter): Promise<ITipoCambio[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (filter?.fecha) {
      sql += ` AND U_Fecha = $${paramIndex++}`;
      params.push(filter.fecha);
    }
    if (filter?.moneda) {
      sql += ` AND U_Moneda = $${paramIndex++}`;
      params.push(filter.moneda.toUpperCase());
    }
    if (filter?.activo !== undefined) {
      sql += ` AND U_Activo = $${paramIndex++}`;
      params.push(filter.activo);
    }

    sql += ` ORDER BY U_Fecha DESC, U_Moneda`;

    const results = await this.db.query<any>(sql, params);
    return results.map(r => ({
      U_IdTipoCambio: r.u_idtipocambio,
      U_Fecha: r.u_fecha,
      U_Moneda: r.u_moneda,
      U_Tasa: r.u_tasa,
      U_Activo: r.u_activo,
    }));
  }

  async remove(id: number): Promise<void> {
    const sql = `UPDATE ${this.tableName} SET U_Activo = 'N' WHERE U_IdTipoCambio = $1`;
    await this.db.execute(sql, [id]);
  }

  async exists(fecha: string, moneda: string): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE U_Fecha = $1 AND U_Moneda = $2
    `;
    const result = await this.db.queryOne<{ count: number }>(sql, [fecha, moneda.toUpperCase()]);
    return (result?.count ?? 0) > 0;
  }
}
