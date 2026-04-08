import { Test, TestingModule } from '@nestjs/testing';
import { TipoDocSapController } from './tipo-doc-sap.controller';
import { TipoDocSapService } from './tipo-doc-sap.service';

describe('TipoDocSapController', () => {
  let controller: TipoDocSapController;
  let service: TipoDocSapService;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipoDocSapController],
      providers: [
        {
          provide: TipoDocSapService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TipoDocSapController>(TipoDocSapController);
    service = module.get<TipoDocSapService>(TipoDocSapService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have service defined', () => {
    expect(service).toBeDefined();
  });
});
