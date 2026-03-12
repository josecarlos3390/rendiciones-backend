import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';

import { DatabaseModule }    from './database/database.module';
import { AuthModule }        from './auth/auth.module';
import { UsersModule }       from './modules/users/users.module';
import { RendicionesModule } from './modules/rendiciones/rendiciones.module';
import { PerfilesModule }      from './modules/perfiles/perfiles.module';
import { CuentasListaModule }    from './modules/cuentas-lista/cuentas-lista.module';
import { CuentasCabeceraModule } from './modules/cuentas-cabecera/cuentas-cabecera.module';
import { PermisosModule }         from './modules/permisos/permisos.module';
import { DocumentosModule }       from './modules/documentos/documentos.module';
import { RendMModule }            from './modules/rend-m/rend-m.module';
import { RendDModule }            from './modules/rend-d/rend-d.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard }   from './common/guards/roles.guard';

import hanaConfig from './config/hana.config';
import jwtConfig  from './config/jwt.config';
import appConfig  from './config/app.config';
import { loggerConfig } from './config/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:    true,
      load:        [hanaConfig, jwtConfig, appConfig],
      envFilePath: '.env',
    }),
    WinstonModule.forRoot(loggerConfig),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RendicionesModule,
    PerfilesModule,
    CuentasListaModule,
    CuentasCabeceraModule,
    PermisosModule,
    DocumentosModule,
    RendMModule,
    RendDModule,
  ],
  providers: [
    // JWT aplicado globalmente — usar @Public() para excluir rutas
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Roles aplicado globalmente — usar @Roles(...) para restringir
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
