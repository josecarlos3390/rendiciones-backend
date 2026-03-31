import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

const logger = new Logger('Bootstrap');

function validateEnv() {
  const dbType = (process.env.DB_TYPE ?? 'HANA').toUpperCase();

  // Variables requeridas siempre
  const alwaysRequired = ['JWT_SECRET'];

  // Variables requeridas solo en modo HANA (online)
  const hanaRequired = dbType === 'HANA'
    ? ['HANA_HOST', 'HANA_USER', 'HANA_PASSWORD', 'HANA_SCHEMA']
    : [];

  // Variables requeridas solo en modo POSTGRES (offline)
  const pgRequired = dbType === 'POSTGRES'
    ? ['PG_HOST', 'PG_USER', 'PG_PASSWORD', 'PG_DATABASE']
    : [];

  const required = [...alwaysRequired, ...hanaRequired, ...pgRequired];
  const missing  = required.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    throw new Error(`Variables de entorno requeridas no configuradas: ${missing.join(', ')}`);
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
    exceptionFactory: (errors) => {
      const messages = errors.map(e =>
        Object.values(e.constraints ?? {}).join(', '),
      );
      const { BadRequestException } = require('@nestjs/common');
      return new BadRequestException(messages);
    },
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
            /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
            /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
            /^https?:\/\/172\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
            /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin);
          cb(null, allowed);
        },
    credentials:    true,
    allowedHeaders: 'Content-Type, Authorization',
    methods:        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Swagger
  const swaggerCfg = new DocumentBuilder()
    .setTitle('Rendiciones API')
    .setDescription('API del sistema de rendiciones — NestJS + SAP HANA')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerCfg));

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`API:     http://localhost:${port}/api/v1`);
  logger.log(`Swagger: http://localhost:${port}/api/docs`);
  logger.log(`DB:      ${process.env.DB_TYPE ?? 'HANA'}`);
}

bootstrap().catch((err) => {
  logger.error('Error fatal al iniciar la aplicacion', err);
  process.exit(1);
});