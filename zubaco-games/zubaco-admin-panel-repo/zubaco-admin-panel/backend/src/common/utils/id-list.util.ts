import { z } from 'zod';

const uuidSchema = z.string().uuid();

function uniqueIds<T extends string>(ids: T[], ctx: z.RefinementCtx) {
    if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Duplicate IDs are not allowed',
        });
    }
}

export const uuidListSchema = z.array(uuidSchema).min(1).superRefine(uniqueIds);

export const csvUuidListSchema = z
    .string()
    .trim()
    .min(1)
    .transform((value) =>
        value
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
    )
    .pipe(uuidListSchema);
