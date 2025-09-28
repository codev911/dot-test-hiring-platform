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
  ApiQuery,
  ApiParam,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { UserExperienceService } from './user-experience.service';
import { CreateUserExperienceDto } from './dto/create-user-experience.dto';
import { UpdateUserExperienceDto } from './dto/update-user-experience.dto';
import {
  UserExperiencesListResponseDto,
  UserExperienceResponseDto,
} from './dto/user-experience-response.dto';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';
import type { JwtPayload } from '../utils/types/auth.type';
import type { UserExperienceData } from '../utils/types/user.type';

/**
 * REST controller managing user experience operations.
 */
@ApiTags('User Experiences')
@ApiBearerAuth('bearer')
@UseGuards(CandidateAuthGuard)
@Controller('user/experience')
export class UserExperienceController {
  /**
   * @param userExperienceService Service orchestrating user experience activities.
   */
  constructor(private readonly userExperienceService: UserExperienceService) {}

  /**
   * Create a new experience for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param createUserExperienceDto Data for creating the experience.
   * @returns Response containing the created experience.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user experience' })
  @ApiCreatedResponse({
    description: 'User experience created successfully.',
    type: UserExperienceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async create(
    @Req() request: Request & { user?: JwtPayload },
    @Body() createUserExperienceDto: CreateUserExperienceDto,
  ): Promise<{ message: string; data: UserExperienceData }> {
    const userId = this.extractUserId(request);
    const experience = await this.userExperienceService.create(userId, createUserExperienceDto);
    return {
      message: 'User experience created successfully.',
      data: experience,
    };
  }

  /**
   * Retrieve paginated list of experiences for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param page Page number (default: 1).
   * @param limit Number of items per page (default: 10).
   * @returns Paginated list of user experiences.
   */
  @Get()
  @ApiOperation({ summary: 'Get paginated list of user experiences' })
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
    description: 'User experiences retrieved successfully.',
    type: UserExperiencesListResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async findAll(
    @Req() request: Request & { user?: JwtPayload },
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<{
    message: string;
    data: UserExperienceData[];
    pagination: { page: number; limit: number; totalData: number; totalPage: number };
  }> {
    const userId = this.extractUserId(request);
    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedLimit = Math.min(50, Math.max(1, Number(limit) || 10));

    const result = await this.userExperienceService.findAll(
      userId,
      normalizedPage,
      normalizedLimit,
    );
    return {
      message: 'User experiences retrieved successfully.',
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
   * Retrieve a specific experience for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the experience.
   * @returns The requested user experience.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user experience by ID' })
  @ApiParam({ name: 'id', description: 'User experience ID' })
  @ApiOkResponse({
    description: 'User experience retrieved successfully.',
    type: UserExperienceResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User experience not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async findOne(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
  ): Promise<{ message: string; data: UserExperienceData }> {
    const userId = this.extractUserId(request);
    const experience = await this.userExperienceService.findOne(userId, id);
    return {
      message: 'User experience retrieved successfully.',
      data: experience,
    };
  }

  /**
   * Update a specific experience for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the experience to update.
   * @param updateUserExperienceDto Data for updating the experience.
   * @returns Response containing the updated experience.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user experience' })
  @ApiParam({ name: 'id', description: 'User experience ID' })
  @ApiOkResponse({
    description: 'User experience updated successfully.',
    type: UserExperienceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiNotFoundResponse({ description: 'User experience not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async update(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
    @Body() updateUserExperienceDto: UpdateUserExperienceDto,
  ): Promise<{ message: string; data: UserExperienceData }> {
    const userId = this.extractUserId(request);
    const experience = await this.userExperienceService.update(userId, id, updateUserExperienceDto);
    return {
      message: 'User experience updated successfully.',
      data: experience,
    };
  }

  /**
   * Remove a specific experience for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the experience to remove.
   * @returns Success message.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user experience' })
  @ApiParam({ name: 'id', description: 'User experience ID' })
  @ApiOkResponse({ description: 'User experience deleted successfully.' })
  @ApiNotFoundResponse({ description: 'User experience not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async remove(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const userId = this.extractUserId(request);
    await this.userExperienceService.remove(userId, id);
    return {
      message: 'User experience deleted successfully.',
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
