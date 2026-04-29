import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Parse form POSTs (e.g. /api/auth/entry-token from HTML form with application/x-www-form-urlencoded)
  app.use(bodyParser.urlencoded({ extended: true }));

  // Security middleware
  app.use(helmet());
  
  // CORS: env CORS_ORIGINS (comma-separated) or fallback for dev
  const envOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  const devOrigins = [
    'https://reporting-demo-system-frontend.pianat.ai',
    'https://reporting-demo-system-python.pianat.ai',
    'https://reporting-ubm-system-frontend.comply.now',
    'https://backendnode-ubm-reporting.comply.now',
    'https://reporting-ubm-system-python.comply.now',
    'https://ubm.comply.now',
    'https://dcc-ubm.comply.now',
    'https://backend-ubm-compliance.comply.now',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  // When CORS_ORIGINS not set, use FRONTEND_URL / NODE_PUBLIC_URL from .env so links are env-driven
  const fallbackFromEnv = [
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_REPORTING_FRONTEND_URL,
    process.env.NODE_PUBLIC_URL,
  ].filter(Boolean) as string[];
  const corsOrigins = envOrigins?.length
    ? [...new Set([...envOrigins, ...devOrigins])]
    : fallbackFromEnv.length
      ? [...new Set([...fallbackFromEnv.map((o) => o.trim()), ...devOrigins])]
      : [...devOrigins];
  
  const corsMethods = process.env.CORS_METHODS
    ? process.env.CORS_METHODS.split(',').map(method => method.trim())
    : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
  
  const corsAllowedHeaders = process.env.CORS_ALLOWED_HEADERS
    ? process.env.CORS_ALLOWED_HEADERS.split(',').map(header => header.trim())
    : ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-csrf-token'];
  
  const corsExposedHeaders = process.env.CORS_EXPOSED_HEADERS
    ? process.env.CORS_EXPOSED_HEADERS.split(',').map(header => header.trim())
    : ['Content-Range', 'X-Content-Range'];
  
  const isOpenMode = (process.env.REPORTING_OPEN_MODE || '').toLowerCase() === 'true';
  console.log('[CORS] Allowed origins:', corsOrigins);
  console.log('[CORS] OPEN_MODE:', isOpenMode);

  app.enableCors({
    origin: function (origin, callback) {
      // No Origin header (same-origin, curl, server-to-server) is always allowed.
      if (!origin) return callback(null, true);

      // In open mode reflect any origin instead of throwing – we want this server
      // reachable from the parent compliance app, the reporting frontend, and
      // anywhere it may be embedded without re-deploying for each env change.
      if (isOpenMode || corsOrigins.includes('*')) {
        return callback(null, true);
      }

      if (corsOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      // IMPORTANT: do NOT pass an Error here – it surfaces as a 500 with no
      // Access-Control-Allow-Origin header, which the browser reports as a
      // generic "Failed to fetch". `false` lets cors return a clean 403/null.
      console.warn('[CORS] Blocked origin:', origin, 'allowed:', corsOrigins);
      return callback(null, false);
    },
    credentials: process.env.CORS_CREDENTIALS === 'true' || process.env.CORS_CREDENTIALS === undefined,
    methods: corsMethods,
    allowedHeaders: [...corsAllowedHeaders, 'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'x-csrf-token'],
    exposedHeaders: corsExposedHeaders,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use((req, res, next) => {
    // إزالة الرأس X-Powered-By
    res.removeHeader('X-Powered-By');
    next();
  });

  // Configure body parser with increased limits
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Configure body parser for large payloads (already set above with 50mb limit)

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

 
  app.useGlobalPipes(new ValidationPipe());

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');
  
  // console.log(`🚀 Real-time API server running on port ${port}`);
  // console.log(`📊 WebSocket server ready for real-time updates`);
}

bootstrap();
