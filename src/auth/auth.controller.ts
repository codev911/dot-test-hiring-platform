import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { AuthTokenPayload, AuthProfilePayload, JwtPayload } from '../utils/types/auth.type';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthProfileResponseDto, AuthResponseDto } from './dto/auth-response.dto';
import { RecuiterLevel } from '../utils/enums/recuiter-level.enum';

const candidateSuccessExample = {
  message: 'Registration successful.',
  data: {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    user: {
      id: '1',
      email: 'candidate@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    },
    role: 'candidate' as const,
  },
};

const recruiterSuccessExample = {
  message: 'Login successful.',
  data: {
    accessToken: 'eyJhbGc...recruiter',
    user: {
      id: '10',
      email: 'recruiter@example.com',
      firstName: 'Rina',
      lastName: 'Smith',
    },
    role: 'recruiter' as const,
    recruiter: {
      companyId: '55',
      recuiterLevel: RecuiterLevel.MANAGER,
    },
  },
};

const profileExample = {
  message: 'Profile retrieved.',
  data: {
    user: {
      id: '1',
      email: 'candidate@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    },
    role: 'candidate' as const,
  },
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiBody({ type: RegisterUserDto })
  @ApiCreatedResponse({
    description: 'Candidate registered.',
    type: AuthResponseDto,
    content: {
      'application/json': {
        example: candidateSuccessExample,
      },
    },
  })
  @ApiConflictResponse({ description: 'Email is already registered.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  registerCandidate(
    @Body() dto: RegisterUserDto,
  ): Promise<{ message: string; data: AuthTokenPayload }> {
    return this.authService.registerCandidate(dto);
  }

  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Candidate login successful.',
    type: AuthResponseDto,
    content: {
      'application/json': {
        example: { ...candidateSuccessExample, message: 'Login successful.' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  loginCandidate(@Body() dto: LoginDto): Promise<{ message: string; data: AuthTokenPayload }> {
    return this.authService.loginCandidate(dto);
  }

  @Post('recruiter/login')
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Recruiter login successful.',
    type: AuthResponseDto,
    content: {
      'application/json': {
        example: recruiterSuccessExample,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  @ApiForbiddenResponse({ description: 'User is not registered as a recruiter.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  loginRecruiter(@Body() dto: LoginDto): Promise<{ message: string; data: AuthTokenPayload }> {
    return this.authService.loginRecruiter(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: 'Authenticated user profile.',
    type: AuthProfileResponseDto,
    content: {
      'application/json': {
        example: profileExample,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  getProfile(
    @Req() request: Request & { user?: JwtPayload },
  ): Promise<{ message: string; data: AuthProfilePayload }> {
    return this.authService.getProfile(request.user);
  }
}
