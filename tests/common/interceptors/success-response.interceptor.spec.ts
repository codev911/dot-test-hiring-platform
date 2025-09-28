import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { lastValueFrom, of } from 'rxjs';
import { SuccessResponseInterceptor } from '../../../src/common/interceptors/success-response.interceptor';

describe('SuccessResponseInterceptor', () => {
  const createContext = (statusCode: number): ExecutionContext => {
    const response = { statusCode } as Response;
    return {
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  };

  it('wraps plain data with default message and status', async () => {
    const interceptor = new SuccessResponseInterceptor();
    const context = createContext(HttpStatus.OK);
    const handler = {
      handle: () => of({ foo: 'bar' }),
    } as CallHandler;

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({
      statusCode: HttpStatus.OK,
      message: 'Request processed successfully.',
      data: { foo: 'bar' },
    });
  });

  it('uses provided message and pagination metadata when present', async () => {
    const interceptor = new SuccessResponseInterceptor();
    const context = createContext(HttpStatus.CREATED);
    const handler = {
      handle: () =>
        of({
          message: 'Created',
          data: { id: 1 },
          pagination: { page: 1, limit: 10, totalData: 1, totalPage: 1 },
        }),
    } as CallHandler;

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({
      statusCode: HttpStatus.CREATED,
      message: 'Created',
      data: { id: 1 },
      pagination: { page: 1, limit: 10, totalData: 1, totalPage: 1 },
    });
  });

  it('falls back to default message for created responses when message missing', async () => {
    const interceptor = new SuccessResponseInterceptor();
    const context = createContext(HttpStatus.CREATED);
    const handler = {
      handle: () => of({ id: 42 }),
    } as CallHandler;

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({
      statusCode: HttpStatus.CREATED,
      message: 'Resource created successfully.',
      data: { id: 42 },
    });
  });

  it('extracts inline pagination keys', async () => {
    const interceptor = new SuccessResponseInterceptor();
    const context = createContext(HttpStatus.OK);
    const handler = {
      handle: () =>
        of({
          message: 'List',
          page: 2,
          limit: 5,
          totalData: 40,
          totalPage: 8,
          data: ['a', 'b'],
        }),
    } as CallHandler;

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({
      statusCode: HttpStatus.OK,
      message: 'List',
      data: ['a', 'b'],
      pagination: { page: 2, limit: 5, totalData: 40, totalPage: 8 },
    });
  });

  it('ignores invalid pagination shapes', async () => {
    const interceptor = new SuccessResponseInterceptor();
    const context = createContext(HttpStatus.OK);
    const handler = {
      handle: () => of({ message: 'List', pagination: { page: 1, limit: 10 } }),
    } as CallHandler;

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({
      statusCode: HttpStatus.OK,
      message: 'List',
      data: { pagination: { page: 1, limit: 10 } },
    });
  });

  it('retains nested data while merging remaining keys', async () => {
    const interceptor = new SuccessResponseInterceptor();
    const context = createContext(HttpStatus.OK);
    const handler = {
      handle: () =>
        of({
          data: [1, 2, 3],
          extra: 'value',
        }),
    } as CallHandler;

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({
      statusCode: HttpStatus.OK,
      message: 'Request processed successfully.',
      data: { extra: 'value', data: [1, 2, 3] },
    });
  });

  it('omits data property when handler returns undefined', async () => {
    const interceptor = new SuccessResponseInterceptor();
    const context = createContext(HttpStatus.ACCEPTED);
    const handler = {
      handle: () => of(undefined),
    } as CallHandler;

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({
      statusCode: HttpStatus.ACCEPTED,
      message: 'Request accepted for processing.',
    });
  });

  it('returns binary buffers untouched', async () => {
    const interceptor = new SuccessResponseInterceptor();
    const context = createContext(HttpStatus.OK);
    const buffer = Buffer.from('hello');
    const handler = {
      handle: () => of(buffer),
    } as CallHandler;

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toBe(buffer);
  });
});
