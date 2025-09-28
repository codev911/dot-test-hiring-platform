import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { lastValueFrom, throwError } from 'rxjs';
import { ErrorResponseInterceptor } from '../../../src/common/interceptors/error-response.interceptor';

describe('ErrorResponseInterceptor', () => {
  const createContext = (): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getResponse: () => ({}) as unknown,
      }),
    } as unknown as ExecutionContext;
  };

  it('passes through HttpException with normalized payload', async () => {
    const interceptor = new ErrorResponseInterceptor();
    const context = createContext();
    const handler = {
      handle: () => throwError(() => new HttpException('Not found', HttpStatus.NOT_FOUND)),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, handler)).catch((error) => {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect((error as HttpException).getResponse()).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'HttpException',
        message: 'Not found',
        details: undefined,
      });
    });
  });

  it('wraps unknown errors into internal server error', async () => {
    const interceptor = new ErrorResponseInterceptor();
    const context = createContext();
    const handler = {
      handle: () => throwError(() => new Error('boom')),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, handler)).catch((error) => {
      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect((error as InternalServerErrorException).getResponse()).toEqual({
        statusCode: 500,
        error: 'InternalServerErrorException',
        message: 'Something went wrong. Please try again later.',
      });
    });
  });

  it('normalises object payload with message array and details', async () => {
    const interceptor = new ErrorResponseInterceptor();
    const context = createContext();
    const handler = {
      handle: () =>
        throwError(
          () =>
            new HttpException(
              {
                statusCode: 422,
                error: 'Unprocessable Entity',
                message: ['first error', 'second error'],
                validationErrors: [{ field: 'email', message: 'invalid' }],
              },
              HttpStatus.UNPROCESSABLE_ENTITY,
            ),
        ),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, handler)).catch((error) => {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect((error as HttpException).getResponse()).toEqual({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'HttpException',
        message: ['first error', 'second error'],
        details: { validationErrors: [{ field: 'email', message: 'invalid' }] },
      });
    });
  });

  it('falls back to generic message when none provided', async () => {
    const interceptor = new ErrorResponseInterceptor();
    const context = createContext();
    const handler = {
      handle: () =>
        throwError(
          () =>
            new HttpException(
              {
                statusCode: 400,
                error: 'Bad Request',
              },
              HttpStatus.BAD_REQUEST,
            ),
        ),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, handler)).catch((error) => {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'HttpException',
        message: 'Unexpected error occurred.',
        details: undefined,
      });
    });
  });

  it('handles string payload as message', async () => {
    const interceptor = new ErrorResponseInterceptor();
    const context = createContext();
    const handler = {
      handle: () =>
        throwError(() => new HttpException('String error message', HttpStatus.BAD_REQUEST)),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, handler)).catch((error) => {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'HttpException',
        message: 'String error message',
        details: undefined,
      });
    });
  });

  it('extracts message from string payload directly', () => {
    const interceptor = new ErrorResponseInterceptor();
    const extractMessageSpy = jest.spyOn(interceptor as any, 'extractMessage');

    const result = (interceptor as any).extractMessage('Direct string message');

    expect(result).toBe('Direct string message');
    expect(extractMessageSpy).toHaveReturnedWith('Direct string message');

    extractMessageSpy.mockRestore();
  });

  it('returns undefined details for non-object payload', async () => {
    const interceptor = new ErrorResponseInterceptor();
    const context = createContext();
    const handler = {
      handle: () => throwError(() => new HttpException('String error', HttpStatus.BAD_REQUEST)),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, handler)).catch((error) => {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'HttpException',
        message: 'String error',
        details: undefined,
      });
    });
  });

  it('returns undefined details for null payload', async () => {
    const interceptor = new ErrorResponseInterceptor();
    const context = createContext();
    const handler = {
      handle: () => throwError(() => new HttpException(null as any, HttpStatus.BAD_REQUEST)),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, handler)).catch((error) => {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'HttpException',
        message: 'Unexpected error occurred.',
        details: undefined,
      });
    });
  });
});
