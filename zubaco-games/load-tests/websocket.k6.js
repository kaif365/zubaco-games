import http from 'k6/http';
import { check, sleep } from 'k6';
import ws from 'k6/ws';

export const options = {
  stages: [
    { duration: '20s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '2m', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ws_connecting: ['p(95)<1000'],
    ws_msgs_received: ['count>100'],
  },
};

const BASE_URL = __ENV.WS_URL || 'ws://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-jwt-token';

export default function () {
  const url = `${BASE_URL}/game`;

  const res = ws.connect(url, {
    headers: { Authorization: `Bearer ${JWT_TOKEN}` },
  }, function (socket) {
    socket.on('open', () => {
      // Join a session
      socket.send(JSON.stringify({
        event: 'join-session',
        data: { sessionId: `session-${__VU}` },
      }));
    });

    socket.on('message', (msg) => {
      const data = JSON.parse(msg);
      check(data, {
        'received valid event': (d) => d.event !== undefined,
      });
    });

    socket.on('error', (e) => {
      console.error(`WebSocket error: ${e.error()}`);
    });

    // Keep connection alive for 10-30s
    sleep(Math.random() * 20 + 10);
    socket.close();
  });

  check(res, {
    'WebSocket connected': (r) => r && r.status === 101,
  });

  sleep(1);
}
