import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import {
  AuthService,
  type AuthTokenPayload,
  type AuthProfilePayload,
  type JwtPayload,
} from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  registerCandidate(
    @Body() dto: RegisterUserDto,
  ): Promise<{ message: string; data: AuthTokenPayload }> {
    return this.authService.registerCandidate(dto);
  }

  @Post('login')
  loginCandidate(@Body() dto: LoginDto): Promise<{ message: string; data: AuthTokenPayload }> {
    return this.authService.loginCandidate(dto);
  }

  @Post('recruiter/login')
  loginRecruiter(@Body() dto: LoginDto): Promise<{ message: string; data: AuthTokenPayload }> {
    return this.authService.loginRecruiter(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(
    @Req() request: Request & { user?: JwtPayload },
  ): Promise<{ message: string; data: AuthProfilePayload }> {
    return this.authService.getProfile(request.user);
  }
}
