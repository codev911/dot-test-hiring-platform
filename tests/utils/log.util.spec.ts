import { Logger } from '@nestjs/common';
import { AppLogger } from '../../src/utils/log.util';

describe('AppLogger', () => {
  let debugSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let fatalSpy: jest.SpyInstance;

  beforeEach(() => {
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined as unknown as void);
    fatalSpy = jest.spyOn(Logger.prototype, 'fatal').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs debug messages with optional context', () => {
    const logger = new AppLogger('TestLogger');
    logger.debug('debug message', 'TestContext');
    expect(debugSpy).toHaveBeenCalledWith('debug message', 'TestContext');

    jest.clearAllMocks();

    logger.debug('debug message');
    expect(debugSpy).toHaveBeenCalledWith('debug message');
  });

  it('logs info messages with optional context', () => {
    const logger = new AppLogger('TestLogger');
    logger.info('info message', 'InfoContext');
    expect(logSpy).toHaveBeenCalledWith('info message', 'InfoContext');

    jest.clearAllMocks();

    logger.info('info message');
    expect(logSpy).toHaveBeenCalledWith('info message');
  });

  it('logs warnings with optional context', () => {
    const logger = new AppLogger('TestLogger');
    logger.warn('warn message', 'WarnContext');
    expect(warnSpy).toHaveBeenCalledWith('warn message', 'WarnContext');

    jest.clearAllMocks();

    logger.warn('warn message');
    expect(warnSpy).toHaveBeenCalledWith('warn message');
  });

  it('logs errors with optional context', () => {
    const logger = new AppLogger('TestLogger');
    logger.error('error message', 'ErrorContext');
    expect(errorSpy).toHaveBeenCalledWith('error message', 'ErrorContext');

    jest.clearAllMocks();

    logger.error('error message');
    expect(errorSpy).toHaveBeenCalledWith('error message');
  });

  it('logs fatal messages with optional context', () => {
    const logger = new AppLogger('TestLogger');
    logger.fatal('fatal message', 'FatalContext');
    expect(fatalSpy).toHaveBeenCalledWith('fatal message', 'FatalContext');

    jest.clearAllMocks();

    logger.fatal('fatal message');
    expect(fatalSpy).toHaveBeenCalledWith('fatal message');
  });
});
