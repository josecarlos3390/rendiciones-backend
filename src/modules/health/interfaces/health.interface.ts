export interface HealthCheck {
  status: 'up' | 'down';
  responseTime?: number;
  message?: string;
}

export interface HealthStatus {
  [key: string]: HealthCheck;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version?: string;
  environment?: string;
  memory?: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    system: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
  };
  cpu?: {
    loadAvg: number[];
    count: number;
  };
  checks: HealthStatus;
}
