jest.unmock('@nestjs/jwt');

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { of, lastValueFrom } from 'rxjs';
import { AppModule } from '../src/app.module';
import { AppController } from '../src/app.controller';
import { SuccessResponseInterceptor } from '../src/common/interceptors/success-response.interceptor';
import type { ExecutionContext } from '@nestjs/common';
import type { CallHandler } from '@nestjs/common';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('applies the success response interceptor to controller output', async () => {
    const controller = app.get<AppController>(AppController);
    const interceptor = app.get<SuccessResponseInterceptor>(SuccessResponseInterceptor);

    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;

    const handler = {
      handle: () => of(controller.getHello()),
    } as CallHandler;

    const result = await lastValueFrom(interceptor.intercept(mockContext, handler));

    expect(result).toEqual({
      statusCode: 200,
      message: 'Request processed successfully.',
      data: 'Service is live!',
    });
  });
});
