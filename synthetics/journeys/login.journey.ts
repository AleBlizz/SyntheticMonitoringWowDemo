import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Login Journey', ({ page, params }) => {
  monitor.use({
    id: 'login-journey',
    schedule: 10,
    tags: ['auth', 'critical-path', 'user-flow'],
    screenshots: 'on',
  });

  step('Navigate to login page', async () => {
    await page.goto(`${params.url}/login`);
    const heading = await page.locator('[data-testid="login-heading"]');
    expect(await heading.textContent()).toBe('Login');
  });

  step('Fill in credentials', async () => {
    await page.fill('[data-testid="username-input"]', params.username);
    await page.fill('[data-testid="password-input"]', params.password);
  });

  step('Submit login form', async () => {
    await page.click('[data-testid="login-button"]');
  });

  step('Verify dashboard loads', async () => {
    await page.waitForSelector('[data-testid="dashboard-heading"]');
    const heading = await page.locator('[data-testid="dashboard-heading"]').textContent();
    expect(heading).toContain('Welcome');
    expect(await page.locator('[data-testid="welcome-message"]').isVisible()).toBe(true);
  });
});
