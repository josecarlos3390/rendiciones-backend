import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { RendDService } from "./rend-d.service";
import { RendMService } from "../rend-m/rend-m.service";
import { CoaService } from "../coa/coa.service";
import { ProyectosService } from "../proyectos/proyectos.service";
import { ProvService } from "../prov/prov.service";
import { NormasService } from "../normas/normas.service";

describe("RendDService", () => {
  let service: RendDService;

  const mockRepo = {
    findByRendicion: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRendMService = {};
  const mockCoaService = {};
  const mockProyectosService = {};
  const mockProvService = {};
  const mockNormasService = {};
  const mockConfig = { get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RendDService,
        { provide: "REND_D_REPOSITORY", useValue: mockRepo },
        { provide: RendMService, useValue: mockRendMService },
        { provide: CoaService, useValue: mockCoaService },
        { provide: ProyectosService, useValue: mockProyectosService },
        { provide: ProvService, useValue: mockProvService },
        { provide: NormasService, useValue: mockNormasService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<RendDService>(RendDService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
