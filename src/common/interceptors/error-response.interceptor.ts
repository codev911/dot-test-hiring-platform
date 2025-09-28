import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Normalize thrown exceptions into a consistent error envelope for API consumers.
 */
@Injectable()
export class ErrorResponseInterceptor implements NestInterceptor {
  /**
   * Transform downstream errors before they leave the application boundary.
   *
   * @param _context Execution context from Nest.
   * @param next Stream of handler results.
   * @returns Observable emitting either the original data or a wrapped error.
   */
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpException) {
          const status = error.getStatus();
          const response = error.getResponse();

          const payload =
            typeof response === 'string' ? { error: error.name, message: response } : response;

          return throwError(
            () =>
              new HttpException(
                {
                  statusCode: status,
                  error: error.name,
                  message: this.extractMessage(payload),
                  details: this.extractDetails(payload),
                },
                status,
              ),
          );
        }

        const internalError = new InternalServerErrorException({
          statusCode: 500,
          error: 'InternalServerErrorException',
          message: 'Something went wrong. Please try again later.',
        });

        return throwError(() => internalError);
      }),
    );
  }

  /**
   * Safely read the human-readable message from the caught payload.
   *
   * @param payload Error response payload.
   * @returns Extracted message or default fallback string.
   */
  private extractMessage(payload: unknown): string | string[] {
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const { message } = payload as { message?: unknown };
      if (Array.isArray(message)) {
        const filtered = message.filter((item): item is string => typeof item === 'string');
        if (filtered.length > 0) {
          return filtered;
        }
      }
      if (typeof message === 'string') {
        return message;
      }
    }

    if (typeof payload === 'string') {
      return payload;
    }

    return 'Unexpected error occurred.';
  }

  /**
   * Gather additional metadata from the payload to expose as error details.
   *
   * @param payload Error response payload.
   * @returns Remaining details object or `undefined` when nothing is present.
   */
  private extractDetails(payload: unknown): unknown {
    if (payload && typeof payload === 'object') {
      const clone = { ...payload } as Record<string, unknown>;
      delete clone.message;
      delete clone.statusCode;
      delete clone.error;
      if (Object.keys(clone).length === 0) {
        return undefined;
      }
      return clone;
    }
    return undefined;
  }
}
