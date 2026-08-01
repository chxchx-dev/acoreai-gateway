import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  [extra: string]: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  private resolveMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) return 'Error interno del servidor';
    const response = exception.getResponse();
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const msg = (response as { message: unknown }).message;
      return Array.isArray(msg) ? msg.join(', ') : String(msg);
    }
    return exception.message;
  }

  /**
   * Campos extra que algunos servicios agregan al cuerpo de la excepción
   * (p. ej. `code`/`activeDevice` en el 409 de sesión única) para que el
   * cliente pueda reaccionar sin parsear el mensaje. `statusCode`/`message`
   * ya se calculan aparte, así que se excluyen para no pisarlos.
   */
  private resolveExtra(exception: unknown): Record<string, unknown> {
    if (!(exception instanceof HttpException)) return {};
    const response = exception.getResponse();
    if (typeof response !== 'object' || response === null) return {};

    const { statusCode: _statusCode, message: _message, error: _error, ...extra } = response as Record<
      string,
      unknown
    >;
    return extra;
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.resolveMessage(exception);

    if (response.headersSent) {
      this.logger.warn(
        `${request.method} ${request.url} -> ${status} after headers were sent: ${message}`,
      );
      if (!response.writableEnded) response.end();
      return;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponse = {
      ...this.resolveExtra(exception),
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }
}
