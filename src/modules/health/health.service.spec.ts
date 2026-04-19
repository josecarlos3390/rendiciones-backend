import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { HealthService } from "./health.service";
import { DATABASE_SERVICE } from "../../database/interfaces/database.interface";

describe("HealthService", () => {
  let service: HealthService;

  const mockDb = {
    queryOne: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === "NODE_ENV") return "test";
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DATABASE_SERVICE, useValue: mockDb },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("check", () => {
    it("should return healthy when database is up", async () => {
      mockDb.queryOne.mockResolvedValue({ test: 1 });

      const result = await service.check();

      expect(result.status).toBe("healthy");
      expect(result.checks.database.status).toBe("up");
      expect(result.checks.database.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.uptime).toBeGreaterThan(0);
    });

    it("should return unhealthy when database is down", async () => {
      mockDb.queryOne.mockRejectedValue(new Error("Connection refused"));

      const result = await service.check();

      expect(result.status).toBe("unhealthy");
      expect(result.checks.database.status).toBe("down");
      expect(result.checks.database.message).toBe("Connection refused");
    });
  });

  describe("checkDetailed", () => {
    it("should include system metrics", async () => {
      mockDb.queryOne.mockResolvedValue({ test: 1 });

      const result = await service.checkDetailed();

      expect(result.status).toBe("healthy");
      expect(result.environment).toBe("test");
      expect(result.version).toBeDefined();
      expect(result.memory).toBeDefined();
      expect(result.memory?.heapUsed).toBeGreaterThan(0);
      expect(result.cpu).toBeDefined();
      expect(result.cpu?.count).toBeGreaterThan(0);
    });
  });
});
