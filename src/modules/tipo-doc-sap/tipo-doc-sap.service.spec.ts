import { Test, TestingModule } from '@nestjs/testing';
import { TipoDocSapService } from './tipo-doc-sap.service';

describe('TipoDocSapService', () => {
  let service: TipoDocSapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TipoDocSapService],
    }).compile();

    service = module.get<TipoDocSapService>(TipoDocSapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
