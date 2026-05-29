import { config } from '@config';
import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';

export interface UserData {
    id: string;
    name: string;
    createdAt: string;
    stageId: string;
}

@Injectable()
export class UserHttpService {
    constructor(private readonly http: HttpService) {}

    /**
     * Check authenticated.
     *
     * @param {string} token - The token.
     *
     * @returns {Promise<UserData>} A promise that resolves with the result.
     */
    async checkAuthenticated(token: string): Promise<UserData> {
        try {
            const response = await this.http.axiosRef.get<{ data: UserData }>('/user/auth/me', {
                baseURL: config.usersMicroservice.baseUrl,
                headers: { Authorization: `Bearer ${token}` },
            });
            const user = response.data.data;
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
