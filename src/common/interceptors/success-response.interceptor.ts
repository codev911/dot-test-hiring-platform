import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { PaginationShape, StructuredResponse } from '../../utils/types/response.type';

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload: unknown) => {
        const httpContext = context.switchToHttp();
        const response = httpContext.getResponse<Response>();
        const statusCode = response?.statusCode ?? HttpStatus.OK;

        if (this.isBinaryStream(payload)) {
          return payload;
        }

        const structured = this.extractStructuredResponse(payload);
        const message = structured.message ?? this.resolveMessage(statusCode);
        const pagination = this.normalizePagination(structured.pagination);

        const result: Record<string, unknown> = {
          statusCode,
          message,
        };

        if (structured.data !== undefined) {
          result.data = structured.data;
        }

        if (pagination) {
          result.pagination = pagination;
        }

        return result;
      }),
    );
  }

  private isBinaryStream(payload: unknown): boolean {
    return payload instanceof Buffer;
  }

  private extractStructuredResponse(payload: unknown): StructuredResponse {
    if (payload === undefined) {
      return {};
    }

    if (payload && typeof payload === 'object') {
      const cloned = { ...(payload as Record<string, unknown>) };

      const message = typeof cloned.message === 'string' ? cloned.message : undefined;
      if (message !== undefined) {
        delete cloned.message;
      }

      const pagination = this.extractPagination(cloned);
      if (pagination) {
        delete cloned.pagination;
        delete cloned.page;
        delete cloned.limit;
        delete cloned.totalData;
        delete cloned.totalPage;
      }

      const data = this.determineData(cloned);

      return {
        message,
        data,
        pagination,
      };
    }

    return {
      data: payload,
    };
  }

  private determineData(cloned: Record<string, unknown>): unknown {
    if (Object.keys(cloned).length === 0) {
      return undefined;
    }

    if ('data' in cloned) {
      const value = cloned.data;
      delete cloned.data;
      if (Object.keys(cloned).length === 0) {
        return value;
      }

      return { ...cloned, data: value };
    }

    return cloned;
  }

  private extractPagination(source: Record<string, unknown>): Partial<PaginationShape> | undefined {
    if (source.pagination && typeof source.pagination === 'object') {
      const pagination = source.pagination as Record<string, unknown>;
      return this.normalizePagination(pagination);
    }

    const inlinePagination: Partial<PaginationShape> = {};
    if (typeof source.page === 'number') {
      inlinePagination.page = source.page;
    }
    if (typeof source.limit === 'number') {
      inlinePagination.limit = source.limit;
    }
    if (typeof source.totalData === 'number') {
      inlinePagination.totalData = source.totalData;
    }
    if (typeof source.totalPage === 'number') {
      inlinePagination.totalPage = source.totalPage;
    }

    return Object.keys(inlinePagination).length > 0 ? inlinePagination : undefined;
  }

  private normalizePagination(pagination?: Partial<PaginationShape>): PaginationShape | undefined {
    if (!pagination) {
      return undefined;
    }

    const { page, limit, totalData, totalPage } = pagination;

    if (
      typeof page === 'number' &&
      typeof limit === 'number' &&
      typeof totalData === 'number' &&
      typeof totalPage === 'number'
    ) {
      return { page, limit, totalData, totalPage };
    }

    return undefined;
  }

  private resolveMessage(status: number): string {
    const httpStatus = status as HttpStatus;

    if (httpStatus === HttpStatus.CREATED) {
      return 'Resource created successfully.';
    }

    if (httpStatus === HttpStatus.ACCEPTED) {
      return 'Request accepted for processing.';
    }

    return 'Request processed successfully.';
  }
}
