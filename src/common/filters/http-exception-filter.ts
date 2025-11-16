import { Catch, ArgumentsHost, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();

    // Prepare a log message
    const logMessage = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: 'Sorry, Server Error..try again later',
    };

    // Log the exception
    console.error(
      `Exception thrown: ${exception.message} - ${exception.name}: ${exception.message} [${request.method} ${request.url}]`,
      exception.stack
    );

    // Check if the exception is a BadRequestException (validation errors)
    if (exception instanceof BadRequestException) {
      const validationErrors = (exceptionResponse as any).message || exceptionResponse;
      return response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: validationErrors,
      });
    }

    response.status(status).json(logMessage);
  }
}

