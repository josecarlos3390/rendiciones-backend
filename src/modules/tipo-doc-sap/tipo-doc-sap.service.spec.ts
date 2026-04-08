import { Test, TestingModule } from '@nestjs/testing';
import { TipoDocSapService } from './tipo-doc-sap.service';
import { TipoDocSapRepository } from './repositories/tipo-doc-sap.hana.repository';
import { ConfigService } from '@nestjs/config';

describe('TipoDocSapService', () => {
  let service: TipoDocSapService;

  const mockRepo = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipoDocSapService,
        {
          provide: TipoDocSapRepository,
          useValue: mockRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TipoDocSapService>(TipoDocSapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
