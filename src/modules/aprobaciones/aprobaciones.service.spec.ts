import { Test, TestingModule } from "@nestjs/testing";
import { AprobacionesService } from "./aprobaciones.service";
import { APROBACIONES_REPOSITORY } from "./repositories/aprobaciones.repository.interface";
import { RendMService } from "../rend-m/rend-m.service";

describe("AprobacionesService", () => {
  let service: AprobacionesService;

  const mockRepo = {
    findPendientesParaAprobador: jest.fn(),
    findPendientesNivel2: jest.fn(),
    countPendientes: jest.fn(),
    countPendientesNivel2: jest.fn(),
  };

  const mockRendMService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AprobacionesService,
        { provide: APROBACIONES_REPOSITORY, useValue: mockRepo },
        { provide: RendMService, useValue: mockRendMService },
      ],
    }).compile();

    service = module.get<AprobacionesService>(AprobacionesService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getPendientes", () => {
    it("should return pending approvals", async () => {
      const pendientes = [{ idRendicion: 1, estado: "PENDIENTE" }];
      mockRepo.findPendientesParaAprobador.mockResolvedValue(pendientes);

      const result = await service.getPendientes("admin");

      expect(result).toEqual(pendientes);
    });
  });

  describe("countPendientes", () => {
    it("should return count of pending approvals", async () => {
      mockRepo.countPendientes.mockResolvedValue(5);

      const result = await service.countPendientes("admin");

      expect(result).toEqual({ count: 5 });
    });
  });
});
