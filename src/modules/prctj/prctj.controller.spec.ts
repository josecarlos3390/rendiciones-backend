import { Test, TestingModule } from '@nestjs/testing';
import { PrctjController } from './prctj.controller';
import { PrctjService } from './prctj.service';

describe('PrctjController', () => {
  let controller: PrctjController;
  let service: PrctjService;

  const mockService = {
    findByLinea: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrctjController],
      providers: [
        {
          provide: PrctjService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PrctjController>(PrctjController);
    service = module.get<PrctjService>(PrctjService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have service defined', () => {
    expect(service).toBeDefined();
  });
});
