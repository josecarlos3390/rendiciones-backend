import { Test, TestingModule } from "@nestjs/testing";
import { DocumentosController } from "./documentos.controller";
import { DocumentosService } from "./documentos.service";

describe("DocumentosController", () => {
  let controller: DocumentosController;

  const mockService = {
    findAll: jest.fn(),
    findByPerfil: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentosController],
      providers: [
        {
          provide: DocumentosService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<DocumentosController>(DocumentosController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all documentos when no perfil query", async () => {
      const docs = [{ U_IdDocumento: 1, U_TipDoc: "Factura" }];
      mockService.findAll.mockResolvedValue(docs);

      const result = await controller.findAll();

      expect(result).toEqual(docs);
      expect(mockService.findAll).toHaveBeenCalled();
    });

    it("should return documentos by perfil when query param provided", async () => {
      const docs = [{ U_IdDocumento: 1, U_TipDoc: "Factura" }];
      mockService.findByPerfil.mockResolvedValue(docs);

      const result = await controller.findAll("1");

      expect(result).toEqual(docs);
      expect(mockService.findByPerfil).toHaveBeenCalledWith(1);
    });
  });
});
