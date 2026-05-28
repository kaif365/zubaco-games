import type { AdminData } from "../admin/http/admin-http.service";
import type { UserData } from "../user/http/user-http.service";

declare global {
  namespace Express {
    interface Request {
      language?: string;
      user?: AdminData | UserData;
      wasEncrypted?: boolean;
    }
  }
}

export {};
