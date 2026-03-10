// ============================================================
// ELASTIC-ONLY DIFFERENTIATOR: Synthetic → APM Trace Correlation
//
// This journey hits /api/trace-demo which creates multiple
// APM spans (DB query, compute, external service call).
// Because Elastic's synthetic runner automatically injects
// a W3C traceparent header, the resulting APM trace in Kibana
// is linked directly to this synthetic monitor run.
//
// No other synthetic monitoring tool provides this level of
// end-to-end trace correlation out of the box.
//
// After pushing: Kibana → APM → Services → synth-monitor-server
// → Transactions → you'll see traces initiated by this monitor.
// ============================================================
import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Trace Correlation Journey', ({ params, request }) => {
  monitor.use({
    id: 'trace-correlation-journey',
    schedule: 10,
    tags: ['apm-correlation', 'elastic-only', 'differentiator'],
    screenshots: 'off',
  });

  step('Call trace-demo API and verify multi-span response', async () => {
    const response = await request.get(`${params.url}/api/trace-demo`);
    expect(response.status()).toBe(200);
    const body = await response.json();

    // Verify the backend created proper spans and returned stats
    expect(body).toHaveProperty('stats');
    expect(body.stats).toHaveProperty('count');
    expect(body.stats).toHaveProperty('avg');
    expect(body.stats.count).toBeGreaterThan(0);

    // Verify inventory check span completed
    expect(body).toHaveProperty('inventory');
    expect(body.inventory.available).toBe(true);
    expect(body.inventory).toHaveProperty('warehouse');

    // Verify trace context is present (proves APM correlation works)
    expect(body).toHaveProperty('trace');
    expect(body.trace).toHaveProperty('traceId');
    expect(body.trace).toHaveProperty('transactionId');

    // Verify product data was returned from the fetch-products span
    expect(body).toHaveProperty('products');
    expect(body.products.length).toBeGreaterThan(0);
  });

  step('Verify metrics endpoint tracks the request', async () => {
    const response = await request.get(`${params.url}/api/metrics`);
    expect(response.status()).toBe(200);
    const metrics = await response.json();

    expect(metrics.requestCount).toBeGreaterThan(0);
    expect(metrics).toHaveProperty('avgResponseTime');
    expect(metrics).toHaveProperty('memory');
    expect(metrics.memory).toHaveProperty('heapUsedMB');
  });
});
