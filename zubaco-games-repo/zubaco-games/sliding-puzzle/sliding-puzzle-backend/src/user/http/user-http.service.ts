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
     * @returns {Promise<UserData>} The asynchronous result.
     */
    async checkAuthenticated(token: string): Promise<UserData> {
        try {
            const response = await firstValueFrom(
                this.http.get<{ data: UserData }>('/user/auth/me', {
                    baseURL: config.usersMicroservice.baseUrl,
                    headers: { Authorization: `Bearer ${token}` },
                }),
            );
            const user = response.data?.data;
            if (!user?.id) {
                throw new UnauthorizedException('USER_VERIFICATION_FAILED');
            }
            return user;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('USER_VERIFICATION_FAILED');
        }
    }
}
