import { Test, TestingModule } from '@nestjs/testing';
import { PerfilesController } from './perfiles.controller';
import { PerfilesService } from './perfiles.service';

describe('PerfilesController', () => {
  let controller: PerfilesController;
  let service: PerfilesService;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerfilesController],
      providers: [
        {
          provide: PerfilesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PerfilesController>(PerfilesController);
    service = module.get<PerfilesService>(PerfilesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have service defined', () => {
    expect(service).toBeDefined();
  });
});
