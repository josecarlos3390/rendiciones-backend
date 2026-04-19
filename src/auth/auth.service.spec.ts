import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { DATABASE_SERVICE } from "../database/interfaces/database.interface";
import { LoginAttemptsService } from "./services/login-attempts.service";

describe("AuthService", () => {
  let service: AuthService;

  const mockDb = {
    query: jest.fn(),
    queryOne: jest.fn(),
    execute: jest.fn(),
    col: jest.fn().mockImplementation((row: any, name: string) => row?.[name]),
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue("mock-jwt-token"),
  };

  const mockConfig = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === "hana.schema") return "REND_RETAIL";
      if (key === "app.dbType") return "HANA";
      return defaultValue;
    }),
  };

  const mockLoginAttempts = {
    checkLockout: jest.fn(),
    recordFailedAttempt: jest.fn(),
    recordSuccessfulLogin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DATABASE_SERVICE, useValue: mockDb },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: LoginAttemptsService, useValue: mockLoginAttempts },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("login", () => {
    it("should throw UnauthorizedException when user not found", async () => {
      mockDb.query.mockResolvedValue([]);

      const dto = { username: "nonexistent", password: "pass" };
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockLoginAttempts.recordFailedAttempt).toHaveBeenCalledWith(
        "nonexistent",
      );
    });
  });

  describe("refreshToken", () => {
    it("should throw UnauthorizedException when user not found", async () => {
      mockDb.query.mockResolvedValue([]);

      await expect(service.refreshToken(999)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
