import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Checkout Journey', ({ page, params }) => {
  monitor.use({
    id: 'checkout-journey',
    schedule: 10,
    tags: ['e-commerce', 'checkout', 'critical-path', 'revenue'],
    screenshots: 'on',
  });

  step('Login', async () => {
    await page.goto(`${params.url}/login`);
    await page.fill('[data-testid="username-input"]', params.username);
    await page.fill('[data-testid="password-input"]', params.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard-heading"]');
  });

  step('Add a product to cart', async () => {
    await page.goto(`${params.url}/products/1`);
    await page.waitForSelector('[data-testid="product-detail-name"]');
    await page.click('[data-testid="add-to-cart-button"]');
    await page.waitForSelector('[data-testid="cart-heading"]');
  });

  step('Go to cart and proceed to checkout', async () => {
    await page.waitForSelector('[data-testid="cart-table"]');
    expect(await page.locator('[data-testid="cart-total"]').isVisible()).toBe(true);
    await page.click('[data-testid="checkout-button"]');
    await page.waitForSelector('[data-testid="checkout-heading"]');
  });

  step('Fill shipping information', async () => {
    await page.waitForSelector('[data-testid="step-shipping"]');
    await page.fill('[data-testid="shipping-name"]', 'John Doe');
    await page.fill('[data-testid="shipping-address"]', '123 Test Street');
    await page.fill('[data-testid="shipping-city"]', 'Test City');
    await page.fill('[data-testid="shipping-zip"]', '12345');
    await page.click('[data-testid="next-to-payment"]');
  });

  step('Fill payment information', async () => {
    await page.waitForSelector('[data-testid="step-payment"]', { state: 'visible' });
    await page.fill('[data-testid="payment-card"]', '4111111111111111');
    await page.fill('[data-testid="payment-expiry"]', '12/28');
    await page.fill('[data-testid="payment-cvv"]', '123');
    await page.click('[data-testid="next-to-review"]');
  });

  step('Review and place order', async () => {
    await page.waitForSelector('[data-testid="step-review"]', { state: 'visible' });
    expect(await page.locator('[data-testid="review-summary"]').isVisible()).toBe(true);
    await page.click('[data-testid="place-order-button"]');
  });

  step('Verify order confirmation', async () => {
    await page.waitForSelector('[data-testid="order-confirmation"]');
    const successText = await page.locator('[data-testid="order-success"]').textContent();
    expect(successText).toContain('Successfully');
    expect(await page.locator('[data-testid="order-number"]').isVisible()).toBe(true);
  });
});
