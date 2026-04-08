import { Module } from '@nestjs/common';
import { CoaController } from './coa.controller';
import { CoaService } from './coa.service';
import {
  COA_REPOSITORY,
} from './repositories/coa.repository.interface';
import { CoaRepository } from './repositories/coa.repository';

@Module({
  controllers: [CoaController],
  providers: [
    CoaService,
    {
      provide: COA_REPOSITORY,
      useClass: CoaRepository,
    },
  ],
  exports: [CoaService],
})
export class CoaModule {}
