import { TournamentGateway } from './tournament.gateway';

describe('High-Density WebSocket Fan-Out Benchmark (Module 8.2)', () => {
  let gateway: TournamentGateway;
  let mockRedis: any;
  let mockGraceService: any;
  let mockJwtService: any;

  // Mock Socket.IO server emitting to rooms
  let mockServer: any;
  let roomSubscribers: Map<string, Set<any>>;

  beforeEach(() => {
    roomSubscribers = new Map();

    mockServer = {
      to: jest.fn((room: string) => {
        return {
          emit: jest.fn((event: string, payload: any) => {
            const subscribers = roomSubscribers.get(room) || new Set();
            for (const sub of subscribers) {
              sub.receive(event, payload);
            }
          }),
        };
      }),
    };

    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
    };

    mockGraceService = {
      resumeSession: jest.fn(),
    };

    mockJwtService = {
      verify: jest.fn((token: string) => ({ sub: 'user_123' })),
    };

    gateway = new TournamentGateway(mockRedis, mockGraceService, mockJwtService);
    gateway.server = mockServer;
  });

  describe('1,000 Concurrent Subscriber Fan-Out Throughput', () => {
    it('broadcasts STAGE_START to 1,000 simultaneous clients in under 15 milliseconds', () => {
      const TOURNAMENT_ID = 't_grand_prix_2026';
      const ROOM = `tournament:${TOURNAMENT_ID}`;
      const CLIENT_COUNT = 1000;

      const receivedCounters: number[] = new Array(CLIENT_COUNT).fill(0);
      const mockClients: any[] = [];

      for (let i = 0; i < CLIENT_COUNT; i++) {
        const clientIndex = i;
        const client = {
          id: `socket_${clientIndex}`,
          receive: (event: string, payload: any) => {
            if (event === 'STAGE_START' && payload.tournamentId === TOURNAMENT_ID) {
              receivedCounters[clientIndex]++;
            }
          },
        };
        mockClients.push(client);
      }

      roomSubscribers.set(ROOM, new Set(mockClients));

      // Perform instantaneous countdown broadcast
      const start = performance.now();
      gateway.broadcastToTournament(TOURNAMENT_ID, 'STAGE_START', {
        tournamentId: TOURNAMENT_ID,
        stageNumber: 1,
        broadcastAt: new Date().toISOString(),
      });
      const durationMs = performance.now() - start;

      // Ensure every single one of the 1,000 clients received the payload
      expect(receivedCounters.every((c) => c === 1)).toBe(true);

      // Verify fan-out execution latency < 15ms
      expect(durationMs).toBeLessThan(15);
    });

    it('broadcasts STAGE_RESULTS with percentile qualifiers to 1,000 sockets without dropped packets', () => {
      const TOURNAMENT_ID = 't_semifinals';
      const ROOM = `tournament:${TOURNAMENT_ID}`;
      const CLIENT_COUNT = 1000;

      let totalDelivered = 0;
      const mockClients = Array.from({ length: CLIENT_COUNT }, (_, i) => ({
        id: `sock_${i}`,
        receive: (event: string, payload: any) => {
          if (event === 'STAGE_RESULTS') totalDelivered++;
        },
      }));

      roomSubscribers.set(ROOM, new Set(mockClients));

      gateway.broadcastStageResults(TOURNAMENT_ID, 2, {
        survivedCount: 500,
        eliminatedCount: 500,
        nextStageStartsInSeconds: 30,
        topQualifiers: [
          { userId: 'u1', score: 1980, rank: 1 },
          { userId: 'u2', score: 1950, rank: 2 },
        ],
      });

      expect(totalDelivered).toBe(1000);
      expect(mockServer.to).toHaveBeenCalledWith(ROOM);
    });
  });
});

