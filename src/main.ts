import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Behind reverse proxies/load balancers we must trust X-Forwarded-* headers
  // so that rate limiting and IP-based logic work correctly.
  app.set('trust proxy', 1);

  // Parse form POSTs (e.g. /api/auth/entry-token from HTML form with application/x-www-form-urlencoded)
  app.use(bodyParser.urlencoded({ extended: true }));

  // Security middleware
  app.use(helmet());

  // CORS: single config, trusted origins only (R-WAPT05 — no Access-Control-Allow-Origin: *)
  const envOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  const devOrigins = [
    'https://grc-reporting-uat.adib.co.eg',
    'https://grc-reporting-node-uat.adib.co.eg',
  ];
  const extraOrigins = [
    process.env.CHART_URL,
    process.env.WEB_SOCKET,
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL2,
  ].filter(Boolean) as string[];
  const fallbackFromEnv = [
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_REPORTING_FRONTEND_URL,
    process.env.NODE_PUBLIC_URL,
  ].filter(Boolean) as string[];
  const corsOrigins = envOrigins?.length
    ? [...new Set([...envOrigins, ...devOrigins, ...extraOrigins])]
    : fallbackFromEnv.length
      ? [...new Set([...fallbackFromEnv.map((o) => o.trim()), ...devOrigins, ...extraOrigins])]
      : [...new Set([...devOrigins, ...extraOrigins])];

  const corsMethods = process.env.CORS_METHODS
    ? process.env.CORS_METHODS.split(',').map((method) => method.trim())
    : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

  const corsAllowedHeaders = process.env.CORS_ALLOWED_HEADERS
    ? process.env.CORS_ALLOWED_HEADERS.split(',').map((header) => header.trim())
    : ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-csrf-token'];

  const corsExposedHeaders = process.env.CORS_EXPOSED_HEADERS
    ? process.env.CORS_EXPOSED_HEADERS.split(',').map((header) => header.trim())
    : ['Content-Range', 'X-Content-Range'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Bank requirement: do not allow wildcard * in production
      if (corsOrigins.indexOf(origin) !== -1) return callback(null, true);
      console.warn('[CORS] Blocked origin:', origin);
      console.warn('[CORS] Allowed origins:', corsOrigins);
      callback(new Error(`Origin ${origin} is not allowed by CORS policy`), false);
    },
    credentials: process.env.CORS_CREDENTIALS === 'true' || process.env.CORS_CREDENTIALS === undefined,
    methods: corsMethods,
    allowedHeaders: [...corsAllowedHeaders, 'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'x-csrf-token'],
    exposedHeaders: corsExposedHeaders,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use((req, res, next) => {
    res.removeHeader('X-Powered-By');
    next();
  });

  // Configure body parser with increased limits
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Error handling middleware
  app.use((err, req, res, next) => {
    if (err.status === 413 || err.type === 'entity.too.large') {
      return res.status(413).json({
        statusCode: 413,
        message: 'File size exceeds the maximum limit of 50MB',
        error: 'Payload Too Large'
      });
    }
    res.status(500).json({
      statusCode: 500,
      message: 'Server Error',
    });
  });

  // CWE-209: Global exception filter — never expose stack traces or sensitive details to client
  app.useGlobalFilters(new AllExceptionsFilter());

  // CWE-20: Strict validation — whitelist strips unknown properties; transform enables type coercion
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    transformOptions: { enableImplicitConversion: true },
  }));

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
