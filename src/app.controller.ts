import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { AppService } from './app.service';

/**
 * HTTP adapter layer exposing routes backed by {@link AppService} logic.
 */
@ApiTags('App')
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
  @ApiOperation({ summary: 'API health check' })
  @ApiOkResponse({
    description: 'API heartbeat response.',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  @ApiTooManyRequestsResponse({ description: 'Too many requests. Please slow down.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected error.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
