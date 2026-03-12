import { Injectable } from '@nestjs/common';
import { IRendicionesRepository, CreateRendicionData } from './rendiciones.repository.interface';

/**
 * Implementacion SQL Server del repositorio de rendiciones.
 * TODO: Inyectar SqlService cuando se habilite DB_TYPE=SQL
 * La sintaxis SQL Server va aqui — el Service y Controller NO cambian.
 */
@Injectable()
export class RendicionesSqlRepository implements IRendicionesRepository {

  // constructor(private readonly sqlService: SqlService) {}

  async findAll(): Promise<any[]> {
    // return this.sqlService.query('SELECT * FROM dbo.Rendiciones ORDER BY FechaCreacion DESC');
    throw new Error('SQL Repository no implementado aun. Configura DB_TYPE=HANA');
  }

  async findOne(id: number): Promise<any | null> {
    // return this.sqlService.query('SELECT * FROM dbo.Rendiciones WHERE Id = @id', [id]);
    throw new Error('SQL Repository no implementado aun.');
  }

  async create(data: CreateRendicionData, userId: number): Promise<{ id?: any }> {
    throw new Error('SQL Repository no implementado aun.');
  }

  async update(id: number, data: Partial<CreateRendicionData>): Promise<{ affected: number }> {
    throw new Error('SQL Repository no implementado aun.');
  }

  async remove(id: number): Promise<{ affected: number }> {
    throw new Error('SQL Repository no implementado aun.');
  }
}
