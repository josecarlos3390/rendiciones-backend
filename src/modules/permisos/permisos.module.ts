import { Module } from '@nestjs/common';
import { PermisosService }        from './permisos.service';
import { PermisosController }     from './permisos.controller';
import { PermisosHanaRepository } from './repositories/permisos.hana.repository';
import { DatabaseModule }         from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PermisosController],
  providers: [
    PermisosService,
    PermisosHanaRepository,
    {
      provide:    'PERMISOS_REPOSITORY',
      inject:     [PermisosHanaRepository],
      useFactory: (repo: PermisosHanaRepository) => repo,
    },
  ],
  exports: [PermisosService],
})
export class PermisosModule {}
