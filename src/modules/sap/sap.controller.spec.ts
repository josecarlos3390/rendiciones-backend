import { Test, TestingModule } from '@nestjs/testing';
import { SapController } from './sap.controller';
import { SAP_SERVICE } from './sap.tokens';

describe('SapController', () => {
  let controller: SapController;

  const mockSapService = {
    getActiveDimensionsWithRules: jest.fn(),
    clearCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SapController],
      providers: [
        {
          provide: SAP_SERVICE,
          useValue: mockSapService,
        },
      ],
    }).compile();

    controller = module.get<SapController>(SapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
