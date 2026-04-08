import { Test, TestingModule } from '@nestjs/testing';
import { FacturaController } from './factura.controller';
import { FacturaService } from './factura.service';

describe('FacturaController', () => {
  let controller: FacturaController;
  let service: FacturaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FacturaController],
      providers: [FacturaService],
    }).compile();

    controller = module.get<FacturaController>(FacturaController);
    service = module.get<FacturaService>(FacturaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have facturaService defined', () => {
    expect(service).toBeDefined();
  });
});
