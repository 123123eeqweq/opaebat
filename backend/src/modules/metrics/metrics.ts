/**
 * Prometheus metrics
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

// HTTP metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// WebSocket metrics
export const wsConnectionsTotal = new Counter({
  name: 'ws_connections_total',
  help: 'Total WebSocket connections (connect/disconnect)',
  labelNames: ['event'],
  registers: [register],
});

export const wsConnectionsActive = new Gauge({
  name: 'ws_connections_active',
  help: 'Currently active WebSocket connections',
  registers: [register],
});

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });
