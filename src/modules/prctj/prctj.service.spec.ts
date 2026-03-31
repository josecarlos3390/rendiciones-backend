import { Test, TestingModule } from '@nestjs/testing';
import { PrctjService } from './prctj.service';

describe('PrctjService', () => {
  let service: PrctjService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrctjService],
    }).compile();

    service = module.get<PrctjService>(PrctjService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
