import { Test, TestingModule } from '@nestjs/testing';
import { PrctjController } from './prctj.controller';

describe('PrctjController', () => {
  let controller: PrctjController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrctjController],
    }).compile();

    controller = module.get<PrctjController>(PrctjController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
