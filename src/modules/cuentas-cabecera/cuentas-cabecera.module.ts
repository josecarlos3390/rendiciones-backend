import { Module } from '@nestjs/common';
import { CuentasCabeceraService }        from './cuentas-cabecera.service';
import { CuentasCabeceraController }     from './cuentas-cabecera.controller';
import { CuentasCabeceraHanaRepository } from './repositories/cuentas-cabecera.hana.repository';
import { DatabaseModule }                from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CuentasCabeceraController],
  providers: [
    CuentasCabeceraService,
    CuentasCabeceraHanaRepository,
    {
      provide:    'CUENTAS_CABECERA_REPOSITORY',
      inject:     [CuentasCabeceraHanaRepository],
      useFactory: (repo: CuentasCabeceraHanaRepository) => repo,
    },
  ],
  exports: [CuentasCabeceraService],
})
export class CuentasCabeceraModule {}
