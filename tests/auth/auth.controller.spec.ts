import { AuthController } from '../../src/auth/auth.controller';
import type { AuthService } from '../../src/auth/auth.service';
import type { RegisterUserDto } from '../../src/auth/dto/register-user.dto';
import type { LoginDto } from '../../src/auth/dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(() => {
    service = {
      registerCandidate: jest.fn(),
      loginCandidate: jest.fn(),
      loginRecruiter: jest.fn(),
      getProfile: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    controller = new AuthController(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates register to service', async () => {
    const dto = {
      firstName: 'First',
      email: 'user@example.com',
      password: 'Password123!',
    } as RegisterUserDto;
    service.registerCandidate.mockResolvedValue({ message: 'ok', data: {} } as never);

    const result = await controller.registerCandidate(dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.registerCandidate).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'ok', data: {} });
  });

  it('delegates candidate login to service', async () => {
    const dto = { email: 'user@example.com', password: 'Password123!' } as LoginDto;
    service.loginCandidate.mockResolvedValue({ message: 'login', data: {} } as never);

    const result = await controller.loginCandidate(dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.loginCandidate).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'login', data: {} });
  });

  it('delegates recruiter login to service', async () => {
    const dto = { email: 'recruiter@example.com', password: 'Password123!' } as LoginDto;
    service.loginRecruiter.mockResolvedValue({ message: 'login', data: {} } as never);

    const result = await controller.loginRecruiter(dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.loginRecruiter).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'login', data: {} });
  });

  it('delegates profile lookup to service', async () => {
    const request = { user: { sub: '1', email: 'user@example.com', role: 'candidate' as const } };
    service.getProfile.mockResolvedValue({ message: 'me', data: {} } as never);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await controller.getProfile(request as any);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getProfile).toHaveBeenCalledWith(request.user);
    expect(result).toEqual({ message: 'me', data: {} });
  });
});
