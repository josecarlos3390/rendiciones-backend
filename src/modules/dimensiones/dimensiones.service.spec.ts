import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { DimensionesService } from "./dimensiones.service";
import { DIMENSIONES_REPOSITORY } from "./repositories/dimensiones.repository.interface";

describe("DimensionesService", () => {
  let service: DimensionesService;

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
        DimensionesService,
        { provide: DIMENSIONES_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<DimensionesService>(DimensionesService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all dimensiones", async () => {
      const dims = [{ code: 1, name: "Proyecto" }];
      mockRepo.findAll.mockResolvedValue(dims);

      const result = await service.findAll();

      expect(result).toEqual(dims);
    });
  });

  describe("findByCode", () => {
    it("should return dimension when found", async () => {
      const dim = { code: 1, name: "Proyecto" };
      mockRepo.findByCode.mockResolvedValue(dim);

      const result = await service.findByCode(1);

      expect(result).toEqual(dim);
    });

    it("should throw NotFoundException when not found", async () => {
      mockRepo.findByCode.mockResolvedValue(null);

      await expect(service.findByCode(999)).rejects.toThrow(NotFoundException);
    });
  });
});
