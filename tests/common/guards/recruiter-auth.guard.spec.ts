import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { RecruiterAuthGuard } from '../../../src/common/guards/recruiter-auth.guard';
import type { JwtPayload } from '../../../src/utils/types/auth.type';

describe('RecruiterAuthGuard', () => {
  let guard: RecruiterAuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    guard = new RecruiterAuthGuard(jwtService);
  });

  afterEach(() => jest.clearAllMocks());

  const mockContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const request: Partial<Request> = { headers };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  };

  it('allows access with valid recruiter token that has companyRecruiterId', async () => {
    const payload: JwtPayload = {
      sub: 'u1',
      email: 'rec@example.com',
      role: 'recruiter',
      companyRecruiterId: 'cr1',
    };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const context = mockContext({ authorization: 'Bearer valid' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid');
    const req = context.switchToHttp().getRequest();
    expect((req as any).user).toEqual(payload);
  });

  it('throws Unauthorized when header missing or malformed', async () => {
    await expect(guard.canActivate(mockContext())).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard.canActivate(mockContext({ authorization: 'Token abc' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws Forbidden when role is not recruiter', async () => {
    const payload: JwtPayload = { sub: 'u1', email: 'x', role: 'candidate' } as any;
    jwtService.verifyAsync.mockResolvedValue(payload);
    await expect(
      guard.canActivate(mockContext({ authorization: 'Bearer x' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws Unauthorized when companyRecruiterId missing', async () => {
    const payload: JwtPayload = { sub: 'u1', email: 'x', role: 'recruiter' } as any;
    jwtService.verifyAsync.mockResolvedValue(payload);
    await expect(
      guard.canActivate(mockContext({ authorization: 'Bearer x' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps unknown errors to Unauthorized', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('boom'));
    await expect(
      guard.canActivate(mockContext({ authorization: 'Bearer bad' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
