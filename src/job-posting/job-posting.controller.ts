import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JobPostingService } from './job-posting.service';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto';
import {
  JobPostingResponseDto,
  JobPostingWithCompanyResponseDto,
  PaginatedJobPostingsResponseDto,
} from './dto/job-posting-response.dto';
import {
  JobBenefitResponseDto,
  JobBenefitsResponseDto,
  JobRequirementResponseDto,
  JobRequirementsResponseDto,
  JobSkillResponseDto,
  JobSkillsResponseDto,
} from './dto/benefit-requirement-skill-response.dto';
import { RecruiterAuthGuard } from '../common/guards/recruiter-auth.guard';
import type { Request as ExpressRequest } from 'express';
import type { JwtPayload } from '../utils/types/auth.type';
import type { JobType } from '../utils/enums/job-type.enum';
import type { JobLocation } from '../utils/enums/job-location.enum';
import type { FiatCurrency } from '../utils/enums/fiat-currency.enum';
import type {
  JobPostingData,
  JobPostingWithCompanyData,
  PaginatedJobPostingsData,
  JobSearchFilters,
} from '../utils/types/job.type';
import type { JobBenefitData, JobRequirementData, JobSkillData } from '../utils/types/job.type';
import { CreateJobBenefitDto } from './dto/create-job-benefit.dto';
import { UpdateJobBenefitDto } from './dto/update-job-benefit.dto';
import { CreateJobRequirementDto } from './dto/create-job-requirement.dto';
import { UpdateJobRequirementDto } from './dto/update-job-requirement.dto';
import { CreateJobSkillDto } from './dto/create-job-skill.dto';
import { UpdateJobSkillDto } from './dto/update-job-skill.dto';

/**
 * Controller for job posting management (recruiter side) and public job discovery.
 */
@ApiTags('Job Posting')
@Controller('job-posting')
export class JobPostingController {
  /**
   * @param jobPostingService Service orchestrating job posting operations.
   */
  constructor(private readonly jobPostingService: JobPostingService) {}

  /**
   * Create a new job posting (recruiter only).
   *
   * @param request Express request with authenticated recruiter.
   * @param dto Job posting creation payload.
   * @returns Created job posting data.
   */
  @Post()
  @ApiOperation({ summary: 'Create job posting (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiBody({ description: 'Job posting creation data.', type: CreateJobPostingDto })
  @ApiCreatedResponse({
    description: 'Job posting created successfully.',
    type: JobPostingResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required.' })
  @ApiNotFoundResponse({ description: 'Recruiter mapping not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async createJobPosting(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Body() dto: CreateJobPostingDto,
  ): Promise<{ message: string; data: JobPostingData }> {
    const jobPosting = await this.jobPostingService.createJobPosting(
      request.user.companyRecruiterId!,
      dto,
    );
    return { message: 'Job posting created successfully.', data: jobPosting };
  }

  /**
   * Get all job postings for the authenticated recruiter.
   *
   * @param request Express request with authenticated recruiter.
   * @param page Page number (default: 1).
   * @param limit Items per page (default: 10).
   * @returns Paginated job postings for the recruiter.
   */
  @Get('listing')
  @ApiOperation({ summary: 'Get recruiter job listings (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiOkResponse({
    description: 'Job postings retrieved successfully.',
    type: PaginatedJobPostingsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getRecruiterJobPostings(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ message: string; data: PaginatedJobPostingsData }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const result = await this.jobPostingService.getRecruiterJobPostings(
      request.user.companyRecruiterId!,
      pageNum,
      limitNum,
    );
    return { message: 'Job postings retrieved successfully.', data: result };
  }

  /**
   * Get a specific job posting by ID for the authenticated recruiter.
   *
   * @param request Express request with authenticated recruiter.
   * @param jobId Job posting ID.
   * @returns Job posting with full details.
   */
  @Get('listing/:jobId')
  @ApiOperation({ summary: 'Get recruiter job listing by ID (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiOkResponse({
    description: 'Job posting retrieved successfully.',
    type: JobPostingWithCompanyResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job posting not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getRecruiterJobPosting(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
  ): Promise<{ message: string; data: JobPostingWithCompanyData }> {
    const jobPosting = await this.jobPostingService.getRecruiterJobPosting(
      request.user.companyRecruiterId!,
      jobId,
    );
    return { message: 'Job posting retrieved successfully.', data: jobPosting };
  }

  /**
   * Update a job posting owned by the authenticated recruiter.
   *
   * @param request Express request with authenticated recruiter.
   * @param jobId Job posting ID.
   * @param dto Job posting update payload.
   * @returns Updated job posting data.
   */
  @Patch(':jobId')
  @ApiOperation({ summary: 'Update job posting (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiBody({ description: 'Job posting update data.', type: UpdateJobPostingDto })
  @ApiOkResponse({
    description: 'Job posting updated successfully.',
    type: JobPostingResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job posting not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async updateJobPosting(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
    @Body() dto: UpdateJobPostingDto,
  ): Promise<{ message: string; data: JobPostingData }> {
    const jobPosting = await this.jobPostingService.updateJobPosting(
      request.user.companyRecruiterId!,
      jobId,
      dto,
    );
    return { message: 'Job posting updated successfully.', data: jobPosting };
  }

  /**
   * Delete a job posting owned by the authenticated recruiter.
   *
   * @param request Express request with authenticated recruiter.
   * @param jobId Job posting ID.
   * @returns Success confirmation.
   */
  @Delete(':jobId')
  @ApiOperation({ summary: 'Delete job posting (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiOkResponse({ description: 'Job posting deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job posting not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async deleteJobPosting(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
  ): Promise<{ message: string }> {
    await this.jobPostingService.deleteJobPosting(request.user.companyRecruiterId!, jobId);
    return { message: 'Job posting deleted successfully.' };
  }

  /**
   * Get published job postings with search filters (public access).
   *
   * @param query Search query for title or description.
   * @param location Location filter.
   * @param employmentType Employment type filter.
   * @param workLocationType Work location type filter.
   * @param salaryMin Minimum salary filter.
   * @param salaryMax Maximum salary filter.
   * @param salaryCurrency Salary currency filter.
   * @param companyId Company ID filter.
   * @param skills Skills filter (comma-separated).
   * @param page Page number (default: 1).
   * @param limit Items per page (default: 10).
   * @returns Paginated published job postings.
   */
  @Get('public')
  @ApiOperation({ summary: 'Get published job postings (public access)' })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search query for title or description',
  })
  @ApiQuery({ name: 'location', required: false, description: 'Location filter' })
  @ApiQuery({ name: 'employmentType', required: false, description: 'Employment type filter' })
  @ApiQuery({ name: 'workLocationType', required: false, description: 'Work location type filter' })
  @ApiQuery({ name: 'salaryMin', required: false, description: 'Minimum salary filter' })
  @ApiQuery({ name: 'salaryMax', required: false, description: 'Maximum salary filter' })
  @ApiQuery({ name: 'salaryCurrency', required: false, description: 'Salary currency filter' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Company ID filter' })
  @ApiQuery({ name: 'skills', required: false, description: 'Skills filter (comma-separated)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiOkResponse({
    description: 'Published job postings retrieved successfully.',
    type: PaginatedJobPostingsResponseDto,
  })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getPublishedJobPostings(
    @Query('query') query?: string,
    @Query('location') location?: string,
    @Query('employmentType') employmentType?: JobType,
    @Query('workLocationType') workLocationType?: JobLocation,
    @Query('salaryMin') salaryMin?: string,
    @Query('salaryMax') salaryMax?: string,
    @Query('salaryCurrency') salaryCurrency?: FiatCurrency,
    @Query('companyId') companyId?: string,
    @Query('skills') skills?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ message: string; data: PaginatedJobPostingsData }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const filters: JobSearchFilters = {
      query,
      location,
      employmentType,
      workLocationType,
      salaryMin: salaryMin ? parseInt(salaryMin, 10) : undefined,
      salaryMax: salaryMax ? parseInt(salaryMax, 10) : undefined,
      salaryCurrency,
      companyId,
      skills: skills ? skills.split(',').map((s) => s.trim()) : undefined,
    };

    const result = await this.jobPostingService.getPublishedJobPostings(filters, pageNum, limitNum);
    return { message: 'Published job postings retrieved successfully.', data: result };
  }

  /**
   * Get a specific published job posting by ID or slug (public access).
   *
   * @param identifier Job posting ID or slug.
   * @returns Job posting with full details.
   */
  @Get('public/:identifier')
  @ApiOperation({ summary: 'Get published job posting by ID or slug (public access)' })
  @ApiParam({ name: 'identifier', description: 'Job posting ID or slug' })
  @ApiOkResponse({
    description: 'Published job posting retrieved successfully.',
    type: JobPostingWithCompanyResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Job posting not found or not published.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getPublishedJobPosting(
    @Param('identifier') identifier: string,
  ): Promise<{ message: string; data: JobPostingWithCompanyData }> {
    const jobPosting = await this.jobPostingService.getPublishedJobPosting(identifier);
    return { message: 'Published job posting retrieved successfully.', data: jobPosting };
  }

  // ===== JOB BENEFIT MANAGEMENT =====

  /**
   * Create a new job benefit for a job posting (recruiter only).
   *
   * @param request Express request with authenticated recruiter.
   * @param jobId Job posting ID.
   * @param dto Benefit creation payload.
   * @returns Created job benefit data.
   */
  @Post(':jobId/benefits')
  @ApiOperation({ summary: 'Create job benefit (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiBody({ description: 'Job benefit creation data.', type: CreateJobBenefitDto })
  @ApiCreatedResponse({
    description: 'Job benefit created successfully.',
    type: JobBenefitResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job posting not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async createJobBenefit(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
    @Body() dto: CreateJobBenefitDto,
  ): Promise<{ message: string; data: JobBenefitData }> {
    const benefit = await this.jobPostingService.createJobBenefit(
      request.user.companyRecruiterId!,
      jobId,
      dto,
    );
    return { message: 'Job benefit created successfully.', data: benefit };
  }

  /**
   * Get all job benefits for a job posting (recruiter only).
   *
   * @param request Express request with authenticated recruiter.
   * @param jobId Job posting ID.
   * @returns Array of job benefits.
   */
  @Get(':jobId/benefits')
  @ApiOperation({ summary: 'Get job benefits (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiOkResponse({
    description: 'Job benefits retrieved successfully.',
    type: JobBenefitsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job posting not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getJobBenefits(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
  ): Promise<{ message: string; data: JobBenefitData[] }> {
    const benefits = await this.jobPostingService.getJobBenefits(
      request.user.companyRecruiterId!,
      jobId,
    );
    return { message: 'Job benefits retrieved successfully.', data: benefits };
  }

  /**
   * Update a job benefit (recruiter only).
   *
   * @param request Express request with authenticated recruiter.
   * @param jobId Job posting ID.
   * @param benefitId Benefit ID.
   * @param dto Update payload.
   * @returns Updated job benefit data.
   */
  @Patch(':jobId/benefits/:benefitId')
  @ApiOperation({ summary: 'Update job benefit (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiParam({ name: 'benefitId', description: 'Job benefit ID' })
  @ApiBody({ description: 'Job benefit update data.', type: UpdateJobBenefitDto })
  @ApiOkResponse({ description: 'Job benefit updated successfully.', type: JobBenefitResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job benefit not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async updateJobBenefit(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
    @Param('benefitId') benefitId: string,
    @Body() dto: UpdateJobBenefitDto,
  ): Promise<{ message: string; data: JobBenefitData }> {
    const benefit = await this.jobPostingService.updateJobBenefit(
      request.user.companyRecruiterId!,
      jobId,
      benefitId,
      dto,
    );
    return { message: 'Job benefit updated successfully.', data: benefit };
  }

  /**
   * Delete a job benefit (recruiter only).
   *
   * @param request Express request with authenticated recruiter.
   * @param jobId Job posting ID.
   * @param benefitId Benefit ID.
   * @returns Success confirmation.
   */
  @Delete(':jobId/benefits/:benefitId')
  @ApiOperation({ summary: 'Delete job benefit (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiParam({ name: 'benefitId', description: 'Job benefit ID' })
  @ApiOkResponse({ description: 'Job benefit deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job benefit not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async deleteJobBenefit(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
    @Param('benefitId') benefitId: string,
  ): Promise<{ message: string }> {
    await this.jobPostingService.deleteJobBenefit(
      request.user.companyRecruiterId!,
      jobId,
      benefitId,
    );
    return { message: 'Job benefit deleted successfully.' };
  }

  // ===== JOB REQUIREMENT MANAGEMENT =====

  /**
   * Create a new job requirement for a job posting (recruiter only).
   */
  @Post(':jobId/requirements')
  @ApiOperation({ summary: 'Create job requirement (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiBody({ description: 'Job requirement creation data.', type: CreateJobRequirementDto })
  @ApiCreatedResponse({
    description: 'Job requirement created successfully.',
    type: JobRequirementResponseDto,
  })
  async createJobRequirement(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
    @Body() dto: CreateJobRequirementDto,
  ): Promise<{ message: string; data: JobRequirementData }> {
    const requirement = await this.jobPostingService.createJobRequirement(
      request.user.companyRecruiterId!,
      jobId,
      dto,
    );
    return { message: 'Job requirement created successfully.', data: requirement };
  }

  /**
   * Get all job requirements for a job posting (recruiter only).
   */
  @Get(':jobId/requirements')
  @ApiOperation({ summary: 'Get job requirements (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiOkResponse({
    description: 'Job requirements retrieved successfully.',
    type: JobRequirementsResponseDto,
  })
  async getJobRequirements(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
  ): Promise<{ message: string; data: JobRequirementData[] }> {
    const requirements = await this.jobPostingService.getJobRequirements(
      request.user.companyRecruiterId!,
      jobId,
    );
    return { message: 'Job requirements retrieved successfully.', data: requirements };
  }

  /**
   * Update a job requirement (recruiter only).
   */
  @Patch(':jobId/requirements/:requirementId')
  @ApiOperation({ summary: 'Update job requirement (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiParam({ name: 'requirementId', description: 'Job requirement ID' })
  @ApiBody({ description: 'Job requirement update data.', type: UpdateJobRequirementDto })
  @ApiOkResponse({
    description: 'Job requirement updated successfully.',
    type: JobRequirementResponseDto,
  })
  async updateJobRequirement(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
    @Param('requirementId') requirementId: string,
    @Body() dto: UpdateJobRequirementDto,
  ): Promise<{ message: string; data: JobRequirementData }> {
    const requirement = await this.jobPostingService.updateJobRequirement(
      request.user.companyRecruiterId!,
      jobId,
      requirementId,
      dto,
    );
    return { message: 'Job requirement updated successfully.', data: requirement };
  }

  /**
   * Delete a job requirement (recruiter only).
   */
  @Delete(':jobId/requirements/:requirementId')
  @ApiOperation({ summary: 'Delete job requirement (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiParam({ name: 'requirementId', description: 'Job requirement ID' })
  @ApiOkResponse({ description: 'Job requirement deleted successfully.' })
  async deleteJobRequirement(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
    @Param('requirementId') requirementId: string,
  ): Promise<{ message: string }> {
    await this.jobPostingService.deleteJobRequirement(
      request.user.companyRecruiterId!,
      jobId,
      requirementId,
    );
    return { message: 'Job requirement deleted successfully.' };
  }

  // ===== JOB SKILL MANAGEMENT =====

  /**
   * Create a new job skill for a job posting (recruiter only).
   */
  @Post(':jobId/skills')
  @ApiOperation({ summary: 'Create job skill (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiBody({ description: 'Job skill creation data.', type: CreateJobSkillDto })
  @ApiCreatedResponse({ description: 'Job skill created successfully.', type: JobSkillResponseDto })
  async createJobSkill(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
    @Body() dto: CreateJobSkillDto,
  ): Promise<{ message: string; data: JobSkillData }> {
    const skill = await this.jobPostingService.createJobSkill(
      request.user.companyRecruiterId!,
      jobId,
      dto,
    );
    return { message: 'Job skill created successfully.', data: skill };
  }

  /**
   * Get all job skills for a job posting (recruiter only).
   */
  @Get(':jobId/skills')
  @ApiOperation({ summary: 'Get job skills (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiOkResponse({ description: 'Job skills retrieved successfully.', type: JobSkillsResponseDto })
  async getJobSkills(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
  ): Promise<{ message: string; data: JobSkillData[] }> {
    const skills = await this.jobPostingService.getJobSkills(
      request.user.companyRecruiterId!,
      jobId,
    );
    return { message: 'Job skills retrieved successfully.', data: skills };
  }

  /**
   * Update a job skill (recruiter only).
   */
  @Patch(':jobId/skills/:skillId')
  @ApiOperation({ summary: 'Update job skill (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiParam({ name: 'skillId', description: 'Job skill ID' })
  @ApiBody({ description: 'Job skill update data.', type: UpdateJobSkillDto })
  @ApiOkResponse({ description: 'Job skill updated successfully.', type: JobSkillResponseDto })
  async updateJobSkill(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
    @Param('skillId') skillId: string,
    @Body() dto: UpdateJobSkillDto,
  ): Promise<{ message: string; data: JobSkillData }> {
    const skill = await this.jobPostingService.updateJobSkill(
      request.user.companyRecruiterId!,
      jobId,
      skillId,
      dto,
    );
    return { message: 'Job skill updated successfully.', data: skill };
  }

  /**
   * Delete a job skill (recruiter only).
   */
  @Delete(':jobId/skills/:skillId')
  @ApiOperation({ summary: 'Delete job skill (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiParam({ name: 'skillId', description: 'Job skill ID' })
  @ApiOkResponse({ description: 'Job skill deleted successfully.' })
  async deleteJobSkill(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
    @Param('skillId') skillId: string,
  ): Promise<{ message: string }> {
    await this.jobPostingService.deleteJobSkill(request.user.companyRecruiterId!, jobId, skillId);
    return { message: 'Job skill deleted successfully.' };
  }
}
