import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
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
  ApiUnsupportedMediaTypeResponse,
  ApiInternalServerErrorResponse,
  ApiBadRequestResponse,
  ApiPayloadTooLargeResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UploadAvatarDto } from './dto/upload-avatar.dto';
import { AvatarResponseDto } from './dto/avatar-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../utils/types/auth.type';

/**
 * REST controller managing authenticated user profile operations.
 */
@ApiTags('User')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  /**
   * @param userService Service orchestrating user profile activities.
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Update the currently authenticated user's password.
   *
   * @param request Request object containing the JWT payload.
   * @param dto Password change payload.
   * @returns Confirmation message that the password was updated.
   */
  @Patch('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangePasswordDto, description: 'Password change payload' })
  @ApiOkResponse({ description: 'Password updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid current password or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  changePassword(
    @Req() request: Request & { user?: JwtPayload },
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string; data: { userId: string } }> {
    const userId = this.extractUserId(request);
    return this.userService.changePassword(userId, dto);
  }

  /**
   * Upload or replace the authenticated user's avatar.
   *
   * @param request Express request used to access the JWT payload.
   * @param file Uploaded avatar file.
   * @returns Response containing the avatar URL.
   */
  @Put('avatar')
  @ApiOperation({ summary: 'Upload or update user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'Avatar upload payload.', type: UploadAvatarDto })
  @ApiOkResponse({ description: 'Avatar uploaded successfully.', type: AvatarResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid file or validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiUnsupportedMediaTypeResponse({ description: 'File must be an image (PNG, JPG, GIF, WEBP).' })
  @ApiPayloadTooLargeResponse({ description: 'File must be <= 2MB.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  @UseInterceptors(FileInterceptor('avatar'))
  updateAvatar(
    @Req() request: Request & { user?: JwtPayload },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024, message: 'Avatar must be <= 2MB.' }),
          new FileTypeValidator({ fileType: /(image\/(jpeg|png|gif|webp))/i }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<{ message: string; data: { avatarUrl: string | null } }> {
    const userId = this.extractUserId(request);
    return this.userService.updateAvatar(userId, file);
  }

  /**
   * Retrieve the authenticated user's avatar URL.
   *
   * @param request Express request containing the JWT payload.
   * @returns Response containing the avatar URL or null when none exists.
   */
  @Get('avatar')
  @ApiOperation({ summary: 'Get user avatar URL' })
  @ApiOkResponse({ description: 'Avatar retrieved successfully.', type: AvatarResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  getAvatar(
    @Req() request: Request & { user?: JwtPayload },
  ): Promise<{ message: string; data: { avatarUrl: string | null } }> {
    const userId = this.extractUserId(request);
    return this.userService.getAvatar(userId);
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
