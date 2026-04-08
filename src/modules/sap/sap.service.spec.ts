import { Test, TestingModule } from '@nestjs/testing';
import { SapService } from './sap.service';
import { ConfigService } from '@nestjs/config';
import { HanaService } from '../../database/hana.service';

describe('SapService', () => {
  let service: SapService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHanaService = {
    query: jest.fn(),
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SapService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HanaService,
          useValue: mockHanaService,
        },
      ],
    }).compile();

    service = module.get<SapService>(SapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
