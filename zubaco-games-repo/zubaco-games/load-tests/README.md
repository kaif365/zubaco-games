# Load Testing with k6

## Prerequisites
```bash
# Install k6
# Windows: choco install k6
# macOS: brew install k6
# Linux: https://k6.io/docs/get-started/installation/
```

## Running Tests

### Standard Load Test (per game)
```bash
k6 run --env BASE_URL=http://localhost:3001 --env API_KEY=your-key load-tests/game-api.k6.js
```

### WebSocket Stress Test
```bash
k6 run --env WS_URL=ws://localhost:3001 --env JWT_TOKEN=your-token load-tests/websocket.k6.js
```

### Soak Test (memory leaks)
```bash
k6 run --env BASE_URL=http://localhost:3001 load-tests/soak.k6.js
```

### All Games via Gateway
```bash
k6 run --env BASE_URL=http://localhost:80 --env API_KEY=your-key load-tests/game-api.k6.js
```

## Thresholds
- P95 response time < 500ms
- P99 response time < 1000ms
- Error rate < 5%
- WebSocket connection < 1000ms

## Output to Prometheus
```bash
k6 run --out experimental-prometheus-rw --env K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write load-tests/game-api.k6.js
```
