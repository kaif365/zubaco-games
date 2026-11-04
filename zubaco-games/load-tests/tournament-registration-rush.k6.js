import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for Tournament Registration Rush (Module 8.1)
const entrySuccessRate = new Rate('tournament_entry_success');
const entryConflictRate = new Rate('tournament_entry_conflicts');
const entryLatency = new Trend('tournament_entry_latency');
const totalDebits = new Counter('total_entry_fee_debits');

export const options = {
  stages: [
    { duration: '10s', target: 200 },   // Warm-up to 200 VUs
    { duration: '20s', target: 1000 },  // Ramp to 1,000 concurrent VUs
    { duration: '30s', target: 2000 },  // Peak: 2,000 concurrent VUs registration rush
    { duration: '15s', target: 500 },   // Throttling down
    { duration: '5s', target: 0 },      // Ramp down
  ],
  thresholds: {
    // P99 latency target < 150ms for tournament registration
    'tournament_entry_latency': ['p(95)<100', 'p(99)<150'],
    // At least 99% of valid attempts succeed without 500 errors
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOURNAMENT_ID = __ENV.TOURNAMENT_ID || 'tournament_rush_001';

export default function () {
  const vuId = __VU;
  const iterId = __ITER;
  const userId = `user_bench_${vuId}`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer test_token_${userId}`,
    'X-Correlation-ID': `rush-${vuId}-${iterId}`,
    'X-Idempotency-Key': `entryfee:${TOURNAMENT_ID}:${userId}`,
  };

  group('Tournament Registration Rush', () => {
    const payload = JSON.stringify({
      tournamentId: TOURNAMENT_ID,
      userId: userId,
      entryFee: 50, // ₹50 entry fee
    });

    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/v1/tournaments/${TOURNAMENT_ID}/join`, payload, {
      headers: headers,
    });
    const duration = Date.now() - start;

    entryLatency.add(duration);

    const isSuccess = res.status === 200 || res.status === 201;
    const isConflict = res.status === 409 || res.status === 400; // duplicate or insufficient balance

    entrySuccessRate.add(isSuccess);
    entryConflictRate.add(isConflict);

    if (isSuccess) {
      totalDebits.add(1);
    }

    check(res, {
      'status is 2xx or graceful 4xx client rejection': (r) => r.status < 500,
      'response under 150ms': () => duration < 150,
    });
  });

  sleep(Math.random() * 0.5 + 0.1); // rapid retry / think time (100ms - 600ms)
}

export function handleSummary(data) {
  return {
    'tournament-registration-rush-summary.json': JSON.stringify(data, null, 2),
  };
}

