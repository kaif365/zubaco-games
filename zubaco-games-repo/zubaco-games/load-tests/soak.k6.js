import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Soak test - sustained moderate load for extended period
export const options = {
  stages: [
    { duration: '2m', target: 30 },    // Ramp up
    { duration: '30m', target: 30 },   // Sustained soak
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    errors: ['rate<0.02'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };

  group('Health', () => {
    const r = http.get(`${BASE_URL}/health/ready`, { headers });
    check(r, { 'ready 200': (r) => r.status === 200 });
    errorRate.add(r.status !== 200);
  });

  group('API', () => {
    const r = http.get(`${BASE_URL}/api/v1/game/status`, { headers });
    check(r, { 'api ok': (r) => r.status < 400 });
    errorRate.add(r.status >= 400);
  });

  sleep(2 + Math.random() * 3);
}
