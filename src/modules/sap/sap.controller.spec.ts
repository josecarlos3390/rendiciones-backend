import { Test, TestingModule } from '@nestjs/testing';
import { SapController } from './sap.controller';

describe('SapController', () => {
  let controller: SapController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SapController],
    }).compile();

    controller = module.get<SapController>(SapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
