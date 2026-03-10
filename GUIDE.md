# Elastic Synthetic Monitoring — Complete Setup Guide

This guide walks you through running the full demo stack: the Express test server with Elastic APM instrumentation, 13 synthetic monitor journeys, and everything connected to your Elastic Cloud cluster.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR ELASTIC CLOUD                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Elasticsearch│  │   Kibana     │  │   APM Server       │    │
│  │  .es.europe  │  │  .kb.europe  │  │  .apm.europe       │    │
│  │  -west9.gcp  │  │  -west9.gcp  │  │  -west9.gcp        │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘    │
│         │                 │                    │                │
│         │    ┌────────────┴─────┐              │                │
│         │    │ Synthetics App   │              │                │
│         │    │ (push monitors)  │              │                │
│         │    └──────────────────┘              │                │
│         │                                     │                │
└─────────┼─────────────────────────────────────┼────────────────┘
          │                                     │
          │          ┌──────────────────┐        │
          │          │  Express Server  │        │
          └──────────│  (your app)      │────────┘
                     │  port 3000       │
                     │  elastic-apm-node│
                     └──────────────────┘
                              ▲
                              │ HTTP (traceparent headers)
                     ┌────────┴─────────┐
                     │  Synthetic Runner │
                     │  (Playwright)     │
                     │  13 journeys      │
                     └──────────────────┘
```

---

## Your Elastic Cloud Endpoints

| Service         | URL                                                               |
|-----------------|-------------------------------------------------------------------|
| Elasticsearch   | `https://playgorund-v2.es.europe-west9.gcp.elastic-cloud.com`     |
| Kibana          | `https://playgorund-v2.kb.europe-west9.gcp.elastic-cloud.com`     |
| APM Server      | `https://playgorund-v2.apm.europe-west9.gcp.elastic-cloud.com`    |
| API Key         | `a1RIUXc1d0I5YTBWbHphTkQxNW06dXZCTzhES0Jfb1lFSjlTdmVZb2dZZw==` |

---

## Part 1: Run the Express Server Locally

### 1.1 Install dependencies

```bash
cd server
npm install
```

### 1.2 Start the server WITHOUT APM (quick local test)

```bash
APM_ACTIVE=false node app.js
```

The server starts at `http://localhost:3000`. You can verify it works:

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","timestamp":"...","uptime":...}
```

### 1.3 Start the server WITH APM connected to your cluster

Set the environment variables to point the APM agent at your Elastic Cloud APM server:

```bash
APM_SERVER_URL=https://playgorund-v2.apm.europe-west9.gcp.elastic-cloud.com \
APM_SECRET_TOKEN=a1RIUXc1d0I5YTBWbHphTkQxNW06dXZCTzhES0Jfb1lFSjlTdmVZb2dZZw== \
APM_SERVICE_NAME=synth-monitor-server \
NODE_ENV=development \
node app.js
```

You should see in the console:

```
Synthetic Monitoring Test Server running on http://localhost:3000
APM agent active: true
```

> **Note**: The API key you have is a Base64-encoded key. The `elastic-apm-node` agent accepts it via `secretToken`. If your cluster uses an APM-specific secret token instead, use that value. If authentication fails, you may need to configure the key as an `apiKey` instead — see section 1.4.

### 1.4 If the API Key requires `apiKey` auth instead of `secretToken`

Some Elastic Cloud deployments use API key auth for APM. If `secretToken` doesn't authenticate, edit the APM configuration in `server/app.js` (lines 7-13):

```js
const apm = require('elastic-apm-node').start({
  serviceName: process.env.APM_SERVICE_NAME || 'synth-monitor-server',
  serverUrl:   process.env.APM_SERVER_URL   || 'http://localhost:8200',
  apiKey:      process.env.APM_API_KEY      || '',       // ← use apiKey instead
  environment: process.env.NODE_ENV         || 'development',
  active:      process.env.APM_ACTIVE !== 'false',
});
```

Then start with:

```bash
APM_SERVER_URL=https://playgorund-v2.apm.europe-west9.gcp.elastic-cloud.com \
APM_API_KEY=EDuXlq0aIHYMTifLKW \
APM_SERVICE_NAME=synth-monitor-server \
NODE_ENV=development \
node app.js
```

### 1.5 Verify APM data in Kibana

1. Open Kibana: `https://playgorund-v2.kb.europe-west9.gcp.elastic-cloud.com`
2. Go to **Observability → APM → Services**
3. You should see a service called `synth-monitor-server`
4. Click it → **Transactions** → you'll see transactions for all your Express routes (`GET /dashboard`, `POST /login`, `GET /api/trace-demo`, etc.)

### 1.6 Test the trace-demo endpoint

```bash
curl http://localhost:3000/api/trace-demo | python3 -m json.tool
```

Response shows multi-span trace data:

```json
{
  "stats": { "count": 3, "min": 29.99, "max": 1299.99, "avg": 473.32, "total": 1419.97 },
  "inventory": { "available": true, "warehouse": "us-east-1" },
  "products": [ ... ],
  "trace": {
    "traceId": "abc123...",
    "transactionId": "def456...",
    "message": "This trace links the synthetic monitor run to the backend transaction..."
  }
}
```

---

## Part 2: Run Synthetic Journeys Locally

### 2.1 Install synthetics dependencies

```bash
cd synthetics
npm install
```

### 2.2 Run all 13 journeys against local server

Make sure the server is running on port 3000 (Part 1), then:

```bash
MY_ENV=development npx @elastic/synthetics journeys/
```

Expected output:

```
[synthetics] env="development" → target="http://localhost:3000"

Journey: Login Journey             ✓ (4 steps)
Journey: Failed Login Journey      ✓ (3 steps)
Journey: Navigation Journey        ✓ (6 steps)
Journey: Product Search Journey    ✓ (5 steps)
Journey: Add to Cart Journey       ✓ (5 steps)
Journey: Checkout Journey          ✓ (7 steps)
Journey: Profile Edit Journey      ✓ (4 steps)
Journey: Settings Journey          ✓ (6 steps)
Journey: Performance Journey       ✓ (2 steps)
Journey: API Health Journey        ✓ (1 step)
Journey: Trace Correlation Journey ✓ (2 steps)
Journey: Observability Dashboard   ✓ (5 steps)
Journey: Throttled Checkout (3G)   ✓ (6 steps)

56 passed (≈8s)
```

### 2.3 Run against your production server

If your server is deployed at `http://35.226.244.170`:

```bash
MY_ENV=production npx @elastic/synthetics journeys/
```

Or override with a custom URL:

```bash
SYNTH_TARGET_URL=http://35.226.244.170 npx @elastic/synthetics journeys/
```

### 2.4 Run a single journey

```bash
MY_ENV=development npx @elastic/synthetics journeys/login.journey.ts
```

### 2.5 Run with screenshots saved to disk

```bash
MY_ENV=development npx @elastic/synthetics journeys/ --screenshots on
```

---

## Part 3: Deploy to Kubernetes (GKE)

### 3.1 Build and push the Docker image

```bash
cd server

# Build with APM support baked in
docker build -t alessandrobrofferio273/my-server-synth:v3 --platform linux/amd64 . 

# Push to Docker Hub (or your registry)
docker push alessandrobrofferio273/my-server-synth:v3
```

### 3.2 Update the Kubernetes deployment

Edit `Kubernetes/deployment-app.yaml` to add the APM environment variables:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: express-app-service
spec:
  selector:
    app: express-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: express-app-deployment
  labels:
    app: express-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: express-app
  template:
    metadata:
      labels:
        app: express-app
    spec:
      containers:
      - name: express-app-container
        image: alessandrobrofferio273/my-server-synth:v3
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: APM_SERVER_URL
          value: "https://playgorund-v2.apm.europe-west9.gcp.elastic-cloud.com"
        - name: APM_SECRET_TOKEN
          valueFrom:
            secretKeyRef:
              name: elastic-apm-secret
              key: token
        - name: APM_SERVICE_NAME
          value: "synth-monitor-server"
```

### 3.3 Create the Kubernetes secret for the APM key

```bash
kubectl create secret generic elastic-apm-secret \
  --from-literal=token='a1RIUXc1d0I5YTBWbHphTkQxNW06dXZCTzhES0Jfb1lFSjlTdmVZb2dZZw=='
```

### 3.4 Deploy

```bash
kubectl apply -f Kubernetes/deployment-app.yaml
```

### 3.5 Get the external IP

```bash
kubectl get svc express-app-service
# Wait for EXTERNAL-IP to be assigned
```

Then update your `synthetics/synthetics.config.ts` production URL:

```typescript
production: 'http://<YOUR-EXTERNAL-IP>',
```

---

## Part 4: Push Monitors to Kibana

This is the key step — it registers all 13 journeys as live synthetic monitors in Kibana that run on a schedule.

### 4.1 Configure synthetics.config.ts

The config file at `synthetics/synthetics.config.ts` is already set up. The key fields:

```typescript
export default (): SyntheticsConfig => {
  return {
    params: {
      url: targetUrl,                    // ← where the monitors will hit
      username: 'testuser',
      password: 'testpass123',
    },
    monitor: {
      schedule: 10,                      // ← every 10 minutes
      enabled: true,                     // ← MUST be true for push
    },
    project: {
      id: 'synthetic-monitoring-demo',
      url: '<YOUR_KIBANA>',
      space: 'default',
    },
  };
};
```

### 4.2 Enable the monitors before pushing

The current config has `enabled: false`. You must change it to `true` before pushing:

```bash
cd synthetics
```

Edit `synthetics.config.ts` — change `enabled: false` to `enabled: true`:

```typescript
monitor: {
  tags: ['synthetic-monitoring-demo'],
  schedule: 10,
  enabled: true,           // ← change this
},
```

### 4.3 Choose where monitors run

**Option A: Elastic-managed locations (easiest)**

Remove or comment out `privateLocations` in `synthetics.config.ts`:

```typescript
monitor: {
  tags: ['synthetic-monitoring-demo'],
  schedule: 10,
  enabled: true,
  // privateLocations: ['my_kubernetes_cluster'],  // ← comment this out
  locations: ['europe-west2-a'],                   // ← add a managed location
},
```

Available managed locations include: `us-east4-a`, `us-west1-a`, `europe-west2-a`, `australia-southeast1-a`, `japan-east-1`, etc.

**Option B: Private location (your own K8s cluster)**

Keep `privateLocations: ['my_kubernetes_cluster']` and set up an Elastic Agent — see Part 5.

### 4.4 Set the target URL for push

The monitors need to reach your server. For pushing to Kibana where a managed location will run them, the target URL must be publicly accessible:

```bash
# Point monitors at your production server
export MY_ENV=production
```

Or if running from a private location inside the same K8s cluster:

```bash
export MY_ENV=staging
# This uses: http://synth-monitor-server.synthetic-monitoring.svc.cluster.local:3000
```

### 4.5 Push!

```bash
cd synthetics

# Generate an API key in Kibana: Stack Management → API keys → Create
# Or use your existing API key

SYNTHETICS_API_KEY=<YOUR_KEY> \
MY_ENV=production \
npx @elastic/synthetics push
```

The CLI will ask you to confirm. Type `y`:

```
Push monitors to https://playgorund-v2.kb.europe-west9.gcp.elastic-cloud.com?
  13 monitors will be created/updated

  y/n: y
```

> **Note on authentication**: The `push` command authenticates to Kibana. You can use:
> - `SYNTHETICS_API_KEY` environment variable (recommended)
> - `--auth <apiKey>` CLI flag
>
> The API key needs the `synthetics_write` privilege. If your key doesn't work for push, create a dedicated one in Kibana under **Stack Management → API Keys**.

### 4.6 Verify in Kibana

1. Open: **Kibana**
2. Navigate to **Observability → Synthetics → Monitors**
3. You should see all 13 monitors listed:

| Monitor                         | Type     | Schedule | Tags                                            |
|---------------------------------|----------|----------|--------------------------------------------------|
| Login Journey                   | Browser  | 10 min   | auth, critical-path, user-flow                   |
| Failed Login Journey            | Browser  | 10 min   | auth, error-handling, negative-test              |
| Navigation Journey              | Browser  | 10 min   | navigation, smoke-test, critical-path            |
| Product Search Journey          | Browser  | 10 min   | e-commerce, search, catalog                      |
| Add to Cart Journey             | Browser  | 10 min   | e-commerce, cart, critical-path                  |
| Checkout Journey                | Browser  | 10 min   | e-commerce, checkout, critical-path, revenue     |
| Profile Edit Journey            | Browser  | 10 min   | user-management, form-submission                 |
| Settings Journey                | Browser  | 10 min   | user-management, form-controls, settings         |
| Performance Journey             | Browser  | 10 min   | performance, latency, sla-tracking               |
| API Health Journey              | Browser  | 5 min    | api, health-check, infrastructure                |
| Trace Correlation Journey       | Browser  | 10 min   | apm-correlation, elastic-only, differentiator    |
| Observability Dashboard Journey | Browser  | 10 min   | observability, elastic-only, differentiator      |
| Throttled Checkout (3G)         | Browser  | 10 min   | performance, throttled, 3g-simulation            |

### 4.7 Update monitors after code changes

After editing journey files, simply push again — it's idempotent:

```bash
SYNTHETICS_API_KEY=<YOUR_KEY> \
MY_ENV=production \
npx @elastic/synthetics push
```
```

---

## Part 5: Private Location with Elastic Agent (K8s)

If you want monitors to run from your own Kubernetes cluster (instead of Elastic-managed locations), you need an Elastic Agent enrolled in Fleet.

### 5.1 Create a Private Location in Kibana

1. Open Kibana → **Observability → Synthetics → Settings** (gear icon)
2. Click **Private Locations → Create location**
3. Fill in:
   - **Name**: `my_kubernetes_cluster` (must match `privateLocations` in synthetics.config.ts)
   - **Agent policy**: Create a new one or select an existing Fleet agent policy
4. Save → note the **Agent Policy ID** (you'll need it to enroll the agent)

### 5.2 Get Fleet enrollment token

1. Kibana → **Fleet → Agent policies** → click the policy you assigned
2. Go to the **Enrollment tokens** tab
3. Copy the enrollment token

Or via API:

```bash
curl -s -X GET \
  "https://playgorund-v2.kb.europe-west9.gcp.elastic-cloud.com/api/fleet/enrollment_api_keys" \
  -H "kbn-xsrf: true" \
  -H "Authorization: ApiKey a1RIUXc1d0I5YTBWbHphTkQxNW06dXZCTzhES0Jfb1lFSjlTdmVZb2dZZw==" \
  | python3 -m json.tool
```

### 5.3 Deploy Elastic Agent to Kubernetes

Create `Kubernetes/elastic-agent.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elastic-agent-synthetics
  namespace: synthetic-monitoring
  labels:
    app: elastic-agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: elastic-agent
  template:
    metadata:
      labels:
        app: elastic-agent
    spec:
      containers:
      - name: elastic-agent
        # IMPORTANT: Must use the "-complete" image for synthetic monitors
        # The standard elastic-agent image does NOT include the browser/Playwright runtime
        image: docker.elastic.co/beats/elastic-agent-complete:8.17.0
        env:
        - name: FLEET_ENROLL
          value: "true"
        - name: FLEET_URL
          value: "https://playgorund-v2.fleet.europe-west9.gcp.elastic-cloud.com:443"
        - name: FLEET_ENROLLMENT_TOKEN
          valueFrom:
            secretKeyRef:
              name: elastic-agent-secret
              key: enrollment-token
        - name: KIBANA_FLEET_SETUP
          value: "true"
        - name: KIBANA_FLEET_HOST
          value: "https://playgorund-v2.kb.europe-west9.gcp.elastic-cloud.com"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        securityContext:
          runAsUser: 0
```

> **Important**: The Fleet URL for Elastic Cloud is usually at `https://<deployment>.fleet.<region>.gcp.elastic-cloud.com:443`. Find your exact Fleet URL in Kibana → Fleet → Settings → Fleet Server hosts.

### 5.4 Create the enrollment token secret

```bash
kubectl create namespace synthetic-monitoring

kubectl create secret generic elastic-agent-secret \
  --namespace synthetic-monitoring \
  --from-literal=enrollment-token='<YOUR_ENROLLMENT_TOKEN_FROM_STEP_5.2>'
```

### 5.5 Deploy the agent

```bash
kubectl apply -f Kubernetes/elastic-agent.yaml
```

### 5.6 Verify agent is enrolled

1. Kibana → **Fleet → Agents**
2. You should see a new agent with status "Healthy"
3. The agent will automatically start running any synthetic monitors assigned to the `my_kubernetes_cluster` private location

### 5.7 Push monitors to the private location

```bash
cd synthetics

# Make sure synthetics.config.ts has:
#   privateLocations: ['my_kubernetes_cluster']
#   enabled: true

SYNTHETICS_API_KEY=a1RIUXc1d0I5YTBWbHphTkQxNW06dXZCTzhES0Jfb1lFSjlTdmVZb2dZZw== \
MY_ENV=staging \
npx @elastic/synthetics push
```

`MY_ENV=staging` sets the target URL to the in-cluster Kubernetes service DNS:
`http://synth-monitor-server.synthetic-monitoring.svc.cluster.local:3000`

This means the Elastic Agent (running in the same cluster) can reach your server directly without any public exposure.

---

## Part 6: See Trace Correlation in Action (THE Differentiator)

This is the killer feature no competitor offers. When everything is connected:

### What happens under the hood:

1. Elastic Synthetic runner starts a journey (e.g., `trace-correlation.journey.ts`)
2. The runner automatically injects a `traceparent` HTTP header into every request
3. Your server's `elastic-apm-node` agent picks up the `traceparent` header
4. The APM agent creates a **child transaction** linked to the synthetic run
5. Custom spans inside `/api/trace-demo` (fetch-products, compute-stats, call-inventory-service) appear as a waterfall
6. In Kibana, you can go from the Synthetic monitor → click "View trace" → see the full backend waterfall

### How to see it:

1. **Kibana → Observability → Synthetics → Monitors**
   - Click on "Trace Correlation Journey"
   - View the run history, step timings

2. **Kibana → Observability → APM → Services → `synth-monitor-server`**
   - Click on **Transactions**
   - Filter by `GET /api/trace-demo`
   - Click a transaction → see the waterfall:
     ```
     GET /api/trace-demo  ────────────────────── 200ms total
       ├── fetch-products (db.query)  ──── 30-100ms
       ├── compute-stats (app.compute)  ── 20-50ms
       └── call-inventory-service (external.http)  ── 50-200ms
     ```

3. **Kibana → Observability → APM → Traces**
   - Filter by `service.name: synth-monitor-server`
   - Each trace originated from a synthetic run will show the full chain:
     `Synthetic Monitor → HTTP request → APM Transaction → Custom Spans`

### Structured log correlation:

Every server request also produces a structured JSON log with the trace context:

```json
{
  "@timestamp": "2026-03-07T10:30:00.000Z",
  "level": "info",
  "message": "GET /api/trace-demo 200 185ms",
  "http": { "method": "GET", "url": "/api/trace-demo", "status_code": 200 },
  "duration_ms": 185,
  "trace.id": "abc123def456...",
  "transaction.id": "789ghi..."
}
```

In Kibana → **Observability → Logs**, you can search for a specific `trace.id` and see all log lines from that synthetic run, correlated with the APM trace.

---

## Part 7: Environment Variables Reference

### Server (`server/app.js`)

| Variable             | Default                    | Description                                    |
|----------------------|----------------------------|------------------------------------------------|
| `PORT`               | `3000`                     | Server listen port                             |
| `APM_SERVER_URL`     | `http://localhost:8200`    | Elastic APM server URL                         |
| `APM_SECRET_TOKEN`   | (empty)                    | APM authentication token                       |
| `APM_API_KEY`        | (not set)                  | APM API key (alternative to secret token)      |
| `APM_SERVICE_NAME`   | `synth-monitor-server`     | Service name shown in Kibana APM               |
| `APM_ACTIVE`         | `true`                     | Set to `false` to disable APM                  |
| `NODE_ENV`           | `development`              | Environment name shown in Kibana APM           |

### Synthetics (`synthetics/synthetics.config.ts`)

| Variable             | Default                    | Description                                    |
|----------------------|----------------------------|------------------------------------------------|
| `MY_ENV`             | `development`              | Environment selector: `development`, `staging`, `production` |
| `SYNTH_TARGET_URL`   | (not set)                  | Overrides the URL from `MY_ENV`                |
| `SYNTH_USERNAME`     | `testuser`                 | Login username for browser journeys            |
| `SYNTH_PASSWORD`     | `testpass123`              | Login password for browser journeys            |
| `KIBANA_URL`         | `https://playgorund-v2.kb...` | Kibana URL for `push` command               |
| `SYNTHETICS_API_KEY` | (not set)                  | API key for `push` authentication              |

### Target URLs by environment

| MY_ENV        | Target URL                                                                 |
|---------------|---------------------------------------------------------------------------|
| `development` | `http://localhost:3000`                                                    |
| `staging`     | `http://synth-monitor-server.synthetic-monitoring.svc.cluster.local:3000`  |
| `production`  | `http://35.226.244.170`                                                    |

---

## Part 8: Journey Inventory

### 13 Synthetic Monitor Journeys

| #  | File                                  | Journey Name                     | Steps | Type    | Key Tags                              |
|----|---------------------------------------|----------------------------------|-------|---------|---------------------------------------|
| 1  | `login.journey.ts`                   | Login Journey                    | 4     | Browser | auth, critical-path                   |
| 2  | `failed-login.journey.ts`            | Failed Login Journey             | 3     | Browser | auth, error-handling, negative-test   |
| 3  | `navigation.journey.ts`             | Navigation Journey               | 6     | Browser | navigation, smoke-test               |
| 4  | `products.journey.ts`               | Product Search Journey           | 5     | Browser | e-commerce, search, catalog           |
| 5  | `cart.journey.ts`                    | Add to Cart Journey              | 5     | Browser | e-commerce, cart, critical-path       |
| 6  | `checkout.journey.ts`               | Checkout Journey                 | 7     | Browser | e-commerce, checkout, revenue         |
| 7  | `profile.journey.ts`                | Profile Edit Journey             | 4     | Browser | user-management, form-submission      |
| 8  | `settings.journey.ts`               | Settings Journey                 | 6     | Browser | user-management, form-controls        |
| 9  | `performance.journey.ts`            | Performance Journey              | 2     | Browser | performance, latency, sla-tracking    |
| 10 | `api-health.journey.ts`             | API Health Journey               | 1     | API     | api, health-check, infrastructure     |
| 11 | `trace-correlation.journey.ts`      | Trace Correlation Journey        | 2     | API     | apm-correlation, **elastic-only**     |
| 12 | `observability-dashboard.journey.ts`| Observability Dashboard Journey  | 5     | Browser | observability, **elastic-only**       |
| 13 | `throttled-checkout.journey.ts`     | Throttled Checkout (3G)          | 6     | Browser | performance, throttled, 3g-simulation |

### What each journey tests

**Authentication:**
- **Login Journey** — Full login flow: navigate → fill credentials → submit → verify dashboard
- **Failed Login Journey** — Negative test: wrong credentials → verify error message

**E-commerce critical path:**
- **Product Search** — Browse products → search by name → filter by category → verify results
- **Add to Cart** — Login → browse → view product detail → set quantity → add to cart → verify
- **Checkout** — Login → add product → cart → shipping form → payment form → review → place order → verify confirmation
- **Throttled Checkout** — Same checkout flow under simulated 3G network (1.6 Mbps down, 0.75 up, 300ms latency)

**User management:**
- **Navigation** — Login → visit every page via nav links → verify each loads
- **Profile Edit** — Login → edit name/email/bio → save → verify success message
- **Settings** — Login → toggle switches → change dropdowns → select radio → save → verify

**Infrastructure & APM:**
- **API Health** — HTTP request to `/api/health` → verify `{"status":"ok"}`
- **Performance** — Load `/slow?delay=2000` → verify 2-second delay renders correctly
- **Trace Correlation** — API call to `/api/trace-demo` → verify multi-span response + trace IDs → check `/api/metrics`
- **Observability Dashboard** — Login → navigate to `/observability` → verify live metrics → trigger trace demo → verify comparison table

---

## Part 9: Quick Start Cheat Sheet

```bash
# ─── 1. Start server with APM ───
cd server && npm install
APM_SERVER_URL=https://playgorund-v2.apm.europe-west9.gcp.elastic-cloud.com \
APM_SECRET_TOKEN=a1RIUXc1d0I5YTBWbHphTkQxNW06dXZCTzhES0Jfb1lFSjlTdmVZb2dZZw== \
node app.js

# ─── 2. Run journeys locally ───
cd synthetics && npm install
MY_ENV=development npx @elastic/synthetics journeys/

# ─── 3. Push to Kibana ───
# First: edit synthetics.config.ts → set enabled: true
SYNTHETICS_API_KEY=a1RIUXc1d0I5YTBWbHphTkQxNW06dXZCTzhES0Jfb1lFSjlTdmVZb2dZZw== \
MY_ENV=production \
npx @elastic/synthetics push

# ─── 4. Open Kibana ───
open https://playgorund-v2.kb.europe-west9.gcp.elastic-cloud.com/app/synthetics
```

---

## Troubleshooting

### "Invalid username or password" when journeys run

The server credentials are `testuser` / `testpass123`. Make sure you're not overriding with `--params` on the CLI.

### APM agent fails to connect

- Verify the APM URL is correct (must include `https://`)
- Check if the API key works for APM (try `secretToken` and `apiKey` — see section 1.4)
- Set `APM_ACTIVE=false` to start without APM while debugging

### `push` fails with 401

- The API key needs the `synthetics_write` privilege
- Create a new key in Kibana: **Stack Management → API Keys → Create API Key**
- Grant it the `uptime_write` and `synthetics_write` roles

### Monitors created but show "No data"

- Ensure `enabled: true` in the monitor config
- If using private locations: verify the Elastic Agent is enrolled and healthy in Fleet
- If using managed locations: ensure the target URL is publicly reachable
- Check that `MY_ENV` points to the right target when you pushed

### Journeys pass locally but fail in Kibana

- Local runs use `localhost:3000` — Kibana monitors use the URL baked in at push time
- Make sure `MY_ENV=production` (or the correct env) was set when you ran `push`
- The production server must have all the latest routes deployed (including `/observability`, `/api/trace-demo`, `/api/metrics`)

### Port 3000 already in use

```bash
lsof -ti:3000 | xargs kill -9
```
