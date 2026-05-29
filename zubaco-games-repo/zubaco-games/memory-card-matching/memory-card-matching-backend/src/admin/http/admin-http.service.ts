import { config } from "@config";
import { Injectable, UnauthorizedException } from "@nestjs/common";

export interface AdminData {
  id: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/**
 * Fetches authenticated admin details from the admin microservice.
 */
@Injectable()
export class AdminHttpService {
  /**
   * Handle check authenticated.
   *
   * @param {string} token - token value.
   *
   * @returns {Promise<AdminData>} The asynchronous result.
   */
  async checkAuthenticated(token: string): Promise<AdminData> {
    try {
      const response = await fetch(
        new URL("/admin/auth/me", config.adminMicroservice.baseUrl),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        throw new UnauthorizedException("ADMIN_VERIFICATION_FAILED");
      }

      const body = (await response.json()) as {
        data?: AdminData;
      };

      const admin = body.data;

      if (!admin?.id) {
        throw new UnauthorizedException("ADMIN_VERIFICATION_FAILED");
      }

      return admin;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("ADMIN_VERIFICATION_FAILED");
    }
  }
}
