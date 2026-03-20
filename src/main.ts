import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

const logger = new Logger('Bootstrap');

function validateEnv() {
  const dbType  = (process.env.DB_TYPE  ?? 'HANA').toUpperCase();
  const appMode = (process.env.APP_MODE ?? 'ONLINE').toUpperCase();

  const base: string[] = ['JWT_SECRET'];

  const byEngine: Record<string, string[]> = {
    HANA:      ['HANA_HOST', 'HANA_USER', 'HANA_PASSWORD', 'HANA_SCHEMA'],
    SQLSERVER: ['SQL_HOST',  'SQL_USER',  'SQL_PASSWORD',  'SQL_DATABASE'],
    POSTGRES:  ['PG_HOST',   'PG_USER',   'PG_PASSWORD',   'PG_DATABASE'],
  };

  const bySapMode: Record<string, string[]> = {
    ONLINE:  ['SAP_SL_URL', 'SAP_SL_USER', 'SAP_SL_PASSWORD', 'SAP_SL_COMPANY'],
    OFFLINE: [],
  };

  const required = [
    ...base,
    ...(byEngine[dbType]    ?? []),
    ...(bySapMode[appMode]  ?? []),
  ];

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Variables de entorno requeridas para DB_TYPE=${dbType} APP_MODE=${appMode}: ${missing.join(', ')}`,
    );
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1', {
    exclude: ['api/docs', 'api/docs-json', 'api/docs/(.*)'],
  });

  // Validacion global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist:            true,
    forbidNonWhitelisted: true,
    transform:            true,
  }));

  // Filtro global de errores
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Logging de requests
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS — produccion requiere FRONTEND_URL, desarrollo permite IPs locales
  const isProduction  = process.env.NODE_ENV === 'production';
  const allowedOrigin = process.env.FRONTEND_URL;

  if (isProduction && !allowedOrigin) {
    throw new Error('FRONTEND_URL es requerida en produccion.');
  }

  app.enableCors({
    origin: allowedOrigin
      ? allowedOrigin
      : (origin: string | undefined, cb: (e: Error | null, allow?: boolean) => void) => {
          const allowed =
            !origin ||
            /^http:\/\/localhost(:\d+)?$/.test(origin) ||
            /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
            /^http:\/\/172\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
            /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin);
          cb(null, allowed);
        },
    credentials:    true,
    allowedHeaders: 'Content-Type, Authorization',
    methods:        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Swagger
  const swaggerCfg = new DocumentBuilder()
    .setTitle('Rendiciones API')
    .setDescription('API del sistema de rendiciones')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerCfg));

  const port    = process.env.PORT     ?? 3000;
  const dbType  = process.env.DB_TYPE  ?? 'HANA';
  const appMode = process.env.APP_MODE ?? 'ONLINE';

  await app.listen(port, '0.0.0.0');

  logger.log(`API:     http://localhost:${port}/api/v1`);
  logger.log(`Swagger: http://localhost:${port}/api/docs`);
  logger.log(`DB:      ${dbType}`);
  logger.log(`Mode:    ${appMode}`);
}

bootstrap().catch((err) => {
  logger.error('Error fatal al iniciar la aplicacion', err);
  process.exit(1);
});