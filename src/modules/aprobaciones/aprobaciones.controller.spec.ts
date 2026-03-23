import { Test, TestingModule } from '@nestjs/testing';
import { AprobacionesController } from './aprobaciones.controller';

describe('AprobacionesController', () => {
  let controller: AprobacionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AprobacionesController],
    }).compile();

    controller = module.get<AprobacionesController>(AprobacionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
