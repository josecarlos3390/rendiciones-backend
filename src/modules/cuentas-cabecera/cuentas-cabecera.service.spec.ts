import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { CuentasCabeceraService } from "./cuentas-cabecera.service";

describe("CuentasCabeceraService", () => {
  let service: CuentasCabeceraService;

  const mockRepo = {
    findAll: jest.fn(),
    findByPerfil: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuentasCabeceraService,
        { provide: "CUENTAS_CABECERA_REPOSITORY", useValue: mockRepo },
      ],
    }).compile();

    service = module.get<CuentasCabeceraService>(CuentasCabeceraService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all cuentas", async () => {
      const cuentas = [{ idPerfil: 1, cuentaSys: "1" }];
      mockRepo.findAll.mockResolvedValue(cuentas);

      const result = await service.findAll();

      expect(result).toEqual(cuentas);
    });
  });

  describe("create", () => {
    it("should create when cuenta does not exist", async () => {
      mockRepo.exists.mockResolvedValue(false);
      const cuenta = { idPerfil: 1, cuentaSys: "1", nombreCuenta: "Activo" };
      mockRepo.create.mockResolvedValue(cuenta);

      const dto = {
        idPerfil: 1,
        cuentaSys: "1",
        nombreCuenta: "Activo",
      } as any;
      const result = await service.create(dto);

      expect(result).toEqual(cuenta);
    });

    it("should throw ConflictException when cuenta already exists", async () => {
      mockRepo.exists.mockResolvedValue(true);

      const dto = {
        idPerfil: 1,
        cuentaSys: "1",
        nombreCuenta: "Activo",
      } as any;
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });
});
