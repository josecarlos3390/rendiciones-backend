import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RendicionesService }         from './rendiciones.service';
import { RendicionesController }      from './rendiciones.controller';
import { RendicionesHanaRepository }  from './repositories/rendiciones.hana.repository';
import { RendicionesSqlRepository }   from './repositories/rendiciones.sql.repository';

/**
 * Para cambiar de HANA a SQL:
 *   1. Implementar RendicionesSqlRepository
 *   2. Cambiar DB_TYPE=SQL en .env
 *   Nada mas cambia.
 */
@Module({
  controllers: [RendicionesController],
  providers: [
    RendicionesService,
    RendicionesHanaRepository,
    RendicionesSqlRepository,
    {
      provide: 'RENDICIONES_REPOSITORY',
      inject:  [ConfigService, RendicionesHanaRepository, RendicionesSqlRepository],
      useFactory: (
        config: ConfigService,
        hanaRepo: RendicionesHanaRepository,
        sqlRepo:  RendicionesSqlRepository,
      ) => {
        const dbType = config.get<string>('app.dbType', 'HANA');
        return dbType === 'SQL' ? sqlRepo : hanaRepo;
      },
    },
  ],
})
export class RendicionesModule {}
