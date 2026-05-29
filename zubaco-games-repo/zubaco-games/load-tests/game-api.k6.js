import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up
    { duration: '1m', target: 50 },    // Sustained load
    { duration: '2m', target: 100 },   // Peak load
    { duration: '1m', target: 200 },   // Stress test
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.05'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';
const HMAC_SECRET = __ENV.HMAC_SECRET || 'test-hmac-secret';

function generateHmac(timestamp, body) {
  // k6 doesn't have native HMAC - use pre-signed or skip in load test
  return 'load-test-signature';
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'X-Correlation-ID': `k6-${__VU}-${__ITER}`,
  };

  group('Health Checks', () => {
    const healthRes = http.get(`${BASE_URL}/health/live`, { headers });
    check(healthRes, {
      'health status 200': (r) => r.status === 200,
      'health response < 100ms': (r) => r.timings.duration < 100,
    });
    errorRate.add(healthRes.status !== 200);
    responseTime.add(healthRes.timings.duration);
  });

  group('API Endpoints', () => {
    // GET leaderboard / game state
    const getRes = http.get(`${BASE_URL}/api/v1/game/status`, { headers });
    check(getRes, {
      'GET status 2xx': (r) => r.status >= 200 && r.status < 300,
      'GET response < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(getRes.status >= 400);
    responseTime.add(getRes.timings.duration);
  });

  group('Game Session', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sessionBody = JSON.stringify({
      userId: `user-${__VU}`,
      stageId: 'stage-1',
    });

    const sessionHeaders = {
      ...headers,
      'X-Timestamp': timestamp,
      'X-Signature': generateHmac(timestamp, sessionBody),
      'X-Idempotency-Key': `${__VU}-${__ITER}-${Date.now()}`,
    };

    const sessionRes = http.post(`${BASE_URL}/api/v1/sessions`, sessionBody, {
      headers: sessionHeaders,
    });

    check(sessionRes, {
      'session created 2xx': (r) => r.status >= 200 && r.status < 300,
      'session response < 1s': (r) => r.timings.duration < 1000,
    });
    errorRate.add(sessionRes.status >= 400);
    responseTime.add(sessionRes.timings.duration);
  });

  group('Metrics Endpoint', () => {
    const metricsRes = http.get(`${BASE_URL}/metrics`, { headers });
    check(metricsRes, {
      'metrics accessible': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 2 + 1); // 1-3s think time
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const { metrics } = data;
  return `
=== LOAD TEST RESULTS ===
Requests: ${metrics.http_reqs?.values?.count || 0}
Failed:   ${metrics.http_req_failed?.values?.rate?.toFixed(4) || 0}
P95:      ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms
P99:      ${metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0}ms
Average:  ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms
`;
}
