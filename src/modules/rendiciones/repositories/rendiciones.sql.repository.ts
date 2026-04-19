import { Injectable } from "@nestjs/common";
import {
  IRendicionesRepository,
  CreateRendicionData,
} from "./rendiciones.repository.interface";

/**
 * Implementacion SQL Server del repositorio de rendiciones.
 * TODO: Inyectar SqlService cuando se habilite DB_TYPE=SQL
 * La sintaxis SQL Server va aqui — el Service y Controller NO cambian.
 */
@Injectable()
export class RendicionesSqlRepository implements IRendicionesRepository {
  async findAll(): Promise<any[]> {
    throw new Error(
      "SQL Repository no implementado aun. Configura DB_TYPE=HANA",
    );
  }

  async findOne(_id: number): Promise<any | null> {
    throw new Error("SQL Repository no implementado aun.");
  }

  async create(_data: CreateRendicionData, _userId: number): Promise<any> {
    throw new Error("SQL Repository no implementado aun.");
  }

  async update(
    _id: number,
    _data: Partial<CreateRendicionData>,
  ): Promise<{ affected: number }> {
    throw new Error("SQL Repository no implementado aun.");
  }

  async remove(_id: number): Promise<{ affected: number }> {
    throw new Error("SQL Repository no implementado aun.");
  }
}
