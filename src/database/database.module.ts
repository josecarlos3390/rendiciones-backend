import { Module, Global } from '@nestjs/common';
import { ConfigService }  from '@nestjs/config';
import { HanaService }      from './hana.service';
import { SqlServerService } from './sqlserver.service';
import { PostgresService }  from './postgres.service';
import { DATABASE_SERVICE } from './interfaces/database.interface';

@Global()
@Module({
  providers: [
    HanaService,
    SqlServerService,
    PostgresService,
    {
      provide:  DATABASE_SERVICE,
      inject:   [ConfigService, HanaService, SqlServerService, PostgresService],
      useFactory: (
        config:    ConfigService,
        hana:      HanaService,
        sqlServer: SqlServerService,
        postgres:  PostgresService,
      ) => {
        const dbType = config.get<string>('app.dbType', 'HANA').toUpperCase();
        switch (dbType) {
          case 'SQLSERVER': return sqlServer;
          case 'POSTGRES':  return postgres;
          default:          return hana;
        }
      },
    },
  ],
  exports: [DATABASE_SERVICE],
})
export class DatabaseModule {}