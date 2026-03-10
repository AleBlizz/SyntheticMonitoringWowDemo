import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Add to Cart Journey', ({ page, params }) => {
  monitor.use({
    id: 'add-to-cart-journey',
    schedule: 10,
    tags: ['e-commerce', 'cart', 'critical-path'],
    screenshots: 'on',
  });

  step('Login', async () => {
    await page.goto(`${params.url}/login`);
    await page.fill('[data-testid="username-input"]', params.username);
    await page.fill('[data-testid="password-input"]', params.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard-heading"]');
  });

  step('Browse to products', async () => {
    await page.click('[data-testid="nav-products"]');
    await page.waitForSelector('[data-testid="product-list"]');
  });

  step('View product detail', async () => {
    await page.click('[data-testid="product-link-1"]');
    await page.waitForSelector('[data-testid="product-detail-name"]');
    expect(await page.locator('[data-testid="product-detail-name"]').textContent()).toBe('Laptop Pro 15');
  });

  step('Add product to cart', async () => {
    await page.fill('[data-testid="quantity-input"]', '2');
    await page.click('[data-testid="add-to-cart-button"]');
    await page.waitForSelector('[data-testid="cart-heading"]');
  });

  step('Verify cart has items', async () => {
    await page.waitForSelector('[data-testid="cart-table"]');
    expect(await page.locator('[data-testid="cart-item-1"]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid="cart-badge"]').isVisible()).toBe(true);
  });
});
