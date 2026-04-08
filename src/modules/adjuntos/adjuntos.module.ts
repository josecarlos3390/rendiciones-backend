import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdjuntosController } from './adjuntos.controller';
import { AdjuntosService } from './adjuntos.service';
import {
  ADJUNTOS_REPOSITORY,
} from './repositories/adjuntos.repository.interface';
import { AdjuntosRepository } from './repositories/adjuntos.repository';

@Module({
  imports: [ConfigModule],
  controllers: [AdjuntosController],
  providers: [
    AdjuntosService,
    {
      provide: ADJUNTOS_REPOSITORY,
      useClass: AdjuntosRepository,
    },
  ],
  exports: [AdjuntosService],
})
export class AdjuntosModule {}
