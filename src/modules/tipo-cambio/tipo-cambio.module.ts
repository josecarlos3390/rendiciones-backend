import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SapModule } from '../sap/sap.module';
import { TipoCambioController } from './tipo-cambio.controller';
import { TipoCambioService } from './tipo-cambio.service';
import { TIPO_CAMBIO_REPOSITORY } from './repositories/tipo-cambio.repository.interface';
import { TipoCambioHanaRepository } from './repositories/tipo-cambio.hana.repository';
import { TipoCambioSqlRepository } from './repositories/tipo-cambio.sql.repository';

/**
 * Factory para seleccionar el repositorio según el modo (ONLINE/OFFLINE)
 */
const tipoCambioRepositoryProvider: Provider = {
  provide: TIPO_CAMBIO_REPOSITORY,
  useFactory: (
    hanaRepo: TipoCambioHanaRepository,
    sqlRepo: TipoCambioSqlRepository,
    config: ConfigService,
  ) => {
    const isOffline = config.get<string>('app.mode', 'ONLINE').toUpperCase() === 'OFFLINE';
    return isOffline ? sqlRepo : hanaRepo;
  },
  inject: [TipoCambioHanaRepository, TipoCambioSqlRepository, ConfigService],
};

@Module({
  imports: [SapModule],
  controllers: [TipoCambioController],
  providers: [
    TipoCambioService,
    TipoCambioHanaRepository,
    TipoCambioSqlRepository,
    tipoCambioRepositoryProvider,
  ],
  exports: [TipoCambioService],
})
export class TipoCambioModule {}
