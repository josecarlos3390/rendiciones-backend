import { Module } from '@nestjs/common';
import { IntegracionController }      from './integracion.controller';
import { IntegracionService }         from './integracion.service';
import { IntegracionHanaRepository }  from './repositories/integracion.hana.repository';
import { INTEGRACION_REPOSITORY }     from './repositories/integracion.repository.interface';
import { SapSlService }               from './sap-sl.service';
import { RendMModule }                from '../rend-m/rend-m.module';
import { RendDModule }                from '../rend-d/rend-d.module';
import { PrctjModule }                from '../prctj/prctj.module';

@Module({
  imports:     [RendMModule, RendDModule, PrctjModule],
  controllers: [IntegracionController],
  providers: [
    IntegracionService,
    SapSlService,
    { provide: INTEGRACION_REPOSITORY, useClass: IntegracionHanaRepository },
  ],
  exports: [IntegracionService],
})
export class IntegracionModule {}