import { AsyncLocalStorage } from 'async_hooks';

export interface TransactionStore {
    tx: Record<string, unknown>;
    afterCommitCallbacks: Array<() => Promise<void>>;
    onRollbackCallbacks: Array<() => Promise<void>>;
}

export const transactionContext = new AsyncLocalStorage<TransactionStore>();

/**
 * After commit.
 *
 * @param {() => void | Promise<void>} callback - The callback.
 *
 * @returns {void} No return value.
 */
export function afterCommit(callback: () => void | Promise<void>): void {
    const store = transactionContext.getStore();
    if (store) {
        store.afterCommitCallbacks.push(async () => {
            await callback();
        });
    } else {
        void Promise.resolve().then(callback);
    }
}

/**
 * On rollback.
 *
 * @param {() => void | Promise<void>} callback - The callback.
 *
 * @returns {void} No return value.
 */
export function onRollback(callback: () => void | Promise<void>): void {
    const store = transactionContext.getStore();
    if (store) {
        store.onRollbackCallbacks.push(async () => {
            await callback();
        });
    }
}
