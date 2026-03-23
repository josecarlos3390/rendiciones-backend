import { Test, TestingModule } from '@nestjs/testing';
import { TipoDocSapController } from './tipo-doc-sap.controller';

describe('TipoDocSapController', () => {
  let controller: TipoDocSapController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipoDocSapController],
    }).compile();

    controller = module.get<TipoDocSapController>(TipoDocSapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
