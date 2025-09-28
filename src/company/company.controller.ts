import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateRecruiterDto } from './dto/create-recruiter.dto';
import { CompanyResponseDto, RecruiterCreationResponseDto } from './dto/company-response.dto';
import { RecruiterOwnerGuard } from '../common/guards/recruiter-owner.guard';
import type { CompanyData, RecruiterCreationData } from '../utils/types/company.type';

/**
 * Controller exposing public company info and secured admin actions.
 */
@ApiTags('Company')
@Controller('company')
export class CompanyController {
  /**
   * @param companyService Service orchestrating company operations.
   */
  constructor(private readonly companyService: CompanyService) {}

  /**
   * Publicly accessible company information (static ID 1).
   *
   * @returns Company details.
   */
  @Get()
  @CacheTTL(0) // no-expiry for company info; invalidated on updates
  @ApiOperation({ summary: 'Get public company info (no auth)' })
  @ApiOkResponse({ description: 'Company retrieved successfully.', type: CompanyResponseDto })
  @ApiNotFoundResponse({ description: 'Company not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getCompany(): Promise<{ message: string; data: CompanyData }> {
    const company = await this.companyService.getStaticCompany();
    return { message: 'Company retrieved successfully.', data: company };
  }

  /**
   * Update company information (static ID 1). Requires recruiter owner.
   *
   * @param dto Partial update payload.
   * @returns Updated company details.
   */
  @Patch()
  @ApiOperation({ summary: 'Update company info (owner only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterOwnerGuard)
  @ApiBody({ description: 'Partial company fields to update.', type: UpdateCompanyDto })
  @ApiOkResponse({ description: 'Company updated successfully.', type: CompanyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiForbiddenResponse({ description: 'Owner level on company 1 required.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiNotFoundResponse({ description: 'Company not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async updateCompany(
    @Body() dto: UpdateCompanyDto,
  ): Promise<{ message: string; data: CompanyData }> {
    const updated = await this.companyService.updateStaticCompany(dto);
    return { message: 'Company updated successfully.', data: updated };
  }

  /**
   * Create a new recruiter (manager level) for company ID 1. Requires owner.
   *
   * @param dto Recruiter creation payload.
   * @returns Created mapping and user metadata.
   */
  @Post('recruiter')
  @ApiOperation({ summary: 'Create manager recruiter (owner only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterOwnerGuard)
  @ApiBody({ description: 'New recruiter data (manager level).', type: CreateRecruiterDto })
  @ApiCreatedResponse({
    description: 'Recruiter created successfully.',
    type: RecruiterCreationResponseDto,
  })
  @ApiConflictResponse({ description: 'Email is already registered.' })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiForbiddenResponse({ description: 'Owner level on company 1 required.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiNotFoundResponse({ description: 'Company not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async createRecruiter(
    @Body() dto: CreateRecruiterDto,
  ): Promise<{ message: string; data: RecruiterCreationData }> {
    const result = await this.companyService.createRecruiter(dto);
    return { message: 'Recruiter created successfully.', data: result };
  }
}
