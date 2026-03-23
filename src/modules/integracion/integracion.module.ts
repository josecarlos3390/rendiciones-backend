import { Module } from '@nestjs/common';
import { IntegracionController }      from './integracion.controller';
import { IntegracionService }         from './integracion.service';
import { IntegracionHanaRepository }  from './repositories/integracion.hana.repository';
import { INTEGRACION_REPOSITORY }     from './repositories/integracion.repository.interface';
import { RendMModule }                from '../rend-m/rend-m.module';

@Module({
  imports:     [RendMModule],
  controllers: [IntegracionController],
  providers: [
    IntegracionService,
    { provide: INTEGRACION_REPOSITORY, useClass: IntegracionHanaRepository },
  ],
  exports: [IntegracionService],
})
export class IntegracionModule {}