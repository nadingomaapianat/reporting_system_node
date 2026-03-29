import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorSanitizer } from '../utils/error-sanitizer.util';

/**
 * Global exception filter for ALL unhandled exceptions (CWE-209 remediation).
 * Prevents sensitive information leakage from unhandled errors.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production' || !process.env.NODE_ENV;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessage = 'Unknown error';
    let errorStack: string | undefined;

    if (exception instanceof Error) {
      errorMessage = exception.message;
      errorStack = exception.stack;
    } else if (typeof exception === 'string') {
      errorMessage = exception;
    }

    this.logger.error(
      `Unhandled exception: ${errorMessage} [${request.method} ${request.url}]`,
      errorStack || 'No stack trace available',
    );

    const sanitizedMessage = ErrorSanitizer.sanitize(errorMessage, this.isProduction);

    const safeResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: sanitizedMessage,
    };

    response.status(status).json(safeResponse);
  }
}
