import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';

import { DatabaseModule }    from './database/database.module';
import { AuthModule }        from './auth/auth.module';
import { UsersModule }       from './modules/users/users.module';
import { RendicionesModule } from './modules/rendiciones/rendiciones.module';

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
  ],
  providers: [
    // JWT aplicado globalmente — usar @Public() para excluir rutas
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Roles aplicado globalmente — usar @Roles(...) para restringir
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
