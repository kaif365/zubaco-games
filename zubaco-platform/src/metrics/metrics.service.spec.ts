import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { Response } from 'express';

describe('MetricsService & MetricsController (Module 9.4)', () => {
  let service: MetricsService;
  let controller: MetricsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    controller = module.get<MetricsController>(MetricsController);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });

  describe('Counter metrics', () => {
    it('should initialize default counter and increment without labels', async () => {
      service.incrementCounter('wallet_transactions_total');
      service.incrementCounter('wallet_transactions_total', undefined, 2);

      const output = await service.getMetrics();
      expect(output).toContain('# HELP wallet_transactions_total Total wallet financial transactions executed');
      expect(output).toContain('# TYPE wallet_transactions_total counter');
      expect(output).toContain('wallet_transactions_total 3');
    });

    it('should increment counters with multidimensional labels', async () => {
      service.incrementCounter('anti_cheat_flags_total', { reason: 'speedhack', severity: 'HIGH' }, 1);
      service.incrementCounter('anti_cheat_flags_total', { reason: 'cadence', severity: 'MEDIUM' }, 2);

      const output = await service.getMetrics();
      expect(output).toContain('anti_cheat_flags_total{reason="speedhack",severity="HIGH"} 1');
      expect(output).toContain('anti_cheat_flags_total{reason="cadence",severity="MEDIUM"} 2');
    });
  });

  describe('Gauge metrics', () => {
    it('should update active websocket gauge with instantaneous values', async () => {
      service.setGauge('active_websocket_connections', 1420);

      let output = await service.getMetrics();
      expect(output).toContain('# TYPE active_websocket_connections gauge');
      expect(output).toContain('active_websocket_connections 1420');

      service.setGauge('active_websocket_connections', 1250);
      output = await service.getMetrics();
      expect(output).toContain('active_websocket_connections 1250');
    });

    it('should support gauges with labels', async () => {
      service.setGauge('tournament_stage_participants', 48, { stage: 'QUARTER_FINAL', tournamentId: 'tourn-1' });

      const output = await service.getMetrics();
      expect(output).toContain('tournament_stage_participants{stage="QUARTER_FINAL",tournamentId="tourn-1"} 48');
    });
  });

  describe('Histogram metrics', () => {
    it('should bucket observations and accumulate sum and +Inf', async () => {
      // Buckets: [0.01, 0.05, 0.1, 0.15, 0.3, 0.5, 1, 2.5, 5]
      service.observeHistogram('http_request_duration_seconds', 0.04, { route: '/api/v1/tournaments' });
      service.observeHistogram('http_request_duration_seconds', 0.12, { route: '/api/v1/tournaments' });
      service.observeHistogram('http_request_duration_seconds', 0.8, { route: '/api/v1/tournaments' });

      const output = await service.getMetrics();
      expect(output).toContain('# TYPE http_request_duration_seconds histogram');
      expect(output).toContain('http_request_duration_seconds_bucket{route="/api/v1/tournaments",le="0.05"} 1');
      expect(output).toContain('http_request_duration_seconds_bucket{route="/api/v1/tournaments",le="0.15"} 2');
      expect(output).toContain('http_request_duration_seconds_bucket{route="/api/v1/tournaments",le="1"} 3');
      expect(output).toContain('http_request_duration_seconds_bucket{route="/api/v1/tournaments",le="+Inf"} 3');
      expect(output).toContain('http_request_duration_seconds_sum{route="/api/v1/tournaments"} 0.96');
    });
  });

  describe('MetricsController', () => {
    it('should serve Prometheus exposition formatted text with correct HTTP header', async () => {
      service.incrementCounter('http_requests_total', { status: '200' }, 5);

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getMetrics(res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/plain; version=0.0.4; charset=utf-8',
      );
      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining('http_requests_total{status="200"} 5'),
      );
    });
  });
});

