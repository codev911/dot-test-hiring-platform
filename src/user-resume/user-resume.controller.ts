import {
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileTypeValidator, MaxFileSizeValidator, ParseFilePipe } from '@nestjs/common';
import type { Express } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiPayloadTooLargeResponse,
  ApiUnsupportedMediaTypeResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UserResumeService } from './user-resume.service';
import { UploadResumeDto } from './dto/upload-resume.dto';
import { ResumeResponseDto } from './dto/resume-response.dto';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';
import type { JwtPayload } from '../utils/types/auth.type';

/**
 * REST controller managing user resume operations.
 */
@ApiTags('User Resume')
@ApiBearerAuth('bearer')
@UseGuards(CandidateAuthGuard)
@Controller('user/resume')
export class UserResumeController {
  /**
   * @param userResumeService Service orchestrating resume activities.
   */
  constructor(private readonly userResumeService: UserResumeService) {}

  /**
   * Get the authenticated candidate's resume URL.
   *
   * @param request Express request used to access the JWT payload.
   * @returns Response containing the resume URL or null if no resume uploaded.
   */
  @Get()
  @ApiOperation({ summary: 'Get user resume URL' })
  @ApiOkResponse({ description: 'Resume retrieved successfully.', type: ResumeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  async getResume(
    @Req() request: Request & { user?: JwtPayload },
  ): Promise<{ message: string; data: { resumeUrl: string | null } }> {
    const userId = this.extractUserId(request);
    return this.userResumeService.getResume(userId);
  }

  /**
   * Upload or replace the authenticated candidate's resume (PDF up to 10MB).
   *
   * @param request Express request used to access the JWT payload and role.
   * @param file Uploaded resume file.
   * @returns Response containing the resume URL.
   */
  @Post()
  @ApiOperation({ summary: 'Upload or replace user resume' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'Resume upload payload.', type: UploadResumeDto })
  @ApiOkResponse({ description: 'Resume uploaded successfully.', type: ResumeResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid file or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiForbiddenResponse({ description: 'Candidate role required.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiUnsupportedMediaTypeResponse({ description: 'File must be a PDF document.' })
  @ApiPayloadTooLargeResponse({ description: 'File must be <= 10MB.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  @UseInterceptors(FileInterceptor('resume'))
  uploadResume(
    @Req() request: Request & { user?: JwtPayload },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024,
            message: 'Resume must be <= 10MB.',
          }),
          new FileTypeValidator({ fileType: /^application\/pdf$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<{ message: string; data: { resumeUrl: string | null } }> {
    const userId = this.extractUserId(request);
    return this.userResumeService.uploadResume(userId, file);
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
