import { Module } from '@nestjs/common';
import { DimensionesController } from './dimensiones.controller';
import { DimensionesService } from './dimensiones.service';
import {
  DIMENSIONES_REPOSITORY,
} from './repositories/dimensiones.repository.interface';
import { DimensionesRepository } from './repositories/dimensiones.repository';

@Module({
  controllers: [DimensionesController],
  providers: [
    DimensionesService,
    {
      provide: DIMENSIONES_REPOSITORY,
      useClass: DimensionesRepository,
    },
  ],
  exports: [DimensionesService],
})
export class DimensionesModule {}
