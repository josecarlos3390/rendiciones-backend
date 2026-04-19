import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { NormasService } from "./normas.service";
import { NORMAS_REPOSITORY } from "./repositories/normas.repository.interface";

describe("NormasService", () => {
  let service: NormasService;

  const mockRepo = {
    findAll: jest.fn(),
    findByFactorCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
    dimensionExists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NormasService,
        { provide: NORMAS_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<NormasService>(NormasService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all normas", async () => {
      const normas = [{ factorCode: "N1", description: "Norma 1" }];
      mockRepo.findAll.mockResolvedValue(normas);

      const result = await service.findAll();

      expect(result).toEqual(normas);
    });
  });

  describe("findByFactorCode", () => {
    it("should return norma when found", async () => {
      const norma = { factorCode: "N1", description: "Norma 1" };
      mockRepo.findByFactorCode.mockResolvedValue(norma);

      const result = await service.findByFactorCode("N1");

      expect(result).toEqual(norma);
    });

    it("should throw NotFoundException when not found", async () => {
      mockRepo.findByFactorCode.mockResolvedValue(null);

      await expect(service.findByFactorCode("XXX")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
