import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

/**
 * Tournament lifecycle event types.
 */
export type TournamentEventType =
  | 'tournament.registered'
  | 'tournament.stage.opened'
  | 'tournament.stage.closed'
  | 'tournament.elimination.completed'
  | 'tournament.season.completed'
  | 'tournament.season.cancelled'
  | 'tournament.prize.distributed';

export interface TournamentEvent {
  type: TournamentEventType;
  seasonId: string;
  occurredAt: string;
  payload: Record<string, any>;
}

/**
 * Localized, dependency-free tournament event emission.
 *
 * Emits structured in-process domain events at every significant tournament
 * lifecycle transition and writes a structured log line for each. Other modules
 * can subscribe via `on()` for in-process side effects (e.g. an outbound webhook
 * relay) without coupling the engine to a specific delivery mechanism.
 */
@Injectable()
export class TournamentEventsService {
  private readonly logger = new Logger(TournamentEventsService.name);
  private readonly emitter = new EventEmitter();

  constructor() {
    // Avoid noisy MaxListeners warnings when multiple subscribers attach.
    this.emitter.setMaxListeners(50);
  }

  /**
   * Emit a tournament lifecycle event. Never throws — emission must not break
   * the lifecycle/money path that triggered it.
   */
  emit(type: TournamentEventType, seasonId: string, payload: Record<string, any> = {}): void {
    const event: TournamentEvent = {
      type,
      seasonId,
      occurredAt: new Date().toISOString(),
      payload,
    };

    try {
      this.logger.log(`event=${type} season=${seasonId} ${JSON.stringify(payload)}`);
      this.emitter.emit(type, event);
      this.emitter.emit('tournament.*', event);
    } catch (err) {
      this.logger.error(`Failed to emit tournament event ${type} for season ${seasonId}:`, err as Error);
    }
  }

  /**
   * Subscribe to a specific tournament event type (or 'tournament.*' for all).
   */
  on(type: TournamentEventType | 'tournament.*', listener: (event: TournamentEvent) => void): void {
    this.emitter.on(type, listener);
  }
}
