import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Profile Edit Journey', ({ page, params }) => {
  monitor.use({
    id: 'profile-edit-journey',
    schedule: 10,
    tags: ['user-management', 'form-submission'],
    screenshots: 'only-on-failure',
  });

  step('Login', async () => {
    await page.goto(`${params.url}/login`);
    await page.fill('[data-testid="username-input"]', params.username);
    await page.fill('[data-testid="password-input"]', params.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard-heading"]');
  });

  step('Navigate to profile', async () => {
    await page.click('[data-testid="nav-profile"]');
    await page.waitForSelector('[data-testid="profile-heading"]');
  });

  step('Edit profile fields', async () => {
    await page.fill('[data-testid="profile-name"]', 'Updated User');
    await page.fill('[data-testid="profile-email"]', 'updated@example.com');
    await page.fill('[data-testid="profile-bio"]', 'Updated bio text for testing');
  });

  step('Save and verify success', async () => {
    await page.click('[data-testid="profile-save"]');
    await page.waitForSelector('[data-testid="profile-success"]');
    const successText = await page.locator('[data-testid="profile-success"]').textContent();
    expect(successText).toContain('updated successfully');
  });
});
