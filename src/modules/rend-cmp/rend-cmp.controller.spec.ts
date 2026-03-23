import { Test, TestingModule } from '@nestjs/testing';
import { RendCmpController } from './rend-cmp.controller';

describe('RendCmpController', () => {
  let controller: RendCmpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RendCmpController],
    }).compile();

    controller = module.get<RendCmpController>(RendCmpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
