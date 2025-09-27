import { AppService } from '../../src/app.service';

describe('AppService', () => {
  it('returns the default greeting', () => {
    const service = new AppService();

    expect(service.getHello()).toBe('Hello World!');
  });
});
