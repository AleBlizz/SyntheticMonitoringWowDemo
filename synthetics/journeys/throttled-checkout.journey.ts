// ============================================================
// ELASTIC DIFFERENTIATOR: Network Throttling
//
// This journey runs the exact same checkout flow but under
// simulated 3G network conditions. Elastic's built-in
// throttling lets you measure how your critical user journeys
// perform under constrained networks — directly in the
// monitor configuration, no external proxy needed.
//
// The throttling config is applied per-monitor via
// monitor.use(), which competitors either don't support
// or require separate infrastructure to achieve.
// ============================================================
import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Throttled Checkout Journey (3G)', ({ page, params }) => {
  monitor.use({
    id: 'throttled-checkout-journey',
    schedule: 10,
    tags: ['performance', 'throttled', '3g-simulation', 'e-commerce'],
    screenshots: 'on',
    throttling: {
      download: 1.6,  // 1.6 Mbps (slow 3G download)
      upload: 0.75,   // 0.75 Mbps (slow 3G upload)
      latency: 300,   // 300ms round-trip latency
    },
  });

  step('Login under throttled network', async () => {
    await page.goto(`${params.url}/login`);
    await page.fill('[data-testid="username-input"]', params.username);
    await page.fill('[data-testid="password-input"]', params.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard-heading"]');
  });

  step('Add product to cart', async () => {
    await page.goto(`${params.url}/products/1`);
    await page.waitForSelector('[data-testid="product-detail-name"]');
    await page.click('[data-testid="add-to-cart-button"]');
    await page.waitForSelector('[data-testid="cart-heading"]');
  });

  step('Proceed to checkout', async () => {
    await page.waitForSelector('[data-testid="cart-table"]');
    await page.click('[data-testid="checkout-button"]');
    await page.waitForSelector('[data-testid="checkout-heading"]');
  });

  step('Complete shipping form', async () => {
    await page.fill('[data-testid="shipping-name"]', 'Throttled User');
    await page.fill('[data-testid="shipping-address"]', '456 Slow Lane');
    await page.fill('[data-testid="shipping-city"]', 'Lagville');
    await page.fill('[data-testid="shipping-zip"]', '99999');
    await page.click('[data-testid="next-to-payment"]');
  });

  step('Complete payment form', async () => {
    await page.waitForSelector('[data-testid="step-payment"]', { state: 'visible' });
    await page.fill('[data-testid="payment-card"]', '4111111111111111');
    await page.fill('[data-testid="payment-expiry"]', '12/28');
    await page.fill('[data-testid="payment-cvv"]', '123');
    await page.click('[data-testid="next-to-review"]');
  });

  step('Place order and verify confirmation', async () => {
    await page.waitForSelector('[data-testid="step-review"]', { state: 'visible' });
    await page.click('[data-testid="place-order-button"]');
    await page.waitForSelector('[data-testid="order-confirmation"]');
    const success = await page.locator('[data-testid="order-success"]').textContent();
    expect(success).toContain('Successfully');
  });
});
