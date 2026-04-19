import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { DocumentosService } from "./documentos.service";

describe("DocumentosService", () => {
  let service: DocumentosService;

  const mockRepo = {
    findAll: jest.fn(),
    findByPerfil: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentosService,
        {
          provide: "DOCUMENTOS_REPOSITORY",
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<DocumentosService>(DocumentosService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all documentos", async () => {
      const docs = [{ U_IdDocumento: 1, U_TipDoc: "Factura" }];
      mockRepo.findAll.mockResolvedValue(docs);

      const result = await service.findAll();

      expect(result).toEqual(docs);
      expect(mockRepo.findAll).toHaveBeenCalled();
    });
  });

  describe("findByPerfil", () => {
    it("should return documentos by perfil", async () => {
      const docs = [{ U_IdDocumento: 1, U_TipDoc: "Factura" }];
      mockRepo.findByPerfil.mockResolvedValue(docs);

      const result = await service.findByPerfil(1);

      expect(result).toEqual(docs);
      expect(mockRepo.findByPerfil).toHaveBeenCalledWith(1);
    });
  });

  describe("findOne", () => {
    it("should return a documento when found", async () => {
      const doc = { U_IdDocumento: 1, U_TipDoc: "Factura" };
      mockRepo.findOne.mockResolvedValue(doc);

      const result = await service.findOne(1);

      expect(result).toEqual(doc);
      expect(mockRepo.findOne).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException when not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
