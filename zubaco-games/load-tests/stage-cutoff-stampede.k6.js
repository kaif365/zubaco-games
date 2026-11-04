import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// Custom metrics for Stage Cutoff Stampede (Module 8.3)
const submissionLatency = new Trend('cutoff_submission_latency');
const totalSubmissions = new Counter('cutoff_total_score_submissions');
const rankQueryLatency = new Trend('cutoff_rank_query_latency');
const submissionErrors = new Rate('cutoff_submission_errors');

export const options = {
  stages: [
    { duration: '3s', target: 200 },   // Initial wave
    { duration: '5s', target: 1000 },  // Stampede: 1,000 concurrent VUs submitting scores within 10s
    { duration: '10s', target: 1000 }, // Sustained burst at cutoff boundary
    { duration: '4s', target: 0 },     // Ramp down
  ],
  thresholds: {
    // P99 latency target < 150ms during cutoff inrush
    'cutoff_submission_latency': ['p(95)<100', 'p(99)<150'],
    // Fast rank query extraction under 50ms
    'cutoff_rank_query_latency': ['p(95)<30', 'p(99)<50'],
    // Zero 5xx server errors under inrush load
    'cutoff_submission_errors': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOURNAMENT_ID = __ENV.TOURNAMENT_ID || 'tournament_stampede_001';
const STAGE_NUMBER = 1;

export default function () {
  const vuId = __VU;
  const iterId = __ITER;
  const userId = `stampede_user_${vuId}`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer test_token_${userId}`,
    'X-Correlation-ID': `stampede-${vuId}-${iterId}`,
  };

  group('Cutoff Score Submission Burst', () => {
    // Generate realistic base score between 800 and 1950, and elapsed time between 30s and 120s
    const baseScore = Math.floor(Math.random() * 1150) + 800;
    const elapsedMs = Math.floor(Math.random() * 90000) + 30000;

    const payload = JSON.stringify({
      tournamentId: TOURNAMENT_ID,
      stageNumber: STAGE_NUMBER,
      userId: userId,
      score: baseScore,
      durationMs: elapsedMs,
      completedAt: new Date().toISOString(),
    });

    const startSubmit = Date.now();
    const res = http.post(`${BASE_URL}/api/v1/tournaments/${TOURNAMENT_ID}/submit-score`, payload, {
      headers: headers,
    });
    const submitDuration = Date.now() - startSubmit;

    submissionLatency.add(submitDuration);
    const isSuccess = res.status >= 200 && res.status < 300;
    submissionErrors.add(!isSuccess);

    if (isSuccess) {
      totalSubmissions.add(1);
    }

    check(res, {
      'score submission successful (2xx)': (r) => r.status >= 200 && r.status < 300,
      'submission response < 150ms': () => submitDuration < 150,
    });
  });

  group('Immediate Post-Cutoff Rank Extraction', () => {
    const startRank = Date.now();
    const rankRes = http.get(
      `${BASE_URL}/api/v1/tournaments/${TOURNAMENT_ID}/stages/${STAGE_NUMBER}/rank/${userId}`,
      { headers: headers },
    );
    const rankDuration = Date.now() - startRank;

    rankQueryLatency.add(rankDuration);

    check(rankRes, {
      'rank query returned 200': (r) => r.status === 200,
      'rank query latency < 50ms': () => rankDuration < 50,
    });
  });

  sleep(Math.random() * 0.2 + 0.05); // Rapid next attempt
}

export function handleSummary(data) {
  return {
    'stage-cutoff-stampede-summary.json': JSON.stringify(data, null, 2),
  };
}
