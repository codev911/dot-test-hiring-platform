import { Logger } from '@nestjs/common';

/**
 * Convenience wrapper around NestJS {@link Logger} providing
 * typed methods for common log levels and consistent context usage.
 */
export class AppLogger {
  private readonly logger: Logger;

  /**
   * Create a new logger bound to a specific context name.
   *
   * @param logname - Context label displayed in log output.
   */
  constructor(logname: string) {
    this.logger = new Logger(logname);
  }

  /**
   * Emit verbose message intended for debugging scenarios.
   *
   * @param message - Arbitrary payload describing the event.
   * @param context - Optional override for the logger context.
   */
  debug(message: unknown, context?: string): void {
    if (context) {
      this.logger.debug(message, context);
      return;
    }

    this.logger.debug(message);
  }

  /**
   * Emit informational message indicating normal application behaviour.
   *
   * @param message - Arbitrary payload describing the event.
   * @param context - Optional override for the logger context.
   */
  info(message: unknown, context?: string): void {
    if (context) {
      this.logger.log(message, context);
      return;
    }

    this.logger.log(message);
  }

  /**
   * Emit warning message to flag a recoverable / noteworthy condition.
   *
   * @param message - Arbitrary payload describing the event.
   * @param context - Optional override for the logger context.
   */
  warn(message: unknown, context?: string): void {
    if (context) {
      this.logger.warn(message, context);
      return;
    }

    this.logger.warn(message);
  }

  /**
   * Emit error message capturing an unexpected or failing condition.
   *
   * @param message - Arbitrary payload describing the event.
   * @param context - Optional override for the logger context.
   */
  error(message: unknown, context?: string): void {
    if (context) {
      this.logger.error(message, context);
      return;
    }

    this.logger.error(message as string);
  }

  /**
   * Emit fatal message to record critical errors requiring shutdown.
   *
   * @param message - Arbitrary payload describing the event.
   * @param context - Optional override for the logger context.
   */
  fatal(message: unknown, context?: string): void {
    if (context) {
      this.logger.fatal(message, context);
      return;
    }

    this.logger.fatal(message);
  }
}
