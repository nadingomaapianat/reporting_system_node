import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception-filter';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as bodyParser from 'body-parser';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Add CSP header
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    );
    next();
  });

  app.use((req, res, next) => {
    // إزالة الرأس X-Powered-By
    res.removeHeader('X-Powered-By');
    next();
  });

  // Configure body parser with increased limits
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Configure express to handle large payloads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({ 
    origin: [process.env.CHART_URL, process.env.WEB_SOCKET, process.env.FRONTEND_URL, process.env.FRONTEND_URL2], // Replace with your frontend URLs
    credentials: true,  
  });

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
  });
}

bootstrap();
