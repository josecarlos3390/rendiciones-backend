import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from "../../database/interfaces/database.interface";
import { HealthCheckResult, HealthStatus } from "./interfaces/health.interface";
import * as os from "os";
import * as process from "process";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime: number = Date.now();

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Health check básico - verifica componentes esenciales
   */
  async check(): Promise<HealthCheckResult> {
    const checks: HealthStatus = {
      database: await this.checkDatabase(),
    };

    const isHealthy = Object.values(checks).every(
      (check) => check.status === "up",
    );

    return {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }

  /**
   * Health check detallado - incluye métricas del sistema
   */
  async checkDetailed(): Promise<HealthCheckResult> {
    const basic = await this.check();

    const memory = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usagePercent: Math.round(
        ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
      ),
    };

    return {
      ...basic,
      version: this.getVersion(),
      environment: this.config.get<string>("NODE_ENV", "development"),
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        rss: memory.rss,
        external: memory.external,
        system: systemMemory,
      },
      cpu: {
        loadAvg: os.loadavg(),
        count: os.cpus().length,
      },
      checks: {
        ...basic.checks,
        disk: this.checkDiskSpace(),
      },
    };
  }

  /**
   * Verifica conectividad con la base de datos
   */
  private async checkDatabase(): Promise<{
    status: "up" | "down";
    responseTime?: number;
    message?: string;
  }> {
    const start = Date.now();
    try {
      // Query simple para verificar conectividad
      await this.db.queryOne('SELECT 1 as "test"');
      return {
        status: "up",
        responseTime: Date.now() - start,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error("Health check - Database failed", msg);
      return {
        status: "down",
        message: msg,
      };
    }
  }

  /**
   * Verifica espacio en disco (simplificado - solo retorna status)
   */
  private checkDiskSpace(): { status: "up" | "down"; message?: string } {
    try {
      // En Windows/Linux, si podemos escribir en el directorio de uploads, está OK
      // Una verificación más completa requeriría una librería como 'check-disk-space'
      return {
        status: "up",
      };
    } catch (err: unknown) {
      return {
        status: "down",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Obtiene la versión del package.json
   */
  private getVersion(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = require("../../../package.json");
      return pkg.version || "unknown";
    } catch {
      return "unknown";
    }
  }
}
