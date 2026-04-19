// ============================================================================
// src/modules/offline/offline.controller.ts
// Endpoints CRUD para los datos de modo OFFLINE:
//   /api/v1/offline/cuentas       → REND_COA
//   /api/v1/offline/dimensiones   → REND_DIMENSIONES
//   /api/v1/offline/normas        → REND_NORMAS
// ============================================================================
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
  Inject,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { Roles } from "@auth/decorators/roles.decorator";
import {
  IOfflineRepository,
  OFFLINE_REPOSITORY,
} from "./repositories/offline.repository.interface";
import {
  CreateCuentaCOADto,
  UpdateCuentaCOADto,
  CreateDimensionDto,
  UpdateDimensionDto,
  CreateNormaDto,
  UpdateNormaDto,
} from "./dto/offline.dto";

@ApiTags("Offline Data")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("offline")
export class OfflineController {
  constructor(
    @Inject(OFFLINE_REPOSITORY) private readonly repo: IOfflineRepository,
  ) {}

  // ── REND_COA ────────────────────────────────────────────────────────────────

  @Get("cuentas")
  @ApiOperation({ summary: "Lista todas las cuentas contables (REND_COA)" })
  getCuentas() {
    return this.repo.findAllCuentas();
  }

  @Post("cuentas")
  @ApiOperation({ summary: "Crea una cuenta contable" })
  async createCuenta(@Body() dto: CreateCuentaCOADto) {
    const exists = await this.repo.findCuentaByCode(dto.COA_CODE);
    if (exists)
      throw new ConflictException(`El código "${dto.COA_CODE}" ya existe`);
    await this.repo.createCuenta(dto);
    return { COA_CODE: dto.COA_CODE, COA_NAME: dto.COA_NAME };
  }

  @Patch("cuentas/:code")
  @ApiOperation({ summary: "Actualiza una cuenta contable" })
  async updateCuenta(
    @Param("code") code: string,
    @Body() dto: UpdateCuentaCOADto,
  ) {
    const affected = await this.repo.updateCuenta(code, dto);
    return { affected };
  }

  @Delete("cuentas/:code")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Elimina una cuenta contable" })
  async deleteCuenta(@Param("code") code: string) {
    const affected = await this.repo.deleteCuenta(code);
    if (!affected)
      throw new NotFoundException(`Cuenta "${code}" no encontrada`);
    return { affected };
  }

  // ── REND_DIMENSIONES ────────────────────────────────────────────────────────

  @Get("dimensiones")
  @ApiOperation({ summary: "Lista dimensiones (REND_DIMENSIONES)" })
  getDimensiones() {
    return this.repo.findAllDimensiones();
  }

  @Post("dimensiones")
  @ApiOperation({ summary: "Crea una dimensión" })
  async createDimension(@Body() dto: CreateDimensionDto) {
    const exists = await this.repo.findDimensionByCode(dto.DIM_CODE);
    if (exists)
      throw new ConflictException(`El código ${dto.DIM_CODE} ya existe`);
    await this.repo.createDimension(dto);
    return dto;
  }

  @Patch("dimensiones/:code")
  @ApiOperation({ summary: "Actualiza una dimensión" })
  async updateDimension(
    @Param("code") code: string,
    @Body() dto: UpdateDimensionDto,
  ) {
    const affected = await this.repo.updateDimension(Number(code), dto);
    return { affected };
  }

  @Delete("dimensiones/:code")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Elimina una dimensión" })
  async deleteDimension(@Param("code") code: string) {
    const affected = await this.repo.deleteDimension(Number(code));
    if (!affected)
      throw new NotFoundException(`Dimensión ${code} no encontrada`);
    return { affected };
  }

  // ── REND_NORMAS ─────────────────────────────────────────────────────────────

  @Get("normas")
  @ApiOperation({
    summary: "Lista normas de reparto con nombre de dimensión (REND_NORMAS)",
  })
  getNormas() {
    return this.repo.findAllNormas();
  }

  @Post("normas")
  @ApiOperation({ summary: "Crea una norma de reparto" })
  async createNorma(@Body() dto: CreateNormaDto) {
    const exists = await this.repo.findNormaByCode(dto.NR_FACTOR_CODE);
    if (exists)
      throw new ConflictException(
        `El código "${dto.NR_FACTOR_CODE}" ya existe`,
      );
    await this.repo.createNorma(dto);
    return dto;
  }

  @Patch("normas/:code")
  @ApiOperation({ summary: "Actualiza una norma de reparto" })
  async updateNorma(@Param("code") code: string, @Body() dto: UpdateNormaDto) {
    const affected = await this.repo.updateNorma(code, dto);
    return { affected };
  }

  @Delete("normas/:code")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Elimina una norma de reparto" })
  async deleteNorma(@Param("code") code: string) {
    const affected = await this.repo.deleteNorma(code);
    if (!affected) throw new NotFoundException(`Norma "${code}" no encontrada`);
    return { affected };
  }
}
