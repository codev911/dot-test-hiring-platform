import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UserResumeController } from '../../src/user-resume/user-resume.controller';
import type { UserResumeService } from '../../src/user-resume/user-resume.service';

describe('UserResumeController', () => {
  let controller: UserResumeController;
  let service: jest.Mocked<UserResumeService>;

  const request = {
    user: {
      sub: 'user-1',
      email: 'user@example.com',
      role: 'candidate' as const,
    },
  };

  beforeEach(() => {
    service = {
      uploadResume: jest.fn(),
      getResume: jest.fn(),
    } as unknown as jest.Mocked<UserResumeService>;

    controller = new UserResumeController(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates resume upload to service', async () => {
    const file = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    } as unknown as Express.Multer.File;
    service.uploadResume.mockResolvedValue({
      message: 'ok',
      data: { resumeUrl: 'http://localhost:9000/bucket/resume/user-1.pdf' },
    });

    const response = await controller.uploadResume(request as never, file);

    expect(service.uploadResume).toHaveBeenCalledWith('user-1', file);
    expect(response.message).toBe('ok');
    expect(response.data.resumeUrl).toBe('http://localhost:9000/bucket/resume/user-1.pdf');
  });

  it('throws when request lacks user payload', () => {
    const file = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    } as unknown as Express.Multer.File;

    expect(() => controller.uploadResume({} as never, file)).toThrow(UnauthorizedException);
  });

  describe('getResume', () => {
    it('delegates resume retrieval to service', async () => {
      service.getResume.mockResolvedValue({
        message: 'Resume retrieved successfully.',
        data: { resumeUrl: 'http://localhost:9000/bucket/resume/user-1.pdf' },
      });

      const response = await controller.getResume(request as never);

      expect(service.getResume).toHaveBeenCalledWith('user-1');
      expect(response.message).toBe('Resume retrieved successfully.');
      expect(response.data.resumeUrl).toBe('http://localhost:9000/bucket/resume/user-1.pdf');
    });

    it('returns null resume URL when no resume exists', async () => {
      service.getResume.mockResolvedValue({
        message: 'Resume retrieved successfully.',
        data: { resumeUrl: null },
      });

      const response = await controller.getResume(request as never);

      expect(service.getResume).toHaveBeenCalledWith('user-1');
      expect(response.data.resumeUrl).toBeNull();
    });

    it('throws when request lacks user payload', async () => {
      await expect(controller.getResume({} as never)).rejects.toThrow(UnauthorizedException);
    });
  });
});
