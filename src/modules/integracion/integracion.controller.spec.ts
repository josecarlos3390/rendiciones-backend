import { Test, TestingModule } from '@nestjs/testing';
import { IntegracionController } from './integracion.controller';
import { IntegracionService } from './integracion.service';

describe('IntegracionController', () => {
  let controller: IntegracionController;
  let service: IntegracionService;

  const mockService = {
    getPendientes: jest.fn(),
    getMisRendiciones: jest.fn(),
    countPendientes: jest.fn(),
    sincronizar: jest.fn(),
    getHistorial: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegracionController],
      providers: [
        {
          provide: IntegracionService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<IntegracionController>(IntegracionController);
    service = module.get<IntegracionService>(IntegracionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have service defined', () => {
    expect(service).toBeDefined();
  });
});
