import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CompanyRecruiter } from '../entities/company-recruiter.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import {
  type AuthenticatedUser,
  type AuthTokenPayload,
  type JwtPayload,
  type AuthProfilePayload,
} from '../utils/types/auth.type';
import type { RecuiterLevel } from '../utils/enums/recuiter-level.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CompanyRecruiter)
    private readonly companyRecruiterRepository: Repository<CompanyRecruiter>,
    private readonly jwtService: JwtService,
  ) {}

  async registerCandidate(
    dto: RegisterUserDto,
  ): Promise<{ message: string; data: AuthTokenPayload }> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });

    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    const user = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
    });

    const saved = await this.userRepository.save(user);

    const tokenPayload = await this.buildAuthPayload(saved, 'candidate');

    return {
      message: 'Registration successful.',
      data: tokenPayload,
    };
  }

  async loginCandidate(dto: LoginDto): Promise<{ message: string; data: AuthTokenPayload }> {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });

    if (!user || !user.comparePassword(dto.password)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokenPayload = await this.buildAuthPayload(user, 'candidate');

    return {
      message: 'Login successful.',
      data: tokenPayload,
    };
  }

  async getProfile(payload?: JwtPayload): Promise<{ message: string; data: AuthProfilePayload }> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Authentication required.');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });

    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }

    return {
      message: 'Profile retrieved.',
      data: {
        user: this.sanitizeUser(user),
        role: payload.role,
        ...(payload.recruiter ? { recruiter: payload.recruiter } : {}),
      },
    };
  }

  async loginRecruiter(dto: LoginDto): Promise<{ message: string; data: AuthTokenPayload }> {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });

    if (!user || !user.comparePassword(dto.password)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const recruiterRecord = await this.companyRecruiterRepository.findOne({
      where: {
        recruiterId: user.id,
        is_active: true,
      },
      relations: ['companyIdRel'],
    });

    if (!recruiterRecord || !recruiterRecord.companyId || recruiterRecord.is_active !== true) {
      throw new ForbiddenException('User is not registered as a recruiter.');
    }

    const tokenPayload = await this.buildAuthPayload(user, 'recruiter', {
      companyId: recruiterRecord.companyId,
      recuiterLevel: recruiterRecord.recuiterLevel,
    });

    return {
      message: 'Login successful.',
      data: tokenPayload,
    };
  }

  private async buildAuthPayload(
    user: User,
    role: 'candidate' | 'recruiter',
    recruiterMetadata?: { companyId: string; recuiterLevel: RecuiterLevel },
  ): Promise<AuthTokenPayload> {
    const sanitized = this.sanitizeUser(user);

    const extendedPayload = recruiterMetadata ? { recruiter: recruiterMetadata } : undefined;

    const token = await this.jwtService.signAsync({
      sub: sanitized.id,
      email: sanitized.email,
      role,
      ...(extendedPayload ?? {}),
    });

    const authPayload: AuthTokenPayload = {
      accessToken: token,
      user: sanitized,
      role,
      ...(extendedPayload ?? {}),
    };

    return authPayload;
  }

  private sanitizeUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
