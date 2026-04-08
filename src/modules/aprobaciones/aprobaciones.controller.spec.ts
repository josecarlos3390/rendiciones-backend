import { Test, TestingModule } from '@nestjs/testing';
import { AprobacionesController } from './aprobaciones.controller';
import { AprobacionesService } from './aprobaciones.service';

describe('AprobacionesController', () => {
  let controller: AprobacionesController;
  let service: AprobacionesService;

  const mockService = {
    getPendientes: jest.fn(),
    getPendientesNivel2: jest.fn(),
    countPendientes: jest.fn(),
    countPendientesNivel2: jest.fn(),
    getNiveles: jest.fn(),
    aprobarNivel1: jest.fn(),
    aprobarNivel2: jest.fn(),
    rechazarNivel1: jest.fn(),
    rechazarNivel2: jest.fn(),
    anular: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AprobacionesController],
      providers: [
        {
          provide: AprobacionesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AprobacionesController>(AprobacionesController);
    service = module.get<AprobacionesService>(AprobacionesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have service defined', () => {
    expect(service).toBeDefined();
  });
});
