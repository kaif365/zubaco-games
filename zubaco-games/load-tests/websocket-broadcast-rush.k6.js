import { check, sleep } from 'k6';
import ws from 'k6/ws';
import { Trend, Counter, Rate } from 'k6/metrics';

// Custom metrics for WebSocket Fan-Out Benchmark (Module 8.2)
const wsConnectionTime = new Trend('ws_connection_duration');
const wsMessageLatency = new Trend('ws_broadcast_latency');
const wsMessagesReceived = new Counter('ws_broadcast_messages_received');
const wsDroppedConnections = new Rate('ws_dropped_connections');

export const options = {
  stages: [
    { duration: '15s', target: 250 },   // Connect 250 concurrent players
    { duration: '30s', target: 500 },   // Scale to 500 players
    { duration: '45s', target: 1000 },  // Peak: 1,000 concurrent active WebSockets
    { duration: '30s', target: 1000 },  // Hold steady during STAGE_START broadcast burst
    { duration: '15s', target: 0 },     // Clean disconnect
  ],
  thresholds: {
    // 95% of connections established within 500ms
    'ws_connection_duration': ['p(95)<500', 'p(99)<1000'],
    // Broadcast fan-out delivery latency under 50ms
    'ws_broadcast_latency': ['p(95)<50', 'p(99)<100'],
    // Less than 0.1% dropped connections
    'ws_dropped_connections': ['rate<0.001'],
  },
};

const WS_URL = __ENV.WS_URL || 'ws://localhost:3000/tournament';
const TOURNAMENT_ID = __ENV.TOURNAMENT_ID || 'tournament_bench_001';

export default function () {
  const vuId = __VU;
  const userId = `ws_bench_user_${vuId}`;
  const connectStart = Date.now();

  const params = {
    headers: {
      Authorization: `Bearer mock_jwt_token_${userId}`,
    },
    tags: { my_tag: 'ws_fanout_rush' },
  };

  const res = ws.connect(WS_URL, params, function (socket) {
    wsConnectionTime.add(Date.now() - connectStart);

    socket.on('open', () => {
      // 1. Join Tournament Room
      socket.send(JSON.stringify({
        event: 'join-tournament',
        data: {
          tournamentId: TOURNAMENT_ID,
          userId: userId,
        },
      }));

      // 2. Periodic Keep-Alive Ping (every 10s)
      socket.setInterval(() => {
        socket.send(JSON.stringify({
          event: 'heartbeat',
          data: { timestamp: Date.now() },
        }));
      }, 10000);
    });

    socket.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg);
        wsMessagesReceived.add(1);

        // Check for STAGE_START or STAGE_RESULTS broadcast
        if (parsed.event === 'STAGE_START' || parsed.event === 'COUNTDOWN_TICK') {
          if (parsed.data?.broadcastAt) {
            const sendTime = new Date(parsed.data.broadcastAt).getTime();
            const latency = Date.now() - sendTime;
            if (latency >= 0) {
              wsMessageLatency.add(latency);
            }
          }
        }

        check(parsed, {
          'valid JSON envelope received': (p) => p && typeof p === 'object',
        });
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    });

    socket.on('close', () => {
      // Normal closure
    });

    socket.on('error', (e) => {
      wsDroppedConnections.add(1);
      console.error(`Socket error for VU ${vuId}:`, e.error());
    });

    // Hold connection open during match window
    sleep(25);
    socket.close();
  });

  check(res, {
    'WebSocket 101 Switching Protocols handshake': (r) => r && r.status === 101,
  });

  wsDroppedConnections.add(!res || res.status !== 101 ? 1 : 0);
}

export function handleSummary(data) {
  return {
    'websocket-broadcast-rush-summary.json': JSON.stringify(data, null, 2),
  };
}

