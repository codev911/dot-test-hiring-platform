import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { RecuiterLevel } from '../../utils/enums/recuiter-level.enum';
import type { JwtPayload } from '../../utils/types/auth.type';

/**
 * Guard ensuring the requester is an authenticated recruiter with owner level on company ID 1.
 */
@Injectable()
export class RecruiterOwnerGuard implements CanActivate {
  /**
   * @param jwtService Service responsible for verifying access tokens.
   */
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Validate bearer token and verify recruiter owner privileges for company 1.
   *
   * @param context Execution context containing the HTTP request.
   * @returns `true` when authentication and authorization succeed.
   * @throws UnauthorizedException When the token is missing or invalid.
   * @throws ForbiddenException When role/level does not meet requirements.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (payload.role !== 'recruiter') {
        throw new ForbiddenException('Recruiter role required.');
      }

      const level = payload.recruiter?.recuiterLevel;
      const companyId = payload.recruiter?.companyId;

      if (level !== RecuiterLevel.OWNER || companyId !== '1') {
        throw new ForbiddenException('Owner level on company 1 required.');
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
   * Extract bearer token from Authorization header.
   *
   * @param request Express request instance.
   * @returns Token string or `undefined` when not present.
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
