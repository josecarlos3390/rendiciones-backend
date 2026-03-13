import { Test, TestingModule } from '@nestjs/testing';
import { SapService } from './sap.service';

describe('SapService', () => {
  let service: SapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SapService],
    }).compile();

    service = module.get<SapService>(SapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
