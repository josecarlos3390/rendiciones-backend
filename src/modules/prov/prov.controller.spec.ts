import { Test, TestingModule } from '@nestjs/testing';
import { ProvController } from './prov.controller';
import { ProvService } from './prov.service';

describe('ProvController', () => {
  let controller: ProvController;
  let service: ProvService;

  const mockService = {
    findAll: jest.fn(),
    findByNit: jest.fn(),
    findOrCreate: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvController],
      providers: [
        {
          provide: ProvService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ProvController>(ProvController);
    service = module.get<ProvService>(ProvService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have service defined', () => {
    expect(service).toBeDefined();
  });
});
