import { Test, TestingModule } from '@nestjs/testing';
import { ProvController } from './prov.controller';

describe('ProvController', () => {
  let controller: ProvController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvController],
    }).compile();

    controller = module.get<ProvController>(ProvController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
