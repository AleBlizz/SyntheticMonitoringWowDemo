import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Failed Login Journey', ({ page, params }) => {
  monitor.use({
    id: 'failed-login-journey',
    schedule: 10,
  });

  step('Navigate to login page', async () => {
    await page.goto(`${params.url}/login`);
    await page.waitForSelector('[data-testid="login-heading"]');
  });

  step('Enter wrong credentials', async () => {
    await page.fill('[data-testid="username-input"]', 'wronguser');
    await page.fill('[data-testid="password-input"]', 'wrongpass');
  });

  step('Submit and verify error message', async () => {
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="login-error"]');
    const errorText = await page.locator('[data-testid="login-error"]').textContent();
    expect(errorText).toContain('Invalid');
  });
});
