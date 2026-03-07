import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('Performance Journey', ({ page, params }) => {
  monitor.use({
    id: 'performance-journey',
    schedule: 10,
  });

  step('Load slow page with 2-second delay', async () => {
    await page.goto(`${params.url}/slow?delay=2000`, { waitUntil: 'load' });
    await page.waitForSelector('[data-testid="slow-heading"]');
    const message = await page.locator('[data-testid="slow-message"]').textContent();
    expect(message).toContain('2000');
  });

  step('Verify page rendered correctly', async () => {
    expect(await page.locator('[data-testid="slow-timestamp"]').isVisible()).toBe(true);
    const message = await page.locator('[data-testid="slow-message"]').textContent();
    expect(message).toContain('delayed');
  });
});
