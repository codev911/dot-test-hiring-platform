import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * HTTP adapter layer exposing routes backed by {@link AppService} logic.
 */
@Controller()
export class AppController {
  /**
   * Instantiate the controller with the service responsible for business logic.
   *
   * @param appService Provides greeting data for the controller endpoints.
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Handle the root route by returning the service greeting.
   *
   * @returns Greeting that signals the API is responsive.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
