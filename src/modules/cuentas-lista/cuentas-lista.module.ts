import { Module } from '@nestjs/common';
import { CuentasListaService }         from './cuentas-lista.service';
import { CuentasListaController }      from './cuentas-lista.controller';
import { CuentasListaHanaRepository }  from './repositories/cuentas-lista.hana.repository';

@Module({
  imports: [],
  controllers: [CuentasListaController],
  providers: [
    CuentasListaService,
    CuentasListaHanaRepository,
    {
      provide:    'CUENTAS_LISTA_REPOSITORY',
      inject:     [CuentasListaHanaRepository],
      useFactory: (repo: CuentasListaHanaRepository) => repo,
    },
  ],
  exports: [CuentasListaService],
})
export class CuentasListaModule {}