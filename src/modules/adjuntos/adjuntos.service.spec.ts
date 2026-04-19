import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AdjuntosService } from "./adjuntos.service";
import { ADJUNTOS_REPOSITORY } from "./repositories/adjuntos.repository.interface";

describe("AdjuntosService", () => {
  let service: AdjuntosService;

  const mockRepo = {
    findByRendicionDetalle: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === "UPLOAD_DIR") return "./uploads";
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdjuntosService,
        { provide: ADJUNTOS_REPOSITORY, useValue: mockRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AdjuntosService>(AdjuntosService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findByRendicionDetalle", () => {
    it("should return adjuntos", async () => {
      const adjuntos = [{ id: 1, nombre: "factura.pdf" }];
      mockRepo.findByRendicionDetalle.mockResolvedValue(adjuntos);

      const result = await service.findByRendicionDetalle(1, 1);

      expect(result).toEqual(adjuntos);
    });
  });
});
