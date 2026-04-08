import { Test, TestingModule } from '@nestjs/testing';
import { RendCmpService } from './rend-cmp.service';
import { REND_CMP_REPOSITORY } from './repositories/rend-cmp.repository.interface';

describe('RendCmpService', () => {
  let service: RendCmpService;

  const mockRepo = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RendCmpService,
        {
          provide: REND_CMP_REPOSITORY,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<RendCmpService>(RendCmpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
