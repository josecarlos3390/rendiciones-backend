export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: {
    database: HealthCheckResult;
    jwt: HealthCheckResult;
    ia?: HealthCheckResult;
  };
}

export interface HealthCheckResult {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: Record<string, unknown>;
}
