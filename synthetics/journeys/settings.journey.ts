import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Settings Journey', ({ page, params }) => {
  monitor.use({
    id: 'settings-journey',
    schedule: 10,
  });

  step('Login', async () => {
    await page.goto(`${params.url}/login`);
    await page.fill('[data-testid="username-input"]', params.username);
    await page.fill('[data-testid="password-input"]', params.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard-heading"]');
  });

  step('Navigate to settings', async () => {
    await page.click('[data-testid="nav-settings"]');
    await page.waitForSelector('[data-testid="settings-heading"]');
  });

  step('Toggle switches', async () => {
    // Click the visible slider elements (the checkbox inputs are hidden by CSS)
    // Notifications is checked by default, uncheck it
    await page.click('[data-testid="toggle-notifications-slider"]');
    // Dark mode is unchecked by default, check it
    await page.click('[data-testid="toggle-darkmode-slider"]');
  });

  step('Change dropdown selections', async () => {
    await page.selectOption('[data-testid="select-language"]', 'es');
    await page.selectOption('[data-testid="select-timezone"]', 'America/New_York');
  });

  step('Select radio button', async () => {
    await page.click('[data-testid="radio-email-weekly"]');
  });

  step('Save and verify success', async () => {
    await page.click('[data-testid="settings-save"]');
    await page.waitForSelector('[data-testid="settings-success"]');
    const successText = await page.locator('[data-testid="settings-success"]').textContent();
    expect(successText).toContain('saved');
  });
});
