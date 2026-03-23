import { Test, TestingModule } from '@nestjs/testing';
import { RendCmpService } from './rend-cmp.service';

describe('RendCmpService', () => {
  let service: RendCmpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RendCmpService],
    }).compile();

    service = module.get<RendCmpService>(RendCmpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
