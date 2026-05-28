import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma';
import { Observable, lastValueFrom } from 'rxjs';

import { TRANSACTIONAL_KEY, TransactionalOptions } from '../decorators/transactional.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { transactionContext, TransactionStore } from '../prisma/transaction.context';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
    private readonly logger = new Logger(TransactionInterceptor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly reflector: Reflector,
    ) {}

    /**
     * Intercept.
     *
     * @param {ExecutionContext} context - The context.
     * @param {CallHandler<unknown>} next - The next.
     *
     * @returns {Observable<unknown>} The result of intercept.
     */
    intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        const options = this.reflector.get<TransactionalOptions>(
            TRANSACTIONAL_KEY,
            context.getHandler(),
        );

        if (!options) {
            return next.handle();
        }

        const isolationLevel = options.readOnly
            ? Prisma.TransactionIsolationLevel.RepeatableRead
            : Prisma.TransactionIsolationLevel.ReadCommitted;

        return new Observable<unknown>((subscriber) => {
            void this.runWithTransaction(next, isolationLevel)
                .then((result) => {
                    subscriber.next(result);
                    subscriber.complete();
                })
                .catch((error: unknown) => {
                    subscriber.error(error);
                });
        });
    }

    /**
     * Run with transaction.
     *
     * @param {CallHandler<any>} next - The next.
     * @param {"ReadUncommitted" | "ReadCommitted" | "RepeatableRead" | "Serializable"} isolationLevel - The isolation level.
     *
     * @returns {Promise<unknown>} A promise that resolves with the result.
     */
    private async runWithTransaction(
        next: CallHandler,
        isolationLevel: Prisma.TransactionIsolationLevel,
    ): Promise<unknown> {
        const afterCommitCallbacks: Array<() => Promise<void>> = [];
        const onRollbackCallbacks: Array<() => Promise<void>> = [];
        const stream = (next as { handle: () => Observable<unknown> }).handle();

        let result: unknown;
        try {
            result = await this.prisma.$transaction(
                (tx) => {
                    const store: TransactionStore = {
                        tx,
                        afterCommitCallbacks,
                        onRollbackCallbacks,
                    };
                    return transactionContext.run(store, () => lastValueFrom(stream));
                },
                { isolationLevel },
            );
        } catch (err) {
            for (const cb of onRollbackCallbacks) {
                try {
                    await cb();
                } catch (cbErr) {
                    this.logger.error('onRollback callback error', cbErr);
                }
            }
            throw err;
        }

        for (const cb of afterCommitCallbacks) {
            try {
                await cb();
            } catch (cbErr) {
                this.logger.error('afterCommit callback error', cbErr);
            }
        }
        return result;
    }
}
