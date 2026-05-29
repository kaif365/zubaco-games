import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenMaxAttempts?: number;
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  halfOpenAttempts: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreakerState>();
  private readonly defaults: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    resetTimeoutMs: 30_000,
    halfOpenMaxAttempts: 3,
  };

  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>,
    options?: CircuitBreakerOptions,
  ): Promise<T> {
    const opts = { ...this.defaults, ...options };
    const circuit = this.getOrCreateCircuit(name);

    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() - circuit.lastFailureTime >= opts.resetTimeoutMs) {
        circuit.state = CircuitState.HALF_OPEN;
        circuit.halfOpenAttempts = 0;
        this.logger.log(`Circuit "${name}" transitioning to HALF_OPEN`);
      } else {
        this.logger.warn(`Circuit "${name}" is OPEN — using fallback`);
        if (fallback) return fallback();
        throw new Error(`Circuit breaker "${name}" is OPEN`);
      }
    }

    if (circuit.state === CircuitState.HALF_OPEN && circuit.halfOpenAttempts >= opts.halfOpenMaxAttempts) {
      circuit.state = CircuitState.OPEN;
      circuit.lastFailureTime = Date.now();
      if (fallback) return fallback();
      throw new Error(`Circuit breaker "${name}" is OPEN (half-open attempts exhausted)`);
    }

    try {
      const result = await fn();
      this.onSuccess(name, circuit);
      return result;
    } catch (error) {
      this.onFailure(name, circuit, opts);
      if (fallback) return fallback();
      throw error;
    }
  }

  getState(name: string): CircuitState {
    return this.getOrCreateCircuit(name).state;
  }

  reset(name: string): void {
    this.circuits.delete(name);
    this.logger.log(`Circuit "${name}" manually reset`);
  }

  getStats(): Record<string, { state: CircuitState; failures: number }> {
    const stats: Record<string, { state: CircuitState; failures: number }> = {};
    this.circuits.forEach((circuit, name) => {
      stats[name] = { state: circuit.state, failures: circuit.failures };
    });
    return stats;
  }

  private getOrCreateCircuit(name: string): CircuitBreakerState {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        state: CircuitState.CLOSED,
        failures: 0,
        lastFailureTime: 0,
        halfOpenAttempts: 0,
      });
    }
    return this.circuits.get(name)!;
  }

  private onSuccess(name: string, circuit: CircuitBreakerState): void {
    if (circuit.state === CircuitState.HALF_OPEN) {
      this.logger.log(`Circuit "${name}" recovered — CLOSED`);
    }
    circuit.state = CircuitState.CLOSED;
    circuit.failures = 0;
    circuit.halfOpenAttempts = 0;
  }

  private onFailure(name: string, circuit: CircuitBreakerState, opts: Required<CircuitBreakerOptions>): void {
    circuit.failures++;
    circuit.lastFailureTime = Date.now();

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.halfOpenAttempts++;
    }

    if (circuit.failures >= opts.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      this.logger.error(`Circuit "${name}" OPENED after ${circuit.failures} failures`);
    }
  }
}
