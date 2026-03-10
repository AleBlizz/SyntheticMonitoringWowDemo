import type { SyntheticsConfig } from '@elastic/synthetics';
import * as dotenv from 'dotenv';
dotenv.config();

// ──────────────────────────────────────────────────────────────────
// Environment-specific target URLs
//
// Select with:  MY_ENV=staging npx @elastic/synthetics journeys
//               MY_ENV=staging npx @elastic/synthetics push
// Or put MY_ENV in your .env file.
// ──────────────────────────────────────────────────────────────────
const ENVIRONMENTS: Record<string, string> = {
  // Local dev — server running on your machine
  development: 'http://localhost:3000',

  // External IP / domain of your production deployment
  //production: 'http://35.226.244.170'
  production: process.env.SYNTH_TARGET_URL || ''
};

export default (): SyntheticsConfig => {
  const currentEnv = process.env.MY_ENV || 'development';
  const targetUrl = process.env.SYNTH_TARGET_URL || ENVIRONMENTS[currentEnv] || ENVIRONMENTS.development;

  console.log(`[synthetics] env="${currentEnv}" → target="${targetUrl}"`);

  return {
    params: {
      url: targetUrl,
      username: process.env.SYNTH_USERNAME || 'testuser',
      password: process.env.SYNTH_PASSWORD || 'testpass123',
    },
    playwrightOptions: {
      ignoreHTTPSErrors: true,
    },
    monitor: {
      tags: ['synthetic-monitoring-demo'],
      schedule: 10,
      //privateLocations: ['my_kubernetes_cluster'],
      locations: [process.env.MONITOR_PRIVATE_LOCATION || 'germany'],
      enabled: true
    },
    project: {
      id: 'synthetic-monitoring-demo',
      url: process.env.KIBANA_URL || 'https://playgorund-v2.kb.europe-west9.gcp.elastic-cloud.com',
      space: 'default',
    },
  };
};
