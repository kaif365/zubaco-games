import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config';

@Injectable()
export class GoogleStrategy {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(config.google.clientId);
  }

  async verifyToken(idToken: string): Promise<{ id: string; email: string; name: string; picture?: string }> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid Google token payload');
      }
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
      };
    } catch (error) {
      throw new UnauthorizedException('Google token verification failed');
    }
  }
}
