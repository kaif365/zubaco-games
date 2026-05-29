import { config } from '@config';
import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';

export interface AdminData {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

/**
 * Handles all outbound HTTP calls to the admin microservice.
 * Single entry point — add new admin API calls here.
 */
@Injectable()
export class AdminHttpService {
    constructor(private readonly http: HttpService) {}

    /**
     * Check authenticated.
     *
     * @param {string} token - The token.
     *
     * @returns {Promise<AdminData>} A promise that resolves with the result.
     */
    async checkAuthenticated(token: string): Promise<AdminData> {
        try {
            const response = await this.http.axiosRef.get<{ data: AdminData }>('/admin/auth/me', {
                baseURL: config.adminMicroservice.baseUrl,
                headers: { Authorization: `Bearer ${token}` },
            });
            const admin = response.data.data;
            if (!admin?.id) {
                throw new UnauthorizedException('ADMIN_VERIFICATION_FAILED');
            }
            return admin;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('ADMIN_VERIFICATION_FAILED');
        }
    }
}
