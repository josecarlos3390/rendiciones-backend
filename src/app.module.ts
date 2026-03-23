import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';

import { DatabaseModule }        from './database/database.module';
import { AuthModule }            from './auth/auth.module';
import { UsersModule }           from './modules/users/users.module';
import { RendicionesModule }     from './modules/rendiciones/rendiciones.module';
import { PerfilesModule }        from './modules/perfiles/perfiles.module';
import { CuentasListaModule }    from './modules/cuentas-lista/cuentas-lista.module';
import { ProvModule }            from './modules/prov/prov.module';
import { CuentasCabeceraModule } from './modules/cuentas-cabecera/cuentas-cabecera.module';
import { PermisosModule }        from './modules/permisos/permisos.module';
import { DocumentosModule }      from './modules/documentos/documentos.module';
import { RendMModule }           from './modules/rend-m/rend-m.module';
import { RendDModule }           from './modules/rend-d/rend-d.module';
import { SapModule }             from './modules/sap/sap.module';
import { AppConfigModule }       from './modules/app-config/app-config.module';
import { OfflineModule }         from './modules/offline/offline.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard }   from './common/guards/roles.guard';

import hanaConfig      from './config/hana.config';
import jwtConfig       from './config/jwt.config';
import appConfig       from './config/app.config';
import sqlserverConfig from './config/sqlserver.config';
import postgresConfig  from './config/postgres.config';
import { loggerConfig } from './config/logger.config';
import { FacturaModule } from './modules/factura/factura.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:    true,
      load:        [hanaConfig, jwtConfig, appConfig, sqlserverConfig, postgresConfig],
      envFilePath: '.env',
    }),
    WinstonModule.forRoot(loggerConfig),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RendicionesModule,
    PerfilesModule,
    CuentasListaModule,
    ProvModule,
    CuentasCabeceraModule,
    PermisosModule,
    DocumentosModule,
    RendMModule,
    RendDModule,
    SapModule,
    AppConfigModule,
    OfflineModule,
    FacturaModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}