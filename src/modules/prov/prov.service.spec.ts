import { Test, TestingModule } from '@nestjs/testing';
import { ProvService } from './prov.service';
import { PROV_REPOSITORY } from './repositories/prov.repository.interface';

describe('ProvService', () => {
  let service: ProvService;

  const mockRepo = {
    findAll: jest.fn(),
    findByNit: jest.fn(),
    findByCodigo: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvService,
        {
          provide: PROV_REPOSITORY,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ProvService>(ProvService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
