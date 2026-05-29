import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private readonly shutdownSubject = new Subject<void>();
  private isShuttingDown = false;

  get isTerminating(): boolean {
    return this.isShuttingDown;
  }

  get shutdown$() {
    return this.shutdownSubject.asObservable();
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.isShuttingDown = true;
    this.logger.warn(`Shutdown signal received: ${signal || 'unknown'}`);
    this.shutdownSubject.next();
    this.shutdownSubject.complete();

    // Allow in-flight requests to drain (configurable via env)
    const drainMs = parseInt(process.env.SHUTDOWN_DRAIN_MS || '5000', 10);
    this.logger.log(`Draining connections for ${drainMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, drainMs));
    this.logger.log('Shutdown complete');
  }
}
