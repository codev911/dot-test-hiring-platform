import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

/**
 * Guard ensuring requests include a valid bearer token before reaching controllers.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  /**
   * @param jwtService Service responsible for verifying access tokens.
   */
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Validate the bearer token and attach the decoded payload to the request object.
   *
   * @param context Execution context containing the HTTP request.
   * @returns `true` when authentication succeeds.
   * @throws UnauthorizedException When the token is missing or invalid.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: Record<string, unknown> }>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(token);
      request.user = payload;
      return true;
    } catch {
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
