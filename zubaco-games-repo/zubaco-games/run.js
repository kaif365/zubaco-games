 import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// ====================================================
// STATUS CODE COUNTERS
// ====================================================

const status200 = new Counter('status_200');
const status201 = new Counter('status_201');
const status400 = new Counter('status_400');
const status401 = new Counter('status_401');
const status404 = new Counter('status_404');
const status500 = new Counter('status_500');

// ====================================================
// TEST CONFIG
// ====================================================

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '3m', target: 250 },
    { duration: '3m', target: 500 },
    { duration: '5m', target: 750 },
    { duration: '5m', target: 1000 },
    { duration: '10m', target: 1000 },
    { duration: '3m', target: 0 },
  ],

  thresholds: {
    http_req_failed: ['rate<0.20'],
    http_req_duration: ['p(95)<2000'],
  },
};

const STAGE_ID = 'a665e3d6-b04f-49c6-9da5-bddaf5db8956';

const FRONTEND_ORIGIN =
  'https://sequence-recall-frontend.dev.ZUBACO.app';

// ====================================================
// STATUS TRACKER FUNCTION
// ====================================================

function trackStatus(res, apiName) {

  if (!res) {

    console.log(`${apiName} FAILED - NO RESPONSE`);

    return;
  }

  console.log(
    `${apiName} | STATUS: ${res.status} | DURATION: ${res.timings.duration}ms`
  );

  // FAILURE LOGS
  if (res.status < 200 || res.status >= 300) {

    console.log(`❌ ${apiName} FAILED`);

    console.log(`STATUS: ${res.status}`);

    console.log(`RESPONSE BODY: ${res.body}`);

    console.log(`ERROR CODE: ${res.error_code || 'N/A'}`);

    console.log(`ERROR: ${res.error || 'N/A'}`);

    console.log(`TIMINGS: ${JSON.stringify(res.timings)}`);
  }

  // STATUS COUNTERS
  if (res.status === 200) status200.add(1);
  if (res.status === 201) status201.add(1);
  if (res.status === 400) status400.add(1);
  if (res.status === 401) status401.add(1);
  if (res.status === 404) status404.add(1);
  if (res.status === 500) status500.add(1);
}

// ====================================================
// MAIN TEST
// ====================================================

export default function () {

  // ====================================================
  // 1. CREATE SESSION / GET TOKEN
  // ====================================================

  const authPayload = JSON.stringify({
    stageId: STAGE_ID,
  });

  const authHeaders = {
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
      origin: FRONTEND_ORIGIN,
    },
    timeout: '60s',
  };

  const authRes = http.post(
    'https://ZUBACO-staging-mock-user.projectlabs.in/user/auth/dev-session',
    authPayload,
    authHeaders
  );

  trackStatus(authRes, 'AUTH');

  const authSuccess = check(authRes, {
    'Auth API successful': (r) =>
      r.status >= 200 && r.status < 300,
  });

  if (!authSuccess) {

    console.log('❌ AUTH FAILED');

    console.log(`STATUS: ${authRes.status}`);

    console.log(`BODY: ${authRes.body}`);

    return;
  }

  const authBody = authRes.json();

  // ====================================================
  // TOKEN EXTRACTION
  // ====================================================

  const token = authBody.data.token;

  if (!token) {

    console.log('❌ TOKEN NOT FOUND');

    console.log(`AUTH RESPONSE: ${authRes.body}`);

    return;
  }

  console.log(`✅ TOKEN GENERATED SUCCESSFULLY`);

  // ====================================================
  // COMMON HEADERS
  // ====================================================

  const commonHeaders = {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      origin: FRONTEND_ORIGIN,
    },
    timeout: '60s',
  };

  // ====================================================
  // 2. FETCH GAME CONFIG
  // ====================================================

  const configRes = http.get(
    `https://sequence-recall.dev.ZUBACO.app/v1/game/config/${STAGE_ID}`,
    commonHeaders
  );

  trackStatus(configRes, 'CONFIG');

  const configSuccess = check(configRes, {
    'Config API successful': (r) =>
      r.status >= 200 && r.status < 300,
  });

  if (!configSuccess) {

    console.log('❌ CONFIG FAILED');

    console.log(`STATUS: ${configRes.status}`);

    console.log(`BODY: ${configRes.body}`);
  }

  sleep(1);

  // ====================================================
  // 3. START GAME
  // ====================================================

  const startPayload = JSON.stringify({
    iv: 'bHAQPVKy9kQld4Pv',
    ciphertext:
      'HVKFveEwD05JNMUAHb2Z0QgzJbuBPN3Wsaa3ZHuBodLkzZTceLskGxgbOcnG51CPVrA=',
    tag: 'kQYRNCVZ7o/TmCb0PiwNqw==',
  });

  const startRes = http.post(
    'https://sequence-recall.dev.ZUBACO.app/v1/game/start',
    startPayload,
    commonHeaders
  );

  trackStatus(startRes, 'START GAME');

  const startGameSuccess = check(startRes, {
    'Start game successful': (r) =>
      r.status >= 200 && r.status < 300,
  });

  if (!startGameSuccess) {

    console.log('❌ START GAME FAILED');

    console.log(`STATUS: ${startRes.status}`);

    console.log(`BODY: ${startRes.body}`);

    console.log(`TIMINGS: ${JSON.stringify(startRes.timings)}`);
  }

  sleep(1);

  // ====================================================
  // 4. NEXT SEQUENCE
  // ====================================================

  const nextSequencePayload = JSON.stringify({
    iv: 'w1/Ih0cNp7OUoSL4',
    ciphertext:
      'MZSpMymSQ9SbP8AXyI1BmJbHAsqydL4eVS8ngVlScu1wWzEu17dlz3eHEki3BR/MuBVT5OAXkemz0jACeF1OQKqiKgk2uI8eKf8zt7fH4X50HQT1dnQ6vh8NxERaIdelxLMyOrZiJGDPXjOtfbiKqeQULX/yLkJhpZBrzYBR6kNVW7m3XgV4RnfY0MjgJttQEP+HEBxtoRAP',
    tag: '5YoAvLZeQDLs8j2A2SlrzQ==',
  });

  for (let i = 0; i < 5; i++) {

    const nextSeqRes = http.post(
      'https://sequence-recall.dev.ZUBACO.app/v1/game/next-sequence',
      nextSequencePayload,
      commonHeaders
    );

    trackStatus(nextSeqRes, `NEXT SEQUENCE ${i + 1}`);

    const nextSequenceSuccess = check(nextSeqRes, {
      'Next sequence successful': (r) =>
        r.status >= 200 && r.status < 300,
    });

    if (!nextSequenceSuccess) {

      console.log(`❌ NEXT SEQUENCE FAILED - ITERATION ${i + 1}`);

      console.log(`STATUS: ${nextSeqRes.status}`);

      console.log(`BODY: ${nextSeqRes.body}`);

      console.log(`TIMINGS: ${JSON.stringify(nextSeqRes.timings)}`);
    }

    sleep(2);
  }

  sleep(1);
}

// ====================================================
// HTML REPORT
// ====================================================

export function handleSummary(data) {
  return {
    'summary2-1000-users.html': htmlReport(data),
  };
}