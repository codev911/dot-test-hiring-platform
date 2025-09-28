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
import { UserSkillService } from './user-skill.service';
import { CacheTTL } from '@nestjs/cache-manager';
import { CreateUserSkillDto } from './dto/create-user-skill.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';
import { UserSkillsListResponseDto, UserSkillResponseDto } from './dto/user-skill-response.dto';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';
import type { JwtPayload } from '../utils/types/auth.type';
import type { UserSkillData } from '../utils/types/user.type';

/**
 * REST controller managing user skill operations.
 */
@ApiTags('User Skills')
@ApiBearerAuth('bearer')
@UseGuards(CandidateAuthGuard)
@Controller('user/skill')
export class UserSkillController {
  /**
   * @param userSkillService Service orchestrating user skill activities.
   */
  constructor(private readonly userSkillService: UserSkillService) {}

  /**
   * Create a new skill for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param createUserSkillDto Data for creating the skill.
   * @returns Response containing the created skill.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user skill' })
  @ApiCreatedResponse({
    description: 'User skill created successfully.',
    type: UserSkillResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async create(
    @Req() request: Request & { user?: JwtPayload },
    @Body() createUserSkillDto: CreateUserSkillDto,
  ): Promise<{ message: string; data: UserSkillData }> {
    const userId = this.extractUserId(request);
    const skill = await this.userSkillService.create(userId, createUserSkillDto);
    return {
      message: 'User skill created successfully.',
      data: skill,
    };
  }

  /**
   * Retrieve paginated list of skills for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param page Page number (default: 1).
   * @param limit Number of items per page (default: 10).
   * @returns Paginated list of user skills.
   */
  @Get()
  @CacheTTL(300_000)
  @ApiOperation({ summary: 'Get paginated list of user skills' })
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
    description: 'User skills retrieved successfully.',
    type: UserSkillsListResponseDto,
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
    data: UserSkillData[];
    pagination: { page: number; limit: number; totalData: number; totalPage: number };
  }> {
    const userId = this.extractUserId(request);
    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedLimit = Math.min(50, Math.max(1, Number(limit) || 10));

    const result = await this.userSkillService.findAll(userId, normalizedPage, normalizedLimit);
    return {
      message: 'User skills retrieved successfully.',
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
   * Retrieve a specific skill for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the skill.
   * @returns The requested user skill.
   */
  @Get(':id')
  @CacheTTL(300_000)
  @ApiOperation({ summary: 'Get a specific user skill by ID' })
  @ApiParam({ name: 'id', description: 'User skill ID' })
  @ApiOkResponse({ description: 'User skill retrieved successfully.', type: UserSkillResponseDto })
  @ApiNotFoundResponse({ description: 'User skill not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async findOne(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
  ): Promise<{ message: string; data: UserSkillData }> {
    const userId = this.extractUserId(request);
    const skill = await this.userSkillService.findOne(userId, id);
    return {
      message: 'User skill retrieved successfully.',
      data: skill,
    };
  }

  /**
   * Update a specific skill for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the skill to update.
   * @param updateUserSkillDto Data for updating the skill.
   * @returns Response containing the updated skill.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user skill' })
  @ApiParam({ name: 'id', description: 'User skill ID' })
  @ApiOkResponse({ description: 'User skill updated successfully.', type: UserSkillResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiNotFoundResponse({ description: 'User skill not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async update(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
    @Body() updateUserSkillDto: UpdateUserSkillDto,
  ): Promise<{ message: string; data: UserSkillData }> {
    const userId = this.extractUserId(request);
    const skill = await this.userSkillService.update(userId, id, updateUserSkillDto);
    return {
      message: 'User skill updated successfully.',
      data: skill,
    };
  }

  /**
   * Remove a specific skill for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the skill to remove.
   * @returns Success message.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user skill' })
  @ApiParam({ name: 'id', description: 'User skill ID' })
  @ApiOkResponse({ description: 'User skill deleted successfully.' })
  @ApiNotFoundResponse({ description: 'User skill not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async remove(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const userId = this.extractUserId(request);
    await this.userSkillService.remove(userId, id);
    return {
      message: 'User skill deleted successfully.',
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
