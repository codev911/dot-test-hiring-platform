import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { RecruiterOwnerGuard } from '../../../src/common/guards/recruiter-owner.guard';
import { RecuiterLevel } from '../../../src/utils/enums/recuiter-level.enum';
import type { JwtPayload } from '../../../src/utils/types/auth.type';

describe('RecruiterOwnerGuard', () => {
  let guard: RecruiterOwnerGuard;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    guard = new RecruiterOwnerGuard(jwtService);
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

  it('allows access for recruiter owner of company 1', async () => {
    const payload: JwtPayload = {
      sub: 'user-1',
      email: 'owner@example.com',
      role: 'recruiter',
      recruiter: { companyId: '1', recuiterLevel: RecuiterLevel.OWNER },
    };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const context = mockContext({ authorization: 'Bearer valid-token' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual(payload);
  });

  it('throws UnauthorizedException when no token', async () => {
    const context = mockContext();
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when token invalid', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('bad'));
    const context = mockContext({ authorization: 'Bearer invalid' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws ForbiddenException when role is candidate', async () => {
    const payload: JwtPayload = { sub: '1', email: 'c@e.com', role: 'candidate' };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const context = mockContext({ authorization: 'Bearer valid-token' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException when recruiter level is not owner', async () => {
    const payload: JwtPayload = {
      sub: '2',
      email: 'manager@example.com',
      role: 'recruiter',
      recruiter: { companyId: '1', recuiterLevel: RecuiterLevel.MANAGER },
    };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const context = mockContext({ authorization: 'Bearer valid' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException when companyId is not 1', async () => {
    const payload: JwtPayload = {
      sub: '3',
      email: 'owner@other.com',
      role: 'recruiter',
      recruiter: { companyId: '2', recuiterLevel: RecuiterLevel.OWNER },
    };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const context = mockContext({ authorization: 'Bearer valid' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
