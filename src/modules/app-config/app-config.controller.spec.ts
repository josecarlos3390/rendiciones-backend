import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { ConfigService } from '@nestjs/config';

describe('AppConfigController', () => {
  let controller: AppConfigController;

  const mockAppConfigService = {
    getPublicConfig: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppConfigController],
      providers: [
        {
          provide: AppConfigService,
          useValue: mockAppConfigService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AppConfigController>(AppConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
