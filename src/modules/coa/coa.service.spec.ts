import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CoaService } from "./coa.service";
import { COA_REPOSITORY } from "./repositories/coa.repository.interface";

describe("CoaService", () => {
  let service: CoaService;

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
      providers: [CoaService, { provide: COA_REPOSITORY, useValue: mockRepo }],
    }).compile();

    service = module.get<CoaService>(CoaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all cuentas", async () => {
      const cuentas = [{ code: "1", name: "Activo" }];
      mockRepo.findAll.mockResolvedValue(cuentas);

      const result = await service.findAll();

      expect(result).toEqual(cuentas);
    });
  });

  describe("findByCode", () => {
    it("should return cuenta when found", async () => {
      const cuenta = { code: "1", name: "Activo" };
      mockRepo.findByCode.mockResolvedValue(cuenta);

      const result = await service.findByCode("1");

      expect(result).toEqual(cuenta);
    });

    it("should throw NotFoundException when not found", async () => {
      mockRepo.findByCode.mockResolvedValue(null);

      await expect(service.findByCode("999")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
