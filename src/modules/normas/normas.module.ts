import { Module } from '@nestjs/common';
import { NormasController } from './normas.controller';
import { NormasService } from './normas.service';
import {
  NORMAS_REPOSITORY,
} from './repositories/normas.repository.interface';
import { NormasRepository } from './repositories/normas.repository';

@Module({
  controllers: [NormasController],
  providers: [
    NormasService,
    {
      provide: NORMAS_REPOSITORY,
      useClass: NormasRepository,
    },
  ],
  exports: [NormasService],
})
export class NormasModule {}
