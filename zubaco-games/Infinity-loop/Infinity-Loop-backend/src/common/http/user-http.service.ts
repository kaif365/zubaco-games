import { config } from '@config';
import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

export interface UserData {
    id: string;
    name: string;
    createdAt: string;
    stageId: string;
}

@Injectable()
export class UserHttpService {
    constructor(private readonly http: HttpService) {}

    async checkAuthenticated(token: string): Promise<UserData> {
        console.log('[user-http] checkAuthenticated called');
        console.log('[user-http] token:', token);
        console.log('[user-http] usersMicroservice.baseUrl:', config.usersMicroservice.baseUrl);
        try {
            const response = await firstValueFrom(
                this.http.get<{ data: UserData }>('/user/auth/me', {
                    baseURL: config.usersMicroservice.baseUrl,
                    headers: { Authorization: `Bearer ${token}` },
                }),
            );
            console.log('[user-http] response status:', response.status);
            console.log('[user-http] response data:', JSON.stringify(response.data));
            const user = response.data?.data;
            if (!user?.id) {
                console.error(
                    '[user-http] VALIDATION FAILED: user not found in response or missing id',
                );
                throw new UnauthorizedException('Session Expired');
            }
            console.log('[user-http] user validated successfully, userId:', user.id);
            return user;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            const axiosError = error as {
                response?: { status?: number; data?: unknown };
                message?: string;
            };
            console.error(
                '[user-http] VALIDATION FAILED — fallback call to user microservice failed',
            );
            console.error('[user-http] error message:', axiosError?.message);
            console.error(
                '[user-http] HTTP status from user service:',
                axiosError?.response?.status,
            );
            console.error(
                '[user-http] response body from user service:',
                JSON.stringify(axiosError?.response?.data),
            );
            throw new UnauthorizedException('Session Expired');
        }
    }
}
