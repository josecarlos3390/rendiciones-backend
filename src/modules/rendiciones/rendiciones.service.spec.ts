import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { RendicionesService } from "./rendiciones.service";

describe("RendicionesService", () => {
  let service: RendicionesService;

  const mockRepo = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RendicionesService,
        { provide: "RENDICIONES_REPOSITORY", useValue: mockRepo },
      ],
    }).compile();

    service = module.get<RendicionesService>(RendicionesService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all rendiciones", async () => {
      const rendiciones = [{ id: 1, descripcion: "Test" }];
      mockRepo.findAll.mockResolvedValue(rendiciones);

      const result = await service.findAll();

      expect(result).toEqual(rendiciones);
    });
  });

  describe("findOne", () => {
    it("should return rendicion when found", async () => {
      const rendicion = { id: 1, descripcion: "Test" };
      mockRepo.findOne.mockResolvedValue(rendicion);

      const result = await service.findOne(1);

      expect(result).toEqual(rendicion);
    });

    it("should throw NotFoundException when not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
