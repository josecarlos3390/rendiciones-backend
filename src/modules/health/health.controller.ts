import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../../auth/decorators/public.decorator";
import { HealthService } from "./health.service";
import { HealthCheckResult } from "./interfaces/health.interface";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Endpoint básico de health check - accesible públicamente
   */
  @Public()
  @Get()
  @ApiOperation({ summary: "Verificar estado de salud del sistema" })
  async check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }

  /**
   * Endpoint detallado - solo para administradores
   */
  @Get("detailed")
  @ApiOperation({ summary: "Verificar estado detallado (admin only)" })
  async checkDetailed(): Promise<HealthCheckResult> {
    return this.healthService.checkDetailed();
  }
}
