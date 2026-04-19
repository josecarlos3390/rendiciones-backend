import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { OfflineController } from "./offline.controller";
import { OFFLINE_REPOSITORY } from "./repositories/offline.repository.interface";

describe("OfflineController", () => {
  let controller: OfflineController;

  const mockRepo = {
    findAllCuentas: jest.fn(),
    findCuentaByCode: jest.fn(),
    createCuenta: jest.fn(),
    updateCuenta: jest.fn(),
    deleteCuenta: jest.fn(),
    findAllDimensiones: jest.fn(),
    findDimensionByCode: jest.fn(),
    createDimension: jest.fn(),
    updateDimension: jest.fn(),
    deleteDimension: jest.fn(),
    findAllNormas: jest.fn(),
    findNormaByCode: jest.fn(),
    createNorma: jest.fn(),
    updateNorma: jest.fn(),
    deleteNorma: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OfflineController],
      providers: [
        {
          provide: OFFLINE_REPOSITORY,
          useValue: mockRepo,
        },
      ],
    }).compile();

    controller = module.get<OfflineController>(OfflineController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("Cuentas COA", () => {
    it("should return all cuentas", async () => {
      const cuentas = [{ COA_CODE: "1", COA_NAME: "Activo" }];
      mockRepo.findAllCuentas.mockResolvedValue(cuentas);

      const result = await controller.getCuentas();

      expect(result).toEqual(cuentas);
    });

    it("should create cuenta when code does not exist", async () => {
      mockRepo.findCuentaByCode.mockResolvedValue(null);
      mockRepo.createCuenta.mockResolvedValue(undefined);

      const dto = { COA_CODE: "1", COA_NAME: "Activo" } as any;
      const result = await controller.createCuenta(dto);

      expect(result.COA_CODE).toBe("1");
      expect(mockRepo.createCuenta).toHaveBeenCalledWith(dto);
    });

    it("should throw ConflictException when cuenta already exists", async () => {
      mockRepo.findCuentaByCode.mockResolvedValue({ COA_CODE: "1" });

      const dto = { COA_CODE: "1", COA_NAME: "Activo" } as any;
      await expect(controller.createCuenta(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw NotFoundException when deleting non-existent cuenta", async () => {
      mockRepo.deleteCuenta.mockResolvedValue(0);

      await expect(controller.deleteCuenta("999")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("Dimensiones", () => {
    it("should return all dimensiones", async () => {
      const dims = [{ DIM_CODE: 1, DIM_NAME: "Proyecto" }];
      mockRepo.findAllDimensiones.mockResolvedValue(dims);

      const result = await controller.getDimensiones();

      expect(result).toEqual(dims);
    });
  });

  describe("Normas", () => {
    it("should return all normas", async () => {
      const normas = [{ NR_FACTOR_CODE: "N1", NR_DESCRIPCION: "Norma 1" }];
      mockRepo.findAllNormas.mockResolvedValue(normas);

      const result = await controller.getNormas();

      expect(result).toEqual(normas);
    });
  });
});
