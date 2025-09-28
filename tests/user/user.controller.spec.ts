import { UnauthorizedException } from '@nestjs/common';
import { UserController } from '../../src/user/user.controller';
import type { UserService } from '../../src/user/user.service';
import type { ChangePasswordDto } from '../../src/user/dto/change-password.dto';

describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  const request = {
    user: {
      sub: 'user-1',
      email: 'user@example.com',
      role: 'candidate' as const,
    },
  };

  beforeEach(() => {
    service = {
      changePassword: jest.fn(),
      updateAvatar: jest.fn(),
      getAvatar: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    controller = new UserController(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates password change to service', async () => {
    const dto = {
      currentPassword: 'Password123!',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    } as ChangePasswordDto;
    service.changePassword.mockResolvedValue({ message: 'ok', data: { userId: 'user-1' } });

    const response = await controller.changePassword(request as never, dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.changePassword).toHaveBeenCalledWith('user-1', dto);
    expect(response).toEqual({ message: 'ok', data: { userId: 'user-1' } });
  });

  it('delegates avatar upload to service', async () => {
    const file = {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      buffer: Buffer.from('avatar'),
    } as unknown as Express.Multer.File;
    service.updateAvatar.mockResolvedValue({
      message: 'ok',
      data: { avatarUrl: 'http://localhost:9000/bucket/profile/user-1.png' },
    });

    const response = await controller.updateAvatar(request as never, file);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.updateAvatar).toHaveBeenCalledWith('user-1', file);
    expect(response).toEqual({
      message: 'ok',
      data: { avatarUrl: 'http://localhost:9000/bucket/profile/user-1.png' },
    });
  });

  it('delegates avatar retrieval to service', async () => {
    service.getAvatar.mockResolvedValue({
      message: 'ok',
      data: { avatarUrl: 'http://localhost:9000/bucket/profile/user-1.png' },
    });

    const response = await controller.getAvatar(request as never);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getAvatar).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({
      message: 'ok',
      data: { avatarUrl: 'http://localhost:9000/bucket/profile/user-1.png' },
    });
  });

  it('throws when request lacks user payload', () => {
    expect(() => controller.getAvatar({} as never)).toThrow(UnauthorizedException);
  });
});
