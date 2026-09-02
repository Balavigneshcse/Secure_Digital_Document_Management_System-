import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Simple liveness check — useful for docker-compose healthchecks / uptime pings.
  @Get('health')
  @ApiExcludeEndpoint()
  health(): { status: string } {
    return this.appService.getHealth();
  }
}
