import { Test, TestingModule } from '@nestjs/testing';
import { AprobacionesService } from './aprobaciones.service';

describe('AprobacionesService', () => {
  let service: AprobacionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AprobacionesService],
    }).compile();

    service = module.get<AprobacionesService>(AprobacionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
