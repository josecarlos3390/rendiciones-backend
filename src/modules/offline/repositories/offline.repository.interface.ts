import {
  CreateCuentaCOADto,
  UpdateCuentaCOADto,
  CreateDimensionDto,
  UpdateDimensionDto,
  CreateNormaDto,
  UpdateNormaDto,
} from "../dto/offline.dto";

export interface IOfflineRepository {
  // ── REND_COA ──
  findAllCuentas(): Promise<any[]>;
  findCuentaByCode(code: string): Promise<any | null>;
  createCuenta(dto: CreateCuentaCOADto): Promise<void>;
  updateCuenta(code: string, dto: UpdateCuentaCOADto): Promise<number>;
  deleteCuenta(code: string): Promise<number>;

  // ── REND_DIMENSIONES ──
  findAllDimensiones(): Promise<any[]>;
  findDimensionByCode(code: number): Promise<any | null>;
  createDimension(dto: CreateDimensionDto): Promise<void>;
  updateDimension(code: number, dto: UpdateDimensionDto): Promise<number>;
  deleteDimension(code: number): Promise<number>;

  // ── REND_NORMAS ──
  findAllNormas(): Promise<any[]>;
  findNormaByCode(code: string): Promise<any | null>;
  createNorma(dto: CreateNormaDto): Promise<void>;
  updateNorma(code: string, dto: UpdateNormaDto): Promise<number>;
  deleteNorma(code: string): Promise<number>;
}

export const OFFLINE_REPOSITORY = "OFFLINE_REPOSITORY";
