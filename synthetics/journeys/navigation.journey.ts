import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Navigation Journey', ({ page, params }) => {
  monitor.use({
    id: 'navigation-journey',
    schedule: 10,
  });

  step('Login', async () => {
    await page.goto(`${params.url}/login`);
    await page.fill('[data-testid="username-input"]', params.username);
    await page.fill('[data-testid="password-input"]', params.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard-heading"]');
  });

  step('Navigate to Products', async () => {
    await page.click('[data-testid="nav-products"]');
    await page.waitForSelector('[data-testid="products-heading"]');
    expect(await page.locator('[data-testid="products-heading"]').textContent()).toBe('Products');
  });

  step('Navigate to Cart', async () => {
    await page.click('[data-testid="nav-cart"]');
    await page.waitForSelector('[data-testid="cart-heading"]');
    expect(await page.locator('[data-testid="cart-heading"]').textContent()).toBe('Your Cart');
  });

  step('Navigate to Profile', async () => {
    await page.click('[data-testid="nav-profile"]');
    await page.waitForSelector('[data-testid="profile-heading"]');
    expect(await page.locator('[data-testid="profile-heading"]').textContent()).toBe('Your Profile');
  });

  step('Navigate to Settings', async () => {
    await page.click('[data-testid="nav-settings"]');
    await page.waitForSelector('[data-testid="settings-heading"]');
    expect(await page.locator('[data-testid="settings-heading"]').textContent()).toBe('Settings');
  });

  step('Navigate back to Dashboard', async () => {
    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForSelector('[data-testid="dashboard-heading"]');
    expect(await page.locator('[data-testid="summary-cards"]').isVisible()).toBe(true);
  });
});
