import { Test, TestingModule } from "@nestjs/testing";
import { PermisosService } from "./permisos.service";

describe("PermisosService", () => {
  let service: PermisosService;

  const mockRepo = {
    findUsuarios: jest.fn(),
    findByUsuario: jest.fn(),
    findNombrePerfil: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermisosService,
        { provide: "PERMISOS_REPOSITORY", useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PermisosService>(PermisosService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findUsuarios", () => {
    it("should return all usuarios with permisos", async () => {
      const usuarios = [{ id: 1, nombre: "Juan" }];
      mockRepo.findUsuarios.mockResolvedValue(usuarios);

      const result = await service.findUsuarios();

      expect(result).toEqual(usuarios);
      expect(mockRepo.findUsuarios).toHaveBeenCalled();
    });
  });

  describe("findByUsuario", () => {
    it("should return permisos for a usuario", async () => {
      const permisos = [{ idUsuario: 1, idPerfil: 1 }];
      mockRepo.findByUsuario.mockResolvedValue(permisos);

      const result = await service.findByUsuario(1);

      expect(result).toEqual(permisos);
      expect(mockRepo.findByUsuario).toHaveBeenCalledWith(1);
    });
  });
});
