import { Test, TestingModule } from '@nestjs/testing';
import { PrctjService } from './prctj.service';
import { PrctjHanaRepository } from './repositories/prctj.hana.repository';
import { RendDService } from '../rend-d/rend-d.service';
import { RendMService } from '../rend-m/rend-m.service';

describe('PrctjService', () => {
  let service: PrctjService;

  const mockRepo = {
    findByLinea: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockRendDService = {
    findByRendicion: jest.fn(),
  };

  const mockRendMService = {
    findOne: jest.fn(),
    updateTotales: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrctjService,
        {
          provide: PrctjHanaRepository,
          useValue: mockRepo,
        },
        {
          provide: RendDService,
          useValue: mockRendDService,
        },
        {
          provide: RendMService,
          useValue: mockRendMService,
        },
      ],
    }).compile();

    service = module.get<PrctjService>(PrctjService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
