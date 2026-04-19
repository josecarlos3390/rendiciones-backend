import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { TipoCambioService } from "./tipo-cambio.service";
import { TIPO_CAMBIO_REPOSITORY } from "./repositories/tipo-cambio.repository.interface";

describe("TipoCambioService", () => {
  let service: TipoCambioService;

  const mockRepo = {
    findByFechaMoneda: jest.fn(),
    findByFechaMonedaCompleto: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === "app.mode") return "ONLINE";
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipoCambioService,
        { provide: TIPO_CAMBIO_REPOSITORY, useValue: mockRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<TipoCambioService>(TipoCambioService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("obtenerTasa", () => {
    it("should return tasa when found", async () => {
      mockRepo.findByFechaMoneda.mockResolvedValue(6.96);

      const result = await service.obtenerTasa("2024-01-01", "USD");

      expect(result).toBe(6.96);
      expect(mockRepo.findByFechaMoneda).toHaveBeenCalledWith(
        "2024-01-01",
        "USD",
      );
    });

    it("should throw NotFoundException when tasa not found", async () => {
      mockRepo.findByFechaMoneda.mockResolvedValue(null);

      await expect(service.obtenerTasa("2024-01-01", "USD")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return all tipos de cambio", async () => {
      const tipos = [{ id: 1, fecha: "2024-01-01", moneda: "USD", tasa: 6.96 }];
      mockRepo.findAll.mockResolvedValue(tipos);

      const result = await service.findAll();

      expect(result).toEqual(tipos);
    });
  });

  describe("findByFechaMoneda", () => {
    it("should return tipo de cambio completo", async () => {
      const tipo = { id: 1, fecha: "2024-01-01", moneda: "USD", tasa: 6.96 };
      mockRepo.findByFechaMonedaCompleto.mockResolvedValue(tipo);

      const result = await service.findByFechaMoneda("2024-01-01", "USD");

      expect(result).toEqual(tipo);
      expect(mockRepo.findByFechaMonedaCompleto).toHaveBeenCalledWith(
        "2024-01-01",
        "USD",
      );
    });
  });
});
