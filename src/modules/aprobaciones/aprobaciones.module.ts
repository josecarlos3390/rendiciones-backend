import { Module } from '@nestjs/common';
import { AprobacionesController }    from './aprobaciones.controller';
import { AprobacionesService }       from './aprobaciones.service';
import { AprobacionesHanaRepository } from './repositories/aprobaciones.hana.repository';
import { RendMModule }               from '../rend-m/rend-m.module';

@Module({
  imports:     [RendMModule],
  controllers: [AprobacionesController],
  providers:   [AprobacionesService, AprobacionesHanaRepository],
  exports:     [AprobacionesService],
})
export class AprobacionesModule {}