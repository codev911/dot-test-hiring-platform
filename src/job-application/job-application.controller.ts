import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
import type { Request as ExpressRequest } from 'express';
import { CacheHelperService } from '../utils/cache/cache.service';
import { buildCacheKey, buildHttpCacheKeyForUserPath } from '../utils/cache/cache.util';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';
import { RecruiterAuthGuard } from '../common/guards/recruiter-auth.guard';
import type { JwtPayload } from '../utils/types/auth.type';
import type {
  JobApplicationData,
  JobApplicationEventData,
  JobApplicationNoteData,
  JobApplicationWithRelationsData,
  PaginatedJobApplicationsData,
} from '../utils/types/job.type';
import { AddApplicationNoteDto } from './dto/add-application-note.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import {
  JobApplicationEventResponseDto,
  JobApplicationNoteResponseDto,
  JobApplicationResponseDto,
  JobApplicationWithRelationsResponseDto,
  PaginatedJobApplicationsResponseDto,
} from './dto/job-application-response.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { JobApplicationService } from './job-application.service';

/**
 * Controller for job application management (candidate and recruiter sides).
 */
@ApiTags('Job Application')
@Controller('job-application')
export class JobApplicationController {
  /**
   * @param jobApplicationService Service orchestrating job application operations.
   */
  constructor(
    private readonly jobApplicationService: JobApplicationService,
    private readonly cache: CacheHelperService,
  ) {}

  /**
   * Create a new job application (candidate only).
   *
   * @param request Express request with authenticated candidate.
   * @param dto Job application creation payload.
   * @returns Created job application data.
   */
  @Post()
  @ApiOperation({ summary: 'Apply to a job posting (candidate only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(CandidateAuthGuard)
  @ApiBody({ description: 'Job application data.', type: CreateJobApplicationDto })
  @ApiCreatedResponse({
    description: 'Job application created successfully.',
    type: JobApplicationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data, job not published, or validation failed.',
  })
  @ApiConflictResponse({ description: 'You have already applied to this job posting.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiNotFoundResponse({ description: 'Job posting or resume not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async createJobApplication(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Body() dto: CreateJobApplicationDto,
  ): Promise<{ message: string; data: JobApplicationData }> {
    const application = await this.jobApplicationService.createJobApplication(
      request.user.sub,
      dto,
    );
    return { message: 'Job application created successfully.', data: application };
  }

  /**
   * Get job applications for the authenticated candidate.
   *
   * @param request Express request with authenticated candidate.
   * @param page Page number (default: 1).
   * @param limit Items per page (default: 10).
   * @returns Paginated job applications for the candidate.
   */
  @Get('my-applications')
  @ApiOperation({ summary: 'Get candidate job applications (candidate only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(CandidateAuthGuard)
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiOkResponse({
    description: 'Job applications retrieved successfully.',
    type: PaginatedJobApplicationsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getCandidateApplications(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ message: string; data: PaginatedJobApplicationsData }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const result = await this.jobApplicationService.getCandidateApplications(
      request.user.sub,
      pageNum,
      limitNum,
    );

    // Track candidate HTTP cache key for this listing using only params present in URL
    const queryForKey: Record<string, string | number> | undefined =
      page || limit
        ? { ...(page ? { page: pageNum } : {}), ...(limit ? { limit: limitNum } : {}) }
        : undefined;
    const httpKey = buildHttpCacheKeyForUserPath(
      request.user.sub,
      '/job-application/my-applications',
      queryForKey,
    );
    const httpIndexKey = buildCacheKey(
      'idx',
      'http',
      'job-application',
      'candidate',
      'list',
      request.user.sub,
    );
    await this.cache.trackKey(httpIndexKey, httpKey);

    return { message: 'Job applications retrieved successfully.', data: result };
  }

  /**
   * Get a specific job application by ID for the authenticated candidate.
   *
   * @param request Express request with authenticated candidate.
   * @param applicationId Application ID.
   * @returns Job application with full details.
   */
  @Get('my-applications/:applicationId')
  @ApiOperation({ summary: 'Get candidate job application by ID (candidate only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(CandidateAuthGuard)
  @ApiParam({ name: 'applicationId', description: 'Job application ID' })
  @ApiOkResponse({
    description: 'Job application retrieved successfully.',
    type: JobApplicationWithRelationsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({
    description: 'Candidate role required or application not owned by candidate.',
  })
  @ApiNotFoundResponse({ description: 'Job application not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getCandidateApplication(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('applicationId') applicationId: string,
  ): Promise<{ message: string; data: JobApplicationWithRelationsData }> {
    const application = await this.jobApplicationService.getCandidateApplication(
      request.user.sub,
      applicationId,
    );

    // Track candidate HTTP cache key for this detail
    const httpKey = buildHttpCacheKeyForUserPath(
      request.user.sub,
      `/job-application/my-applications/${applicationId}`,
    );
    const httpIndexKey = buildCacheKey(
      'idx',
      'http',
      'job-application',
      'candidate',
      'detail',
      request.user.sub,
    );
    await this.cache.trackKey(httpIndexKey, httpKey);

    return { message: 'Job application retrieved successfully.', data: application };
  }

  /**
   * Withdraw a job application by the authenticated candidate.
   *
   * @param request Express request with authenticated candidate.
   * @param applicationId Application ID.
   * @returns Updated application data.
   */
  @Patch('my-applications/:applicationId/withdraw')
  @ApiOperation({ summary: 'Withdraw job application (candidate only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(CandidateAuthGuard)
  @ApiParam({ name: 'applicationId', description: 'Job application ID' })
  @ApiOkResponse({
    description: 'Job application withdrawn successfully.',
    type: JobApplicationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Application cannot be withdrawn.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({
    description: 'Candidate role required or application not owned by candidate.',
  })
  @ApiNotFoundResponse({ description: 'Job application not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async withdrawApplication(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('applicationId') applicationId: string,
  ): Promise<{ message: string; data: JobApplicationData }> {
    const application = await this.jobApplicationService.withdrawApplication(
      request.user.sub,
      applicationId,
    );
    return { message: 'Job application withdrawn successfully.', data: application };
  }

  /**
   * Get job applications for a specific job posting (recruiter only).
   *
   * @param request Express request with authenticated recruiter.
   * @param jobId Job posting ID.
   * @param page Page number (default: 1).
   * @param limit Items per page (default: 10).
   * @returns Paginated job applications for the job.
   */
  @Get('job/:jobId')
  @ApiOperation({ summary: 'Get job applications for a job posting (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'jobId', description: 'Job posting ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiOkResponse({
    description: 'Job applications retrieved successfully.',
    type: PaginatedJobApplicationsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job posting not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getJobApplications(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('jobId') jobId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ message: string; data: PaginatedJobApplicationsData }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const result = await this.jobApplicationService.getJobApplications(
      request.user.companyRecruiterId!,
      jobId,
      pageNum,
      limitNum,
    );

    // Track recruiter HTTP cache key for this job applications listing (only provided params)
    const queryForKey: Record<string, string | number> | undefined =
      page || limit
        ? { ...(page ? { page: pageNum } : {}), ...(limit ? { limit: limitNum } : {}) }
        : undefined;
    const httpKey = buildHttpCacheKeyForUserPath(
      request.user.sub,
      `/job-application/job/${jobId}`,
      queryForKey,
    );
    const httpIndexKey = buildCacheKey(
      'idx',
      'http',
      'job-application',
      'recruiter',
      'job',
      'list',
      request.user.companyRecruiterId,
      jobId,
    );
    await this.cache.trackKey(httpIndexKey, httpKey);

    return { message: 'Job applications retrieved successfully.', data: result };
  }

  /**
   * Get a specific job application by ID (recruiter only).
   *
   * @param request Express request with authenticated recruiter.
   * @param applicationId Application ID.
   * @returns Job application with full details.
   */
  @Get(':applicationId')
  @ApiOperation({ summary: 'Get job application by ID (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'applicationId', description: 'Job application ID' })
  @ApiOkResponse({
    description: 'Job application retrieved successfully.',
    type: JobApplicationWithRelationsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job application not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getRecruiterApplication(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('applicationId') applicationId: string,
  ): Promise<{ message: string; data: JobApplicationWithRelationsData }> {
    const application = await this.jobApplicationService.getRecruiterApplication(
      request.user.companyRecruiterId!,
      applicationId,
    );

    // Track recruiter HTTP cache key for this detail
    const httpKey = buildHttpCacheKeyForUserPath(
      request.user.sub,
      `/job-application/${applicationId}`,
    );
    const httpIndexKey = buildCacheKey(
      'idx',
      'http',
      'job-application',
      'recruiter',
      'detail',
      request.user.companyRecruiterId,
    );
    await this.cache.trackKey(httpIndexKey, httpKey);

    return { message: 'Job application retrieved successfully.', data: application };
  }

  /**
   * Update application status (recruiter only).
   *
   * @param request Express request with authenticated recruiter.
   * @param applicationId Application ID.
   * @param dto Status update payload.
   * @returns Application event data.
   */
  @Patch(':applicationId/status')
  @ApiOperation({ summary: 'Update application status (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'applicationId', description: 'Job application ID' })
  @ApiBody({ description: 'Status update data.', type: UpdateApplicationStatusDto })
  @ApiOkResponse({
    description: 'Application status updated successfully.',
    type: JobApplicationEventResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job application not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async updateApplicationStatus(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ): Promise<{ message: string; data: JobApplicationEventData }> {
    const event = await this.jobApplicationService.updateApplicationStatus(
      request.user.companyRecruiterId!,
      applicationId,
      dto,
    );
    return { message: 'Application status updated successfully.', data: event };
  }

  /**
   * Add a note to an application (recruiter only).
   *
   * @param request Express request with authenticated recruiter.
   * @param applicationId Application ID.
   * @param dto Note addition payload.
   * @returns Application note data.
   */
  @Post(':applicationId/notes')
  @ApiOperation({ summary: 'Add note to application (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'applicationId', description: 'Job application ID' })
  @ApiBody({ description: 'Note data.', type: AddApplicationNoteDto })
  @ApiCreatedResponse({
    description: 'Application note added successfully.',
    type: JobApplicationNoteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job application not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async addApplicationNote(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('applicationId') applicationId: string,
    @Body() dto: AddApplicationNoteDto,
  ): Promise<{ message: string; data: JobApplicationNoteData }> {
    const note = await this.jobApplicationService.addApplicationNote(
      request.user.companyRecruiterId!,
      applicationId,
      dto,
    );
    return { message: 'Application note added successfully.', data: note };
  }

  /**
   * Get notes for an application (recruiter only).
   *
   * @param request Express request with authenticated recruiter.
   * @param applicationId Application ID.
   * @returns Array of application notes.
   */
  @Get(':applicationId/notes')
  @ApiOperation({ summary: 'Get application notes (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'applicationId', description: 'Job application ID' })
  @ApiOkResponse({ description: 'Application notes retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job application not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getApplicationNotes(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('applicationId') applicationId: string,
  ): Promise<{ message: string; data: JobApplicationNoteData[] }> {
    const notes = await this.jobApplicationService.getApplicationNotes(
      request.user.companyRecruiterId!,
      applicationId,
    );
    return { message: 'Application notes retrieved successfully.', data: notes };
  }

  /**
   * Get application events/history (recruiter only).
   *
   * @param request Express request with authenticated recruiter.
   * @param applicationId Application ID.
   * @returns Array of application events.
   */
  @Get(':applicationId/events')
  @ApiOperation({ summary: 'Get application events/history (recruiter only)' })
  @ApiBearerAuth('bearer')
  @UseGuards(RecruiterAuthGuard)
  @ApiParam({ name: 'applicationId', description: 'Job application ID' })
  @ApiOkResponse({ description: 'Application events retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token.' })
  @ApiForbiddenResponse({ description: 'Recruiter role required or job not owned by recruiter.' })
  @ApiNotFoundResponse({ description: 'Job application not found.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getApplicationEvents(
    @Request() request: ExpressRequest & { user: JwtPayload },
    @Param('applicationId') applicationId: string,
  ): Promise<{ message: string; data: JobApplicationEventData[] }> {
    const events = await this.jobApplicationService.getApplicationEvents(
      request.user.companyRecruiterId!,
      applicationId,
    );
    return { message: 'Application events retrieved successfully.', data: events };
  }
}
