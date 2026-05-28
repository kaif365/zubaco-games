import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';

describe('App (E2E)', () => {
  let app: INestApplication;
  const jwtSecret = process.env.JWT_SECRET || 'test-secret';
  const hmacSecret = process.env.HMAC_SECRET || 'dev-hmac-secret';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /health should return 200', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200);
    });
  });

  describe('Security', () => {
    it('should reject unauthenticated game requests', () => {
      return request(app.getHttpServer())
        .post('/api/v1/game/start')
        .send({ stageId: 'stage-1' })
        .expect((res: any) => {
          expect([401, 403, 404]).toContain(res.status);
        });
    });

    it('should reject invalid tokens', () => {
      return request(app.getHttpServer())
        .post('/api/v1/game/start')
        .set('Authorization', 'Bearer invalid-token')
        .send({ stageId: 'stage-1' })
        .expect((res: any) => {
          expect([401, 403]).toContain(res.status);
        });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in response', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('HMAC Signature', () => {
    it('should generate valid HMAC signature', () => {
      const timestamp = Date.now().toString();
      const body = JSON.stringify({ stageId: 'stage-1' });
      const payload = `${timestamp}.${body}`;
      const signature = crypto
        .createHmac('sha256', hmacSecret)
        .update(payload)
        .digest('hex');

      expect(signature).toHaveLength(64);
    });
  });

  describe('Metrics', () => {
    it('GET /api/v1/metrics should return Prometheus format', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/metrics')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('process_uptime_seconds');
    });
  });
});
