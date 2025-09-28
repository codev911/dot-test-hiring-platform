import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileTypeValidator, MaxFileSizeValidator, ParseFilePipe } from '@nestjs/common';
import type { Express } from 'express';
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
  ApiConsumes,
  ApiBody,
  ApiPayloadTooLargeResponse,
  ApiUnsupportedMediaTypeResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { UserCertificationService } from './user-certification.service';
import { CreateUserCertificationDto } from './dto/create-user-certification.dto';
import { UpdateUserCertificationDto } from './dto/update-user-certification.dto';
import { UploadCertificateDto } from './dto/upload-certificate.dto';
import {
  UserCertificationsListResponseDto,
  UserCertificationResponseDto,
  CertificateUploadResponseDto,
} from './dto/user-certification-response.dto';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';
import type { JwtPayload } from '../utils/types/auth.type';
import type { UserCertificationData } from '../utils/types/user.type';

/**
 * REST controller managing user certification operations.
 */
@ApiTags('User Certifications')
@ApiBearerAuth('bearer')
@UseGuards(CandidateAuthGuard)
@Controller('user/certification')
export class UserCertificationController {
  /**
   * @param userCertificationService Service orchestrating user certification activities.
   */
  constructor(private readonly userCertificationService: UserCertificationService) {}

  /**
   * Create a new certification for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param createUserCertificationDto Data for creating the certification.
   * @returns Response containing the created certification.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user certification' })
  @ApiCreatedResponse({
    description: 'User certification created successfully.',
    type: UserCertificationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async create(
    @Req() request: Request & { user?: JwtPayload },
    @Body() createUserCertificationDto: CreateUserCertificationDto,
  ): Promise<{ message: string; data: UserCertificationData }> {
    const userId = this.extractUserId(request);
    const certification = await this.userCertificationService.create(
      userId,
      createUserCertificationDto,
    );
    return {
      message: 'User certification created successfully.',
      data: certification,
    };
  }

  /**
   * Retrieve paginated list of certifications for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param page Page number (default: 1).
   * @param limit Number of items per page (default: 10).
   * @returns Paginated list of user certifications.
   */
  @Get()
  @ApiOperation({ summary: 'Get paginated list of user certifications' })
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
    description: 'User certifications retrieved successfully.',
    type: UserCertificationsListResponseDto,
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
    data: UserCertificationData[];
    pagination: { page: number; limit: number; totalData: number; totalPage: number };
  }> {
    const userId = this.extractUserId(request);
    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedLimit = Math.min(50, Math.max(1, Number(limit) || 10));

    const result = await this.userCertificationService.findAll(
      userId,
      normalizedPage,
      normalizedLimit,
    );
    return {
      message: 'User certifications retrieved successfully.',
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
   * Retrieve a specific certification for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the certification.
   * @returns The requested user certification.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user certification by ID' })
  @ApiParam({ name: 'id', description: 'User certification ID' })
  @ApiOkResponse({
    description: 'User certification retrieved successfully.',
    type: UserCertificationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User certification not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async findOne(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
  ): Promise<{ message: string; data: UserCertificationData }> {
    const userId = this.extractUserId(request);
    const certification = await this.userCertificationService.findOne(userId, id);
    return {
      message: 'User certification retrieved successfully.',
      data: certification,
    };
  }

  /**
   * Update a specific certification for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the certification to update.
   * @param updateUserCertificationDto Data for updating the certification.
   * @returns Response containing the updated certification.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user certification' })
  @ApiParam({ name: 'id', description: 'User certification ID' })
  @ApiOkResponse({
    description: 'User certification updated successfully.',
    type: UserCertificationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation failed.' })
  @ApiNotFoundResponse({ description: 'User certification not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async update(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
    @Body() updateUserCertificationDto: UpdateUserCertificationDto,
  ): Promise<{ message: string; data: UserCertificationData }> {
    const userId = this.extractUserId(request);
    const certification = await this.userCertificationService.update(
      userId,
      id,
      updateUserCertificationDto,
    );
    return {
      message: 'User certification updated successfully.',
      data: certification,
    };
  }

  /**
   * Remove a specific certification for the authenticated user.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the certification to remove.
   * @returns Success message.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user certification' })
  @ApiParam({ name: 'id', description: 'User certification ID' })
  @ApiOkResponse({ description: 'User certification deleted successfully.' })
  @ApiNotFoundResponse({ description: 'User certification not found.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async remove(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const userId = this.extractUserId(request);
    await this.userCertificationService.remove(userId, id);
    return {
      message: 'User certification deleted successfully.',
    };
  }

  /**
   * Upload or replace certificate PDF for a specific certification.
   *
   * @param request Express request used to access the JWT payload.
   * @param id Identifier of the certification.
   * @param file Uploaded certificate PDF file.
   * @returns Response containing the certificate URL.
   */
  @Put(':id/files')
  @ApiOperation({ summary: 'Upload or replace certificate PDF for a certification' })
  @ApiParam({ name: 'id', description: 'User certification ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'Certificate upload payload.', type: UploadCertificateDto })
  @ApiOkResponse({
    description: 'Certificate uploaded or replaced successfully.',
    type: CertificateUploadResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid file or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiNotFoundResponse({ description: 'User certification not found.' })
  @ApiUnsupportedMediaTypeResponse({ description: 'File must be a PDF document.' })
  @ApiPayloadTooLargeResponse({ description: 'File must be <= 10MB.' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCertificate(
    @Req() request: Request & { user?: JwtPayload },
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024,
            message: 'File must be <= 10MB.',
          }),
          new FileTypeValidator({ fileType: /^application\/pdf$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<{ message: string; data: { certificateUrl: string | null } }> {
    const userId = this.extractUserId(request);
    return this.userCertificationService.uploadCertificate(userId, id, file);
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
