import { Test, TestingModule } from '@nestjs/testing';
import { PerfilesService } from './perfiles.service';

describe('PerfilesService', () => {
  let service: PerfilesService;

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
        PerfilesService,
        {
          provide: 'PERFILES_REPOSITORY',
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<PerfilesService>(PerfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
