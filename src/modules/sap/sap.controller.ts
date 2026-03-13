import { Controller, Get, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { SapService } from './sap.service';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('SAP')
@ApiBearerAuth()
@Controller('sap')
export class SapController {
  constructor(private readonly sapService: SapService) {}

  /**
   * GET /api/v1/sap/dimensions
   *
   * Devuelve las dimensiones activas de SAP con sus normas de reparto.
   * El frontend usa DimensionCode para saber en qué campo NR mostrar el dropdown:
   *   DimensionCode 1 → U_NR1 / nr1
   *   DimensionCode 2 → U_NR2 / nr2
   *   ...etc.
   */
  @Get('dimensions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Obtiene dimensiones activas con sus normas de reparto desde SAP SL' })
  getDimensions() {
    return this.sapService.getActiveDimensionsWithRules();
  }

  /**
   * POST /api/v1/sap/dimensions/refresh
   * Fuerza la recarga de la caché (útil si cambiaron reglas en SAP)
   */
  @Post('dimensions/refresh')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Limpia la caché de dimensiones y fuerza recarga desde SAP SL' })
  refreshDimensions() {
    this.sapService.clearCache();
    return this.sapService.getActiveDimensionsWithRules();
  }

  /**
   * GET /api/v1/sap/chart-of-accounts
   * Devuelve cuentas del plan contable SAP:
   * ActiveAccount=tYES, FrozenFor=tNO, AccountLevel=5
   */
  @Get('chart-of-accounts')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Plan de cuentas SAP (activas, nivel 5, no congeladas)' })
  getChartOfAccounts() {
    return this.sapService.getChartOfAccounts();
  }

  /**
   * GET /api/v1/sap/empleados?car=EMPIEZA&filtro=EL
   *
   * Devuelve BusinessPartners de SAP filtrados según la característica del perfil (U_EMP_CAR):
   *   - EMPIEZA  → CardCode que empieza con el valor de `filtro`  (startswith)
   *   - TERMINA  → CardCode que termina con el valor de `filtro`   (endswith)
   *   - NOTIENE  → lista vacía, sin consultar SAP
   */
  @Get('empleados')
  @ApiOperation({ summary: 'Busca empleados SAP filtrados según la característica del perfil (U_EMP_CAR)' })
  getEmpleados(
    @Query('car')    car:    string,
    @Query('filtro') filtro: string,
  ) {
    return this.sapService.getEmpleados(car ?? 'EMPIEZA', filtro ?? '');
  }
}