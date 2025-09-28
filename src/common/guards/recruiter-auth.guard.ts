import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from '../../utils/types/auth.type';

/**
 * Guard ensuring requests include a valid bearer token and user has recruiter role.
 */
@Injectable()
export class RecruiterAuthGuard implements CanActivate {
  /**
   * @param jwtService Service responsible for verifying access tokens.
   */
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Validate the bearer token and ensure user has recruiter role.
   *
   * @param context Execution context containing the HTTP request.
   * @returns `true` when authentication and role validation succeeds.
   * @throws UnauthorizedException When the token is missing or invalid.
   * @throws ForbiddenException When user role is not 'recruiter'.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      // Check if user has recruiter role
      if (payload.role !== 'recruiter') {
        throw new ForbiddenException('Recruiter role required.');
      }

      // Ensure companyRecruiterId is present
      if (!payload.companyRecruiterId) {
        throw new UnauthorizedException('Invalid recruiter token: missing company recruiter ID.');
      }

      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }

  /**
   * Read the bearer token from the `Authorization` header if present.
   *
   * @param request Express request instance.
   * @returns The token string or `undefined` when not provided.
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }
}
