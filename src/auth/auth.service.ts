import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import type { DataSource, EntityManager } from 'typeorm';
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
import { withTransaction } from '../utils/database/transaction.util';
import { Optional } from '@nestjs/common';

@Injectable()
export class AuthService {
  /**
   * Instantiate the auth service with repositories and JWT client.
   *
   * @param userRepository Repository handling {@link User} persistence.
   * @param companyRecruiterRepository Repository for {@link CompanyRecruiter} entities.
   * @param jwtService Nest wrapper around JSON Web Token signing and verification.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CompanyRecruiter)
    private readonly companyRecruiterRepository: Repository<CompanyRecruiter>,
    private readonly jwtService: JwtService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Register a new candidate account and immediately issue an access token.
   *
   * @param dto Candidate registration payload.
   * @returns Wrapped success message containing the JWT and sanitized user data.
   * @throws ConflictException When the email is already registered.
   */
  async registerCandidate(
    dto: RegisterUserDto,
  ): Promise<{ message: string; data: AuthTokenPayload }> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });

    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match.');
    }

    const user = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
    });
    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(User) : this.userRepository;
      return repo.save(user);
    });

    const tokenPayload = await this.buildAuthPayload(saved, 'candidate');

    return {
      message: 'Registration successful.',
      data: tokenPayload,
    };
  }

  /**
   * Authenticate a candidate using email/password credentials.
   *
   * @param dto Candidate login payload.
   * @returns Login response with access token and profile metadata.
   * @throws UnauthorizedException When credentials are invalid.
   */
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

  /**
   * Resolve the authenticated user profile from the JWT payload.
   *
   * @param payload Decoded JWT payload injected by the guard.
   * @returns Profile response containing sanitized user info and role metadata.
   * @throws UnauthorizedException When the payload is missing or user no longer exists.
   */
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

  /**
   * Authenticate a recruiter and return token enriched with recruiter membership details.
   *
   * @param dto Recruiter login payload.
   * @returns Login response containing recruiter metadata embedded in the token.
   * @throws UnauthorizedException When credentials are invalid.
   * @throws ForbiddenException When the user has no active recruiter assignment.
   */
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

    const tokenPayload = await this.buildAuthPayload(
      user,
      'recruiter',
      {
        companyId: recruiterRecord.companyId,
        recuiterLevel: recruiterRecord.recuiterLevel,
      },
      recruiterRecord.id,
    );

    return {
      message: 'Login successful.',
      data: tokenPayload,
    };
  }

  /**
   * Construct the common JWT payload and response envelope for authenticated users.
   *
   * @param user Persisted user entity representing the account.
   * @param role Indicates whether the session belongs to a candidate or recruiter.
   * @param recruiterMetadata Optional recruiter details to embed in the payload.
   * @param companyRecruiterId Optional company recruiter mapping ID.
   * @returns Auth token payload consumed by controllers.
   */
  private async buildAuthPayload(
    user: User,
    role: 'candidate' | 'recruiter',
    recruiterMetadata?: { companyId: string; recuiterLevel: RecuiterLevel },
    companyRecruiterId?: string,
  ): Promise<AuthTokenPayload> {
    const sanitized = this.sanitizeUser(user);

    const extendedPayload = recruiterMetadata ? { recruiter: recruiterMetadata } : undefined;

    const token = await this.jwtService.signAsync({
      sub: sanitized.id,
      email: sanitized.email,
      role,
      ...(extendedPayload ?? {}),
      ...(companyRecruiterId ? { companyRecruiterId } : {}),
    });

    const authPayload: AuthTokenPayload = {
      accessToken: token,
      user: sanitized,
      role,
      ...(extendedPayload ?? {}),
    };

    return authPayload;
  }

  /**
   * Remove sensitive fields from the user entity before returning to clients.
   *
   * @param user User entity to sanitize.
   * @returns Safe user projection.
   */
  private sanitizeUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
