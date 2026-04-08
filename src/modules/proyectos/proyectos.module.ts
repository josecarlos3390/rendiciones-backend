import { Module } from '@nestjs/common';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import {
  PROYECTOS_REPOSITORY,
} from './repositories/proyectos.repository.interface';
import { ProyectosRepository } from './repositories/proyectos.repository';

@Module({
  controllers: [ProyectosController],
  providers: [
    ProyectosService,
    {
      provide: PROYECTOS_REPOSITORY,
      useClass: ProyectosRepository,
    },
  ],
  exports: [ProyectosService],
})
export class ProyectosModule {}
