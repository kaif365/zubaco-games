import { config } from '@config';
import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

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
     * Calls GET /admin/auth/me on the admin microservice.
     * Used as fallback when Redis session/admin cache misses.
     * The admin service validates the JWT against its own Redis internally.
     */
    async checkAuthenticated(token: string): Promise<AdminData> {
        console.log('[admin-http] checkAuthenticated called');
        console.log('[admin-http] token:', token);
        console.log('[admin-http] adminMicroservice.baseUrl:', config.adminMicroservice.baseUrl);
        try {
            const response = await firstValueFrom(
                this.http.get<{ data: AdminData }>('/admin/auth/me', {
                    baseURL: config.adminMicroservice.baseUrl,
                    headers: { Authorization: `Bearer ${token}` },
                }),
            );
            console.log('[admin-http] response status:', response.status);
            console.log('[admin-http] response data:', JSON.stringify(response.data));
            const admin = response.data?.data;
            if (!admin?.id) {
                console.error(
                    '[admin-http] VALIDATION FAILED: admin not found in response or missing id',
                );
                throw new UnauthorizedException('ADMIN_VERIFICATION_FAILED');
            }
            console.log('[admin-http] admin validated successfully, adminId:', admin.id);
            return admin;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            const axiosError = error as {
                response?: { status?: number; data?: unknown };
                message?: string;
            };
            console.error(
                '[admin-http] VALIDATION FAILED — fallback call to admin microservice failed',
            );
            console.error('[admin-http] error message:', axiosError?.message);
            console.error(
                '[admin-http] HTTP status from admin service:',
                axiosError?.response?.status,
            );
            console.error(
                '[admin-http] response body from admin service:',
                JSON.stringify(axiosError?.response?.data),
            );
            throw new UnauthorizedException('ADMIN_VERIFICATION_FAILED');
        }
    }
}
