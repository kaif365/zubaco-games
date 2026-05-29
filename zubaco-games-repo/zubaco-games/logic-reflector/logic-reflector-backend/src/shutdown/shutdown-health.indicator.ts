import { Injectable } from '@nestjs/common';
import { GracefulShutdownService } from './graceful-shutdown.service';

@Injectable()
export class ShutdownHealthIndicator {
  constructor(private readonly shutdownService: GracefulShutdownService) {}

  isHealthy(): boolean {
    return !this.shutdownService.isTerminating;
  }
}
