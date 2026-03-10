import { journey, step, monitor, expect } from '@elastic/synthetics';

journey('API Health Journey', ({ params, request }) => {
  monitor.use({
    id: 'api-health-journey',
    schedule: 5,
    tags: ['api', 'health-check', 'infrastructure'],
    screenshots: 'on',
  });

  step('Check API health endpoint', async () => {
    const response = await request.get(`${params.url}/api/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
  });
});
