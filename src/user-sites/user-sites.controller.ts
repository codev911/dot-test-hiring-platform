import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';
import { UserWebsite } from '../utils/enums/user-website.enum';
import type { JwtPayload } from '../utils/types/auth.type';
import { UpsertUserSiteDto } from './dto/upsert-user-site.dto';
import { UserSiteResponseDto } from './dto/user-site-response.dto';
import { UserSitesService } from './user-sites.service';
import { CacheTTL } from '@nestjs/cache-manager';

/**
 * Controller responsible for handling user site-related HTTP requests.
 * Each user can have one site per type (LinkedIn, GitHub, Portfolio, etc.).
 */
@ApiTags('User Sites')
@ApiBearerAuth('bearer')
@Controller('user/sites')
@UseGuards(CandidateAuthGuard)
export class UserSitesController {
  constructor(private readonly userSitesService: UserSitesService) {}

  /**
   * Extract user ID from JWT payload.
   *
   * @param request Express request containing JWT payload.
   * @returns User ID from the JWT token.
   * @throws UnauthorizedException When user information is missing.
   */
  private extractUserId(request: Request & { user?: JwtPayload }): string {
    if (!request.user?.sub) {
      throw new UnauthorizedException('User information not found.');
    }
    return request.user.sub;
  }

  /**
   * Upsert a user site (create new or update existing).
   * Each user can only have one site per type.
   */
  @Put()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Upsert user site',
    description:
      'Create a new user site or update existing one based on site type. Each user can have only one site per type.',
  })
  @ApiOkResponse({
    description: 'Site upserted successfully.',
    type: UserSiteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async upsert(
    @Req() request: Request & { user?: JwtPayload },
    @Body() upsertUserSiteDto: UpsertUserSiteDto,
  ): Promise<{ message: string; data: UserSiteResponseDto }> {
    const userId = this.extractUserId(request);
    const site = await this.userSitesService.upsert(userId, upsertUserSiteDto);
    return {
      message: 'Site upserted successfully.',
      data: site as UserSiteResponseDto,
    };
  }

  /**
   * Get all sites for the current user.
   */
  @Get()
  @CacheTTL(300_000)
  @ApiOperation({
    summary: 'Get all user sites',
    description: 'Retrieve all sites for the authenticated user.',
  })
  @ApiOkResponse({
    description: 'Sites retrieved successfully.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Sites retrieved successfully.' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserSiteResponseDto' },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async findAll(
    @Req() request: Request & { user?: JwtPayload },
  ): Promise<{ message: string; data: UserSiteResponseDto[] }> {
    const userId = this.extractUserId(request);
    const sites = await this.userSitesService.findAll(userId);
    return {
      message: 'Sites retrieved successfully.',
      data: sites as UserSiteResponseDto[],
    };
  }

  /**
   * Get a specific site by type for the current user.
   */
  @Get(':siteType')
  @CacheTTL(300_000)
  @ApiOperation({
    summary: 'Get user site by type',
    description: 'Retrieve a specific site by type for the authenticated user.',
  })
  @ApiParam({
    name: 'siteType',
    description: 'Type of the site to retrieve',
    enum: UserWebsite,
  })
  @ApiOkResponse({
    description: 'Site retrieved successfully.',
    type: UserSiteResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiNotFoundResponse({ description: 'Site not found' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async findBySiteType(
    @Req() request: Request & { user?: JwtPayload },
    @Param('siteType') siteType: UserWebsite,
  ): Promise<{ message: string; data: UserSiteResponseDto }> {
    const userId = this.extractUserId(request);
    const site = await this.userSitesService.findBySiteType(userId, siteType);
    return {
      message: 'Site retrieved successfully.',
      data: site as UserSiteResponseDto,
    };
  }

  /**
   * Delete a user site by type.
   */
  @Delete(':siteType')
  @ApiOperation({
    summary: 'Delete user site by type',
    description: 'Delete a specific site by type for the authenticated user.',
  })
  @ApiParam({
    name: 'siteType',
    description: 'Type of the site to delete',
    enum: UserWebsite,
  })
  @ApiOkResponse({
    description: 'Site deleted successfully.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Site deleted successfully.' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiNotFoundResponse({ description: 'Site not found' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async remove(
    @Req() request: Request & { user?: JwtPayload },
    @Param('siteType') siteType: UserWebsite,
  ): Promise<{ message: string }> {
    const userId = this.extractUserId(request);
    await this.userSitesService.remove(userId, siteType);
    return {
      message: 'Site deleted successfully.',
    };
  }
}
