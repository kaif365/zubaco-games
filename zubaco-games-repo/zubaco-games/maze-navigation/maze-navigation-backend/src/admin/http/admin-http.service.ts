import { config } from "@config";
import { HttpService } from "@nestjs/axios";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

export interface AdminData {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Handles all outbound HTTP calls to the admin microservice.
 */
@Injectable()
export class AdminHttpService {
  /**
   * Create a new instance.
   *
   * @param {HttpService} http - http value.
   */
  constructor(private readonly http: HttpService) {}

  /**
   * Handle check authenticated.
   *
   * @param {string} token - token value.
   *
   * @returns {Promise<AdminData>} The asynchronous result.
   */
  async checkAuthenticated(token: string): Promise<AdminData> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ data: AdminData }>("/admin/auth/me", {
          baseURL: config.adminMicroservice.baseUrl,
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      const admin = response.data?.data;
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
