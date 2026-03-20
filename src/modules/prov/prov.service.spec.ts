import { Test, TestingModule } from '@nestjs/testing';
import { ProvService } from './prov.service';

describe('ProvService', () => {
  let service: ProvService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvService],
    }).compile();

    service = module.get<ProvService>(ProvService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
