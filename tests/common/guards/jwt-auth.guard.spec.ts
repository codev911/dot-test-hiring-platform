import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let jwtService: jest.Mocked<JwtService>;
  let guard: JwtAuthGuard;

  const createContext = (headers: Record<string, string | undefined> = {}): ExecutionContext => {
    const request = {
      headers,
    } as unknown as Request;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    guard = new JwtAuthGuard(jwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when token missing', async () => {
    const context = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws when token invalid', async () => {
    const context = createContext({ authorization: 'Bearer invalid' });
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when authorization header is not Bearer', async () => {
    const context = createContext({ authorization: 'Basic abcdef' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('attaches payload and returns true for valid token', async () => {
    const request = {
      headers: { authorization: 'Bearer valid-token' },
    } as unknown as Request & { user?: unknown };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    const payload = { sub: '1' };
    jwtService.verifyAsync.mockResolvedValue(payload);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(payload);
  });
});
