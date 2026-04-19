import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ProyectosService } from "./proyectos.service";
import { PROYECTOS_REPOSITORY } from "./repositories/proyectos.repository.interface";

describe("ProyectosService", () => {
  let service: ProyectosService;

  const mockRepo = {
    findAll: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProyectosService,
        { provide: PROYECTOS_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ProyectosService>(ProyectosService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all proyectos", async () => {
      const proyectos = [{ code: "P1", name: "Proyecto 1" }];
      mockRepo.findAll.mockResolvedValue(proyectos);

      const result = await service.findAll();

      expect(result).toEqual(proyectos);
    });
  });

  describe("findByCode", () => {
    it("should return proyecto when found", async () => {
      const proyecto = { code: "P1", name: "Proyecto 1" };
      mockRepo.findByCode.mockResolvedValue(proyecto);

      const result = await service.findByCode("P1");

      expect(result).toEqual(proyecto);
    });

    it("should throw NotFoundException when not found", async () => {
      mockRepo.findByCode.mockResolvedValue(null);

      await expect(service.findByCode("XXX")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
