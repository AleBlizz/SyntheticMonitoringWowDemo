// ============================================================
// ELASTIC-ONLY: Observability Dashboard Journey
//
// Tests the /observability page which displays live server
// metrics and a trace correlation demo. This page exists
// specifically to showcase what Elastic can do that
// competitors cannot: unified metrics + traces + synthetics
// all queryable in Elasticsearch via Kibana.
// ============================================================
import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Observability Dashboard Journey', ({ page, params }) => {
  monitor.use({
    id: 'observability-dashboard-journey',
    schedule: 10,
    tags: ['observability', 'elastic-only', 'differentiator'],
    screenshots: 'on',
  });

  step('Login', async () => {
    await page.goto(`${params.url}/login`);
    await page.fill('[data-testid="username-input"]', params.username);
    await page.fill('[data-testid="password-input"]', params.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard-heading"]');
  });

  step('Navigate to Observability page', async () => {
    await page.click('[data-testid="nav-observability"]');
    await page.waitForSelector('[data-testid="observability-heading"]');
    expect(await page.locator('[data-testid="observability-heading"]').textContent()).toBe('Observability');
  });

  step('Verify metrics panel loads with live data', async () => {
    // Wait for the client-side JS to fetch and display metrics
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="request-count"]');
      return el && el.textContent !== '-';
    });

    const requestCount = await page.locator('[data-testid="request-count"]').textContent();
    expect(parseInt(requestCount!)).toBeGreaterThan(0);

    expect(await page.locator('[data-testid="error-count"]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid="avg-response-time"]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid="memory-usage"]').isVisible()).toBe(true);
  });

  step('Run trace demo and verify result', async () => {
    await page.click('[data-testid="trace-demo-button"]');

    // Wait for the trace result to appear
    await page.waitForSelector('[data-testid="trace-result"]', { state: 'visible' });
    await page.waitForSelector('[data-testid="trace-id"]');

    const traceIdText = await page.locator('[data-testid="trace-id"]').textContent();
    expect(traceIdText).toContain('Trace ID');

    // Verify the full trace details JSON is displayed
    expect(await page.locator('[data-testid="trace-details"]').isVisible()).toBe(true);
  });

  step('Verify competitor comparison table exists', async () => {
    await page.waitForSelector('[data-testid="comparison-table"]');
    expect(await page.locator('[data-testid="comparison-heading"]').textContent())
      .toContain('Elastic vs Competitors');
  });
});
