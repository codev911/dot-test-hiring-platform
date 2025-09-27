import { AppController } from '../../src/app.controller';
import type { AppService } from '../../src/app.service';

describe('AppController', () => {
  it('returns greeting provided by the service', () => {
    const greeting = 'Hello from test!';
    const appServiceMock: Pick<AppService, 'getHello'> = {
      getHello: jest.fn().mockReturnValue(greeting),
    };

    const controller = new AppController(appServiceMock as AppService);

    expect(controller.getHello()).toBe(greeting);
    expect(appServiceMock.getHello).toHaveBeenCalledTimes(1);
  });
});
