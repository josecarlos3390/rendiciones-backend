import { Test, TestingModule } from '@nestjs/testing';
import { AprobacionesService } from './aprobaciones.service';
import { AprobacionesHanaRepository } from './repositories/aprobaciones.hana.repository';
import { RendMService } from '../rend-m/rend-m.service';

describe('AprobacionesService', () => {
  let service: AprobacionesService;

  const mockRepo = {
    findPendientesParaAprobador: jest.fn(),
    findPendientesNivel2: jest.fn(),
    countPendientes: jest.fn(),
    countPendientesNivel2: jest.fn(),
    findNivelesByRendicion: jest.fn(),
    aprobarNivel1: jest.fn(),
    aprobarNivel2: jest.fn(),
    rechazarNivel1: jest.fn(),
    rechazarNivel2: jest.fn(),
    anular: jest.fn(),
  };

  const mockRendMService = {
    findOne: jest.fn(),
    actualizarEstado: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AprobacionesService,
        {
          provide: AprobacionesHanaRepository,
          useValue: mockRepo,
        },
        {
          provide: RendMService,
          useValue: mockRendMService,
        },
      ],
    }).compile();

    service = module.get<AprobacionesService>(AprobacionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
