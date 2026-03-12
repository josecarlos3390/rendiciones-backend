import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HanaService } from '../../../database/hana.service';
import { IRendicionesRepository, CreateRendicionData } from './rendiciones.repository.interface';

/**
 * Implementacion HANA del repositorio de rendiciones.
 * Toda la sintaxis especifica de SAP HANA vive aqui.
 */
@Injectable()
export class RendicionesHanaRepository implements IRendicionesRepository {
  private readonly schema: string;

  constructor(
    private readonly hanaService: HanaService,
    private readonly configService: ConfigService,
  ) {
    this.schema = this.configService.get<string>('hana.schema');
  }

  async findAll(): Promise<any[]> {
    return this.hanaService.query(
      `SELECT ID, DESCRIPCION, MONTO, FECHA, ESTADO, USUARIO_ID, OBSERVACIONES, FECHA_CREACION
       FROM "${this.schema}"."RENDICIONES"
       ORDER BY FECHA_CREACION DESC`,
    );
  }

  async findOne(id: number): Promise<any | null> {
    const rows = await this.hanaService.query(
      `SELECT ID, DESCRIPCION, MONTO, FECHA, ESTADO, USUARIO_ID, OBSERVACIONES, FECHA_CREACION
       FROM "${this.schema}"."RENDICIONES"
       WHERE ID = ?`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(data: CreateRendicionData, userId: number): Promise<{ id?: any }> {
    // En HANA se puede usar CURRENT_TIMESTAMP directamente
    await this.hanaService.execute(
      `INSERT INTO "${this.schema}"."RENDICIONES"
         (DESCRIPCION, MONTO, FECHA, OBSERVACIONES, USUARIO_ID, ESTADO, FECHA_CREACION)
       VALUES (?, ?, ?, ?, ?, 'PENDIENTE', CURRENT_TIMESTAMP)`,
      [data.descripcion, data.monto, data.fecha, data.observaciones ?? null, userId],
    );
    // HANA no retorna LAST_INSERT_ID directamente; ajustar si la tabla tiene IDENTITY
    return {};
  }

  async update(id: number, data: Partial<CreateRendicionData>): Promise<{ affected: number }> {
    const setParts: string[] = [];
    const params:   any[]    = [];

    if (data.descripcion  !== undefined) { setParts.push('DESCRIPCION = ?');   params.push(data.descripcion); }
    if (data.monto        !== undefined) { setParts.push('MONTO = ?');          params.push(data.monto); }
    if (data.fecha        !== undefined) { setParts.push('FECHA = ?');          params.push(data.fecha); }
    if (data.observaciones !== undefined) { setParts.push('OBSERVACIONES = ?'); params.push(data.observaciones); }

    if (!setParts.length) return { affected: 0 };

    params.push(id);
    const affected = await this.hanaService.execute(
      `UPDATE "${this.schema}"."RENDICIONES"
       SET ${setParts.join(', ')}
       WHERE ID = ?`,
      params,
    );
    return { affected };
  }

  async remove(id: number): Promise<{ affected: number }> {
    const affected = await this.hanaService.execute(
      `DELETE FROM "${this.schema}"."RENDICIONES" WHERE ID = ?`,
      [id],
    );
    return { affected };
  }
}
