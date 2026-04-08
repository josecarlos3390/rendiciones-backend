import { Test, TestingModule } from '@nestjs/testing';
import { RendCmpController } from './rend-cmp.controller';
import { RendCmpService } from './rend-cmp.service';

describe('RendCmpController', () => {
  let controller: RendCmpController;
  let service: RendCmpService;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RendCmpController],
      providers: [
        {
          provide: RendCmpService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<RendCmpController>(RendCmpController);
    service = module.get<RendCmpService>(RendCmpService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have service defined', () => {
    expect(service).toBeDefined();
  });
});
