// ============================================================================
// src/modules/offline/offline.controller.ts
// Endpoints CRUD para los datos de modo OFFLINE:
//   /api/v1/offline/cuentas       → REND_COA
//   /api/v1/offline/dimensiones   → REND_DIMENSIONES
//   /api/v1/offline/normas        → REND_NORMAS
// ============================================================================
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, HttpCode, HttpStatus,
  NotFoundException, ConflictException,
  Inject,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, MaxLength, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../../auth/decorators/roles.decorator';
import { IDatabaseService, DATABASE_SERVICE } from '../../database/interfaces/database.interface';
import { ConfigService } from '@nestjs/config';
import { tbl } from '../../database/db-table.helper';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export class CreateCuentaCOADto {
  @IsString() @IsNotEmpty() @MaxLength(50)  COA_CODE:        string;
  @IsString() @IsNotEmpty() @MaxLength(250) COA_NAME:        string;
  @IsOptional() @IsString() @MaxLength(50)  COA_FORMAT_CODE?: string;
  @IsOptional() @IsIn(['Y','N'])            COA_ASOCIADA?:   string;
  @IsOptional() @IsIn(['Y','N'])            COA_ACTIVA?:     string;
}

export class UpdateCuentaCOADto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(250) COA_NAME?:        string;
  @IsOptional() @IsString() @MaxLength(50)                COA_FORMAT_CODE?: string;
  @IsOptional() @IsIn(['Y','N'])                          COA_ASOCIADA?:    string;
  @IsOptional() @IsIn(['Y','N'])                          COA_ACTIVA?:      string;
}

export class CreateDimensionDto {
  @Type(() => Number) @IsInt()              DIM_CODE:        number;
  @IsString() @IsNotEmpty() @MaxLength(100) DIM_NAME:        string;
  @IsOptional() @IsString() @MaxLength(250) DIM_DESCRIPCION?: string;
  @IsOptional() @IsIn(['Y','N'])            DIM_ACTIVA?:     string;
}

export class UpdateDimensionDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) DIM_NAME?:        string;
  @IsOptional() @IsString() @MaxLength(250)               DIM_DESCRIPCION?: string;
  @IsOptional() @IsIn(['Y','N'])                          DIM_ACTIVA?:      string;
}

export class CreateNormaDto {
  @IsString() @IsNotEmpty() @MaxLength(50)  NR_FACTOR_CODE: string;
  @IsString() @IsNotEmpty() @MaxLength(250) NR_DESCRIPCION: string;
  @Type(() => Number) @IsInt()              NR_DIMENSION:   number;
  @IsOptional() @IsIn(['Y','N'])            NR_ACTIVA?:     string;
}

export class UpdateNormaDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(250) NR_DESCRIPCION?: string;
  @IsOptional() @Type(() => Number) @IsInt()              NR_DIMENSION?:   number;
  @IsOptional() @IsIn(['Y','N'])                          NR_ACTIVA?:      string;
}

// ── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Offline Data')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('offline')
export class OfflineController {

  private get schema(): string { return this.config.get<string>('hana.schema'); }
  private get dbType(): string { return this.config.get<string>('app.dbType', 'HANA').toUpperCase(); }
  private get COA(): string  { return tbl(this.schema, 'REND_COA',         this.dbType); }
  private get DIM(): string  { return tbl(this.schema, 'REND_DIMENSIONES', this.dbType); }
  private get NR():  string  { return tbl(this.schema, 'REND_NORMAS',      this.dbType); }

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  // ── REND_COA ──────────────────────────────────────────────────────────────

  @Get('cuentas')
  @ApiOperation({ summary: 'Lista todas las cuentas contables (REND_COA)' })
  getCuentas() {
    return this.db.query(
      `SELECT "COA_CODE","COA_NAME","COA_FORMAT_CODE","COA_ASOCIADA","COA_ACTIVA"
       FROM ${this.COA} ORDER BY "COA_CODE"`,
    );
  }

  @Post('cuentas')
  @ApiOperation({ summary: 'Crea una cuenta contable' })
  async createCuenta(@Body() dto: CreateCuentaCOADto) {
    const exists = await this.db.queryOne(
      `SELECT "COA_CODE" FROM ${this.COA} WHERE "COA_CODE" = ?`, [dto.COA_CODE],
    );
    if (exists) throw new ConflictException(`El código "${dto.COA_CODE}" ya existe`);
    await this.db.execute(
      `INSERT INTO ${this.COA} ("COA_CODE","COA_NAME","COA_FORMAT_CODE","COA_ASOCIADA","COA_ACTIVA")
       VALUES (?,?,?,?,?)`,
      [dto.COA_CODE, dto.COA_NAME, dto.COA_FORMAT_CODE ?? '', dto.COA_ASOCIADA ?? 'N', dto.COA_ACTIVA ?? 'Y'],
    );
    return { COA_CODE: dto.COA_CODE, COA_NAME: dto.COA_NAME };
  }

  @Patch('cuentas/:code')
  @ApiOperation({ summary: 'Actualiza una cuenta contable' })
  async updateCuenta(@Param('code') code: string, @Body() dto: UpdateCuentaCOADto) {
    const parts: string[] = []; const params: any[] = [];
    if (dto.COA_NAME        !== undefined) { parts.push('"COA_NAME" = ?');        params.push(dto.COA_NAME); }
    if (dto.COA_FORMAT_CODE !== undefined) { parts.push('"COA_FORMAT_CODE" = ?'); params.push(dto.COA_FORMAT_CODE); }
    if (dto.COA_ASOCIADA    !== undefined) { parts.push('"COA_ASOCIADA" = ?');    params.push(dto.COA_ASOCIADA); }
    if (dto.COA_ACTIVA      !== undefined) { parts.push('"COA_ACTIVA" = ?');      params.push(dto.COA_ACTIVA); }
    if (!parts.length) return { affected: 0 };
    params.push(code);
    const affected = await this.db.execute(`UPDATE ${this.COA} SET ${parts.join(',')} WHERE "COA_CODE" = ?`, params);
    return { affected };
  }

  @Delete('cuentas/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina una cuenta contable' })
  async deleteCuenta(@Param('code') code: string) {
    const affected = await this.db.execute(`DELETE FROM ${this.COA} WHERE "COA_CODE" = ?`, [code]);
    if (!affected) throw new NotFoundException(`Cuenta "${code}" no encontrada`);
    return { affected };
  }

  // ── REND_DIMENSIONES ──────────────────────────────────────────────────────

  @Get('dimensiones')
  @ApiOperation({ summary: 'Lista dimensiones (REND_DIMENSIONES)' })
  getDimensiones() {
    return this.db.query(
      `SELECT "DIM_CODE","DIM_NAME","DIM_DESCRIPCION","DIM_ACTIVA"
       FROM ${this.DIM} ORDER BY "DIM_CODE"`,
    );
  }

  @Post('dimensiones')
  @ApiOperation({ summary: 'Crea una dimensión' })
  async createDimension(@Body() dto: CreateDimensionDto) {
    const exists = await this.db.queryOne(`SELECT "DIM_CODE" FROM ${this.DIM} WHERE "DIM_CODE" = ?`, [dto.DIM_CODE]);
    if (exists) throw new ConflictException(`El código ${dto.DIM_CODE} ya existe`);
    await this.db.execute(
      `INSERT INTO ${this.DIM} ("DIM_CODE","DIM_NAME","DIM_DESCRIPCION","DIM_ACTIVA") VALUES (?,?,?,?)`,
      [dto.DIM_CODE, dto.DIM_NAME, dto.DIM_DESCRIPCION ?? '', dto.DIM_ACTIVA ?? 'Y'],
    );
    return dto;
  }

  @Patch('dimensiones/:code')
  @ApiOperation({ summary: 'Actualiza una dimensión' })
  async updateDimension(@Param('code') code: string, @Body() dto: UpdateDimensionDto) {
    const parts: string[] = []; const params: any[] = [];
    if (dto.DIM_NAME        !== undefined) { parts.push('"DIM_NAME" = ?');        params.push(dto.DIM_NAME); }
    if (dto.DIM_DESCRIPCION !== undefined) { parts.push('"DIM_DESCRIPCION" = ?'); params.push(dto.DIM_DESCRIPCION); }
    if (dto.DIM_ACTIVA      !== undefined) { parts.push('"DIM_ACTIVA" = ?');      params.push(dto.DIM_ACTIVA); }
    if (!parts.length) return { affected: 0 };
    params.push(Number(code));
    const affected = await this.db.execute(`UPDATE ${this.DIM} SET ${parts.join(',')} WHERE "DIM_CODE" = ?`, params);
    return { affected };
  }

  @Delete('dimensiones/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina una dimensión' })
  async deleteDimension(@Param('code') code: string) {
    const affected = await this.db.execute(`DELETE FROM ${this.DIM} WHERE "DIM_CODE" = ?`, [Number(code)]);
    if (!affected) throw new NotFoundException(`Dimensión ${code} no encontrada`);
    return { affected };
  }

  // ── REND_NORMAS ───────────────────────────────────────────────────────────

  @Get('normas')
  @ApiOperation({ summary: 'Lista normas de reparto con nombre de dimensión (REND_NORMAS)' })
  getNormas() {
    return this.db.query(
      `SELECT n."NR_FACTOR_CODE", n."NR_DESCRIPCION", n."NR_DIMENSION", n."NR_ACTIVA",
              d."DIM_NAME"
       FROM ${this.NR} n
       LEFT JOIN ${this.DIM} d ON d."DIM_CODE" = n."NR_DIMENSION"
       ORDER BY n."NR_DIMENSION", n."NR_FACTOR_CODE"`,
    );
  }

  @Post('normas')
  @ApiOperation({ summary: 'Crea una norma de reparto' })
  async createNorma(@Body() dto: CreateNormaDto) {
    const exists = await this.db.queryOne(`SELECT "NR_FACTOR_CODE" FROM ${this.NR} WHERE "NR_FACTOR_CODE" = ?`, [dto.NR_FACTOR_CODE]);
    if (exists) throw new ConflictException(`El código "${dto.NR_FACTOR_CODE}" ya existe`);
    await this.db.execute(
      `INSERT INTO ${this.NR} ("NR_FACTOR_CODE","NR_DESCRIPCION","NR_DIMENSION","NR_ACTIVA") VALUES (?,?,?,?)`,
      [dto.NR_FACTOR_CODE, dto.NR_DESCRIPCION, dto.NR_DIMENSION, dto.NR_ACTIVA ?? 'Y'],
    );
    return dto;
  }

  @Patch('normas/:code')
  @ApiOperation({ summary: 'Actualiza una norma de reparto' })
  async updateNorma(@Param('code') code: string, @Body() dto: UpdateNormaDto) {
    const parts: string[] = []; const params: any[] = [];
    if (dto.NR_DESCRIPCION !== undefined) { parts.push('"NR_DESCRIPCION" = ?'); params.push(dto.NR_DESCRIPCION); }
    if (dto.NR_DIMENSION   !== undefined) { parts.push('"NR_DIMENSION" = ?');   params.push(dto.NR_DIMENSION); }
    if (dto.NR_ACTIVA      !== undefined) { parts.push('"NR_ACTIVA" = ?');      params.push(dto.NR_ACTIVA); }
    if (!parts.length) return { affected: 0 };
    params.push(code);
    const affected = await this.db.execute(`UPDATE ${this.NR} SET ${parts.join(',')} WHERE "NR_FACTOR_CODE" = ?`, params);
    return { affected };
  }

  @Delete('normas/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina una norma de reparto' })
  async deleteNorma(@Param('code') code: string) {
    const affected = await this.db.execute(`DELETE FROM ${this.NR} WHERE "NR_FACTOR_CODE" = ?`, [code]);
    if (!affected) throw new NotFoundException(`Norma "${code}" no encontrada`);
    return { affected };
  }
}