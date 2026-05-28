import { TRANSACTION_CONFIGS } from "@common/constants";
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Prisma } from "@prisma";
import { Observable, firstValueFrom, from } from "rxjs";

import {
  TRANSACTIONAL_KEY,
  TransactionalOptions,
} from "../decorators/transactional.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { transactionContext } from "../prisma/transaction.context";

/**
 * Global interceptor that wraps controller methods decorated with @Transactional()
 * in a Prisma interactive transaction.
 *
 * Uses AsyncLocalStorage to make the transaction client available to PrismaService's
 * Proxy without requiring any changes to service code.
 *
 * If any error occurs during execution, all database changes are rolled back.
 */
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  /**
   * Create a new instance.
   *
   * @param {PrismaService} prisma - prisma value.
   * @param {Reflector} reflector - reflector value.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Intercept the request lifecycle.
   *
   * @param {ExecutionContext} context - context value.
   * @param {CallHandler<unknown>} next - next value.
   *
   * @returns {Observable<unknown>} The response stream.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const options = this.reflector.get<TransactionalOptions>(
      TRANSACTIONAL_KEY,
      context.getHandler(),
    );

    // If no @Transactional() decorator, pass through
    if (!options) {
      return next.handle();
    }

    // Determine isolation level
    const isolationLevel = options.readOnly
      ? Prisma.TransactionIsolationLevel.RepeatableRead
      : Prisma.TransactionIsolationLevel.ReadCommitted;

    // Wrap in Prisma interactive transaction
    return from(
      this.prisma.$transaction(
        async (tx) => {
          // Run the handler within the AsyncLocalStorage context
          // so PrismaService's Proxy picks up the transaction client
          return transactionContext.run(tx, () => {
            return firstValueFrom(next.handle());
          });
        },
        {
          isolationLevel,
          maxWait: TRANSACTION_CONFIGS.MAX_WAIT_MS,
          timeout: TRANSACTION_CONFIGS.TIMEOUT_MS,
        },
      ),
    );
  }
}
