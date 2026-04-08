import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

function validateEnv() {
  const dbType = (process.env.DB_TYPE ?? 'HANA').toUpperCase();

  const alwaysRequired = ['JWT_SECRET'];

  const hanaRequired = dbType === 'HANA'
    ? ['HANA_HOST', 'HANA_USER', 'HANA_PASSWORD', 'HANA_SCHEMA']
    : [];

  const pgRequired = dbType === 'POSTGRES'
    ? ['PG_HOST', 'PG_USER', 'PG_PASSWORD', 'PG_DATABASE']
    : [];

  const required = [...alwaysRequired, ...hanaRequired, ...pgRequired];
  const missing  = required.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    throw new Error(`Faltan variables ENV: ${missing.join(', ')}`);
  }
}

// 🔥 Hooks globales (capturan TODO)
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION:', err);
});

async function bootstrap() {
  try {
    console.log('1️⃣ Validando ENV...');
    validateEnv();

    console.log('2️⃣ Creando app...');
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    console.log('3️⃣ Configurando logger...');
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

    console.log('4️⃣ Shutdown hooks...');
    app.enableShutdownHooks();

    console.log('5️⃣ Prefix global...');
    app.setGlobalPrefix('api/v1', {
      exclude: ['api/docs', 'api/docs-json', 'api/docs/(.*)'],
    });

    console.log('6️⃣ Pipes...');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    console.log('7️⃣ Filters...');
    app.useGlobalFilters(new GlobalExceptionFilter());

    console.log('8️⃣ Interceptors...');
    app.useGlobalInterceptors(new LoggingInterceptor());

    console.log('9️⃣ CORS...');
    const isProduction  = process.env.NODE_ENV === 'production';
    const allowedOrigin = process.env.FRONTEND_URL;

    if (isProduction && !allowedOrigin) {
      throw new Error('FRONTEND_URL es requerida en produccion.');
    }

    // Configuración segura de CORS
    const corsOrigins = isProduction
      ? [allowedOrigin]
      : allowedOrigin
        ? [allowedOrigin]
        : ['http://localhost:4200', 'http://127.0.0.1:4200', 'http://localhost:3000'];

    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    console.log('🔟 Swagger...');
    const swaggerCfg = new DocumentBuilder()
      .setTitle('Rendiciones API')
      .setDescription('API del sistema de rendiciones')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerCfg);
    SwaggerModule.setup('api/docs', app, document);

    console.log('11️⃣ Levantando servidor...');
    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');

    console.log('✅ APP CORRIENDO');
    console.log(`👉 API:     http://localhost:${port}/api/v1`);
    console.log(`👉 Swagger: http://localhost:${port}/api/docs`);
    console.log(`👉 DB:      ${process.env.DB_TYPE ?? 'HANA'}`);

  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ ERROR EN BOOTSTRAP:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

void bootstrap();