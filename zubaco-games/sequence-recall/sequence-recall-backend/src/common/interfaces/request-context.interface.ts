import type { Request } from 'express';

export interface RequestWithContext<User = unknown> extends Request {
    language?: string;
    user?: User;
}
