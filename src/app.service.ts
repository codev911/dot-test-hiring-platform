import { Injectable } from '@nestjs/common';

/**
 * Application service layer exposing reusable business logic for controllers.
 */
@Injectable()
export class AppService {
  /**
   * Provide the default greeting used by the home endpoint.
   *
   * @returns Friendly greeting for API consumers.
   */
  getHello(): string {
    return 'Service is live!';
  }
}
