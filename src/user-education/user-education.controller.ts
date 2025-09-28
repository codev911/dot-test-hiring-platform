import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiBadRequestResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UserEducationService } from './user-education.service';
import { CreateUserEducationDto } from './dto/create-user-education.dto';
import { UpdateUserEducationDto } from './dto/update-user-education.dto';
import {
  UserEducationsListResponseDto,
  UserEducationResponseDto,
} from './dto/user-education-response.dto';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';
import type { JwtPayload } from '../utils/types/auth.type';
import type { UserEducationData } from '../utils/types/user.type';

/**
 * REST controller managing user education operations.
 */
@ApiTags('User Education')
@ApiBearerAuth('bearer')
@UseGuards(CandidateAuthGuard)
@Controller('user/education')
export class UserEducationController {
  /**
   * @param userEducationService Service orchestrating user education activities.
   */
  constructor(private readonly userEducationService: UserEducationService) {}

  /**
   * Create a new education for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param createUserEducationDto Data for creating the education.
   * @returns Response containing the created education.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user education' })
  @ApiCreatedResponse({
    description: 'User education created successfully.',
    type: UserEducationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async create(
    @Req() request: Request & { user?: JwtPayload },
    @Body() createUserEducationDto: CreateUserEducationDto,
  ): Promise<{ message: string; data: UserEducationData }> {
    const userId = this.extractUserId(request);
    const education = await this.userEducationService.create(userId, createUserEducationDto);
    return {
      message: 'User education created successfully.',
      data: education,
    };
  }

  /**
   * Retrieve paginated list of educations for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param page Page number (default: 1).
   * @param limit Number of items per page (default: 10).
   * @returns Paginated list of user educations.
   */
  @Get()
  @ApiOperation({ summary: 'Get paginated list of user educations' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 50)',
  })
  @ApiOkResponse({
    description: 'User educations retrieved successfully.',
    type: UserEducationsListResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async findAll(
    @Req() request: Request & { user?: JwtPayload },
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<{
    message: string;
    data: UserEducationData[];
    pagination: { page: number; limit: number; totalData: number; totalPage: number };
  }> {
    const userId = this.extractUserId(request);
    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedLimit = Math.min(50, Math.max(1, Number(limit) || 10));

    const result = await this.userEducationService.findAll(userId, normalizedPage, normalizedLimit);
    return {
      message: 'User educations retrieved successfully.',
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalData: result.totalData,
        totalPage: result.totalPage,
      },
    };
  }

  /**
   * Retrieve a specific education for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the education.
   * @returns The requested user education.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user education by ID' })
  @ApiParam({ name: 'id', description: 'User education ID' })
  @ApiOkResponse({
    description: 'User education retrieved successfully.',
    type: UserEducationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User education not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async findOne(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
  ): Promise<{ message: string; data: UserEducationData }> {
    const userId = this.extractUserId(request);
    const education = await this.userEducationService.findOne(userId, id);
    return {
      message: 'User education retrieved successfully.',
      data: education,
    };
  }

  /**
   * Update a specific education for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the education to update.
   * @param updateUserEducationDto Data for updating the education.
   * @returns Response containing the updated education.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user education' })
  @ApiParam({ name: 'id', description: 'User education ID' })
  @ApiOkResponse({
    description: 'User education updated successfully.',
    type: UserEducationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiNotFoundResponse({ description: 'User education not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async update(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
    @Body() updateUserEducationDto: UpdateUserEducationDto,
  ): Promise<{ message: string; data: UserEducationData }> {
    const userId = this.extractUserId(request);
    const education = await this.userEducationService.update(userId, id, updateUserEducationDto);
    return {
      message: 'User education updated successfully.',
      data: education,
    };
  }

  /**
   * Remove a specific education for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the education to remove.
   * @returns Success message.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user education' })
  @ApiParam({ name: 'id', description: 'User education ID' })
  @ApiOkResponse({ description: 'User education deleted successfully.' })
  @ApiNotFoundResponse({ description: 'User education not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async remove(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const userId = this.extractUserId(request);
    await this.userEducationService.remove(userId, id);
    return {
      message: 'User education deleted successfully.',
    };
  }

  /**
   * Resolve the authenticated user's identifier from the request scope.
   *
   * @param request Express request object containing the JWT payload.
   * @returns User identifier extracted from the JWT subject claim.
   * @throws UnauthorizedException When the payload is unavailable.
   */
  private extractUserId(request: Request & { user?: JwtPayload }): string {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    return userId;
  }
}
