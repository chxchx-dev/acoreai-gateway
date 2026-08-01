import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { ObservabilityService } from './observability.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly observability: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const start = Date.now();
    const method = request.method;
    const route = this.resolveRoute(context, request);
    let errorKind: string | undefined;

    return next.handle().pipe(
      catchError((err: unknown) => {
        errorKind = this.resolveErrorKind(err);
        this.observability.incrementError('http', errorKind);
        return throwError(() => err);
      }),
      finalize(() => {
        const statusCode = String(response.statusCode);
        this.observability.observeHttp(
          method,
          route,
          statusCode,
          Date.now() - start,
        );

        if (!errorKind && response.statusCode >= 500) {
          this.observability.incrementError('http', statusCode);
        }
      }),
    );
  }

  private resolveRoute(context: ExecutionContext, request: Request): string {
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    return `${controller}.${handler}:${request.path}`;
  }

  private resolveErrorKind(err: unknown): string {
    if (
      typeof err === 'object' &&
      err !== null &&
      'getStatus' in err &&
      typeof err.getStatus === 'function'
    ) {
      return String(err.getStatus());
    }

    return err instanceof Error ? err.name : 'UnknownError';
  }
}
