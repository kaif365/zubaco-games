import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../../config';

@Injectable()
export class AppleStrategy {
  private jwks: jwksClient.JwksClient;

  constructor() {
    this.jwks = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
    });
  }

  async verifyToken(identityToken: string): Promise<{ id: string; email?: string; name?: string }> {
    try {
      const decoded = jwt.decode(identityToken, { complete: true });
      if (!decoded || !decoded.header.kid) {
        throw new UnauthorizedException('Invalid Apple identity token');
      }

      const key = await this.jwks.getSigningKey(decoded.header.kid);
      const publicKey = key.getPublicKey();

      const payload = jwt.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: config.apple.clientId,
      }) as jwt.JwtPayload;

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid Apple token: missing subject');
      }

      return {
        id: payload.sub,
        email: payload.email as string | undefined,
        name: undefined, // Apple only provides name on first sign-in via authorization response
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Apple token verification failed');
    }
  }
}
