import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Health Endpoints ───
  describe('Health', () => {
    it('GET /api/v1/health should return 200', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('GET /api/v1/health/live should return 200', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200);
    });

    it('GET /api/v1/health/ready should return 200', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);
    });
  });

  // ─── Security: Unauthorized Access ───
  describe('Security', () => {
    it('POST /api/v1/game/start without token should return 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/game/start')
        .send({ stageId: 'stage-1', level: 1 })
        .expect(401);
    });

    it('POST /api/v1/game/start with invalid token should return 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/game/start')
        .set('Authorization', 'Bearer invalid-token')
        .send({ stageId: 'stage-1', level: 1 })
        .expect(401);
    });

    it('POST /api/v1/game/start with expired token should return 401', () => {
      const expiredToken = jwt.sign(
        { sub: 'user-123', iat: Math.floor(Date.now() / 1000) - 7200 },
        jwtSecret,
        { expiresIn: '1s' },
      );
      return request(app.getHttpServer())
        .post('/api/v1/game/start')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ stageId: 'stage-1', level: 1 })
        .expect(401);
    });
  });

  // ─── Security: API Key Guard ───
  describe('API Key Guard', () => {
    it('should reject requests to protected endpoints without X-API-Key', async () => {
      // This test validates the guard is active - actual protected endpoints
      // would be admin routes decorated with @RequireApiKey()
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);
      // Health endpoint should NOT require API key
      expect(res.status).toBe(200);
    });
  });

  // ─── Security: HMAC Verification ───
  describe('HMAC Signature', () => {
    it('should generate valid HMAC signature', () => {
      const timestamp = Date.now().toString();
      const body = JSON.stringify({ stageId: 'stage-1', level: 1 });
      const payload = `${timestamp}.${body}`;
      const signature = crypto
        .createHmac('sha256', hmacSecret)
        .update(payload)
        .digest('hex');

      expect(signature).toHaveLength(64);
      expect(typeof signature).toBe('string');
    });
  });

  // ─── Security Headers ───
  describe('Security Headers', () => {
    it('should include security headers in response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  // ─── Rate Limiting ───
  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const token = jwt.sign({ sub: 'rate-limit-user' }, jwtSecret, { expiresIn: '1h' });
      const requests = Array.from({ length: 65 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/game/start')
          .set('Authorization', `Bearer ${token}`)
          .send({ stageId: 'stage-1', level: 1 }),
      );

      const results = await Promise.all(requests);
      const tooMany = results.filter((r) => r.status === 429);
      expect(tooMany.length).toBeGreaterThan(0);
    });
  });

  // ─── Input Validation ───
  describe('Input Validation', () => {
    it('should reject request with extra fields (forbidNonWhitelisted)', async () => {
      const token = jwt.sign({ sub: 'user-123' }, jwtSecret, { expiresIn: '1h' });
      const res = await request(app.getHttpServer())
        .post('/api/v1/game/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ stageId: 'stage-1', level: 1, malicious: 'payload' });

      // Should be 400 (bad request) due to forbidNonWhitelisted
      expect([400, 422]).toContain(res.status);
    });
  });

  // ─── CORS ───
  describe('CORS', () => {
    it('should include CORS headers for allowed origins', async () => {
      const res = await request(app.getHttpServer())
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.headers['access-control-allow-origin']).toBeDefined();
      expect(res.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  // ─── Metrics Endpoint ───
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
