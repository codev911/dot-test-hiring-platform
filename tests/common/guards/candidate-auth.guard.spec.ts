import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { CandidateAuthGuard } from '../../../src/common/guards/candidate-auth.guard';
import type { JwtPayload } from '../../../src/utils/types/auth.type';

describe('CandidateAuthGuard', () => {
  let guard: CandidateAuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    guard = new CandidateAuthGuard(jwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const request: Partial<Request> = {
      headers,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  it('allows access when valid candidate token provided', async () => {
    const payload: JwtPayload = {
      sub: 'user-1',
      email: 'user@example.com',
      role: 'candidate',
    };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const context = mockContext({ authorization: 'Bearer valid-token' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual(payload);
  });

  it('throws UnauthorizedException when no authorization header', async () => {
    const context = mockContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when no Bearer token', async () => {
    const context = mockContext({ authorization: 'Invalid token-format' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when token verification fails', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
    const context = mockContext({ authorization: 'Bearer invalid-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('invalid-token');
  });

  it('throws ForbiddenException when user role is not candidate', async () => {
    const payload: JwtPayload = {
      sub: 'user-1',
      email: 'user@example.com',
      role: 'recruiter', // Not a candidate
    };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const context = mockContext({ authorization: 'Bearer valid-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
  });

  it('preserves ForbiddenException when role validation fails', async () => {
    const payload: JwtPayload = {
      sub: 'user-1',
      email: 'user@example.com',
      role: 'recruiter', // Valid role but not candidate
    };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const context = mockContext({ authorization: 'Bearer valid-token' });

    await expect(guard.canActivate(context)).rejects.toThrow('Candidate role required.');
  });
});
