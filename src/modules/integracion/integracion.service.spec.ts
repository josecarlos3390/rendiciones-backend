import { Test, TestingModule } from "@nestjs/testing";
import { IntegracionService } from "./integracion.service";
import { INTEGRACION_REPOSITORY } from "./repositories/integracion.repository.interface";
import { RendMService } from "../rend-m/rend-m.service";
import { RendDService } from "../rend-d/rend-d.service";
import { SapSlService } from "./sap-sl.service";
import { PRCTJ_REPOSITORY } from "../prctj/repositories/prctj.repository.interface";
import { REND_CMP_REPOSITORY } from "../rend-cmp/repositories/rend-cmp.repository.interface";
import { ConfigService } from "@nestjs/config";
import { TipoCambioService } from "../tipo-cambio/tipo-cambio.service";

describe("IntegracionService", () => {
  let service: IntegracionService;

  const mockRepo = {
    findPendientesByAprobador: jest.fn(),
    findMisRendiciones: jest.fn(),
    countPendientes: jest.fn(),
    findRendicionCompleta: jest.fn(),
    updateSyncStatus: jest.fn(),
    getHistorial: jest.fn(),
  };

  const mockRendMService = {
    findOne: jest.fn(),
  };

  const mockRendDService = {
    findByIdRendicion: jest.fn(),
  };

  const mockSapSlService = {
    login: jest.fn(),
    logout: jest.fn(),
    buildJournalPayload: jest.fn(),
    syncJournalEntry: jest.fn(),
  };

  const mockPrctjRepo = {
    findByIdRendicion: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockTipoCambioService = {
    obtenerTasa: jest.fn(),
  };

  const mockRendCmpRepo = {
    findByRendicion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegracionService,
        {
          provide: INTEGRACION_REPOSITORY,
          useValue: mockRepo,
        },
        {
          provide: RendMService,
          useValue: mockRendMService,
        },
        {
          provide: RendDService,
          useValue: mockRendDService,
        },
        {
          provide: SapSlService,
          useValue: mockSapSlService,
        },
        {
          provide: PRCTJ_REPOSITORY,
          useValue: mockPrctjRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TipoCambioService,
          useValue: mockTipoCambioService,
        },
        {
          provide: REND_CMP_REPOSITORY,
          useValue: mockRendCmpRepo,
        },
      ],
    }).compile();

    service = module.get<IntegracionService>(IntegracionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
