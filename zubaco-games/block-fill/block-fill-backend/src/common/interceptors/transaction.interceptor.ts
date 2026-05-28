import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma';
import { Observable, from, lastValueFrom } from 'rxjs';

import { TRANSACTIONAL_KEY, TransactionalOptions } from '../decorators/transactional.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { transactionContext } from '../prisma/transaction.context';

function handleAsObservable(next: CallHandler<unknown>): Observable<unknown> {
    return next.handle() as Observable<unknown>;
}

function bindTransaction(prisma: PrismaService): <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options: {
        isolationLevel: Prisma.TransactionIsolationLevel;
        maxWait: number;
        timeout: number;
    },
) => Promise<T> {
    return prisma.$transaction.bind(prisma) as <T>(
        fn: (tx: Prisma.TransactionClient) => Promise<T>,
        options: {
            isolationLevel: Prisma.TransactionIsolationLevel;
            maxWait: number;
            timeout: number;
        },
    ) => Promise<T>;
}

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
    constructor(
        private readonly prisma: PrismaService,
        private readonly reflector: Reflector,
    ) {}

    /**
     * Wraps transactional handlers in a Prisma interactive transaction.
     * @param {ExecutionContext} context - The Nest execution context.
     * @param {CallHandler<unknown>} next - The next handler in the interceptor chain.
     * @returns {Observable<unknown>} The transactional response stream.
     */
    intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        const options = this.reflector.get<TransactionalOptions>(
            TRANSACTIONAL_KEY,
            context.getHandler(),
        );

        // If no @Transactional() decorator, pass through
        if (!options) {
            return handleAsObservable(next);
        }

        // Determine isolation level
        const isolationLevel = options.readOnly
            ? Prisma.TransactionIsolationLevel.RepeatableRead
            : Prisma.TransactionIsolationLevel.ReadCommitted;
        // Prisma's transaction helper and Nest's CallHandler both surface `any` here.
        const runTransaction = bindTransaction(this.prisma);

        // Wrap in Prisma interactive transaction
        /* eslint-disable @typescript-eslint/no-unsafe-call */
        return from(
            runTransaction(
                async (tx) => {
                    // Run the handler within the AsyncLocalStorage context
                    // so PrismaService's Proxy picks up the transaction client
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return transactionContext.run(tx, async () => {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        const response$ = handleAsObservable(next);
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return await lastValueFrom(response$);
                    });
                },
                {
                    isolationLevel,
                    maxWait: 10_000,
                    timeout: 20_000,
                },
            ),
        );
        /* eslint-enable @typescript-eslint/no-unsafe-call */
    }
}
