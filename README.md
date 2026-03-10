# Elastic Synthetic Monitoring + EDOT Demo

A complete  demo showcasing **Elastic's unified observability** powered by **OpenTelemetry** — combining Synthetic Monitoring, APM traces, and correlated logs, all collected via the **Elastic Distribution of OpenTelemetry (EDOT)**.

---

## What Is This?

This project runs a realistic e-commerce Express.js application alongside 13 Playwright-based synthetic monitor journeys. It demonstrates how Elastic connects synthetic test results to backend APM traces and logs — with instrumentation that is **fully OpenTelemetry-native**, requiring zero proprietary SDK code in the application.

**Stack:**
- **Backend**: Node.js + Express.js instrumented via **EDOT** (zero-code, injected by the OTel Operator)
- **Telemetry API**: `@opentelemetry/api` (vendor-neutral, for log context only)
- **Synthetic Monitors**: `@elastic/synthetics` (Playwright-based), 13 journeys
- **Deployment**: Docker + Kubernetes (GKE) with OpenTelemetry Operator
- **Observability**: Elastic Cloud (Elasticsearch, Kibana, APM Server / OTLP endpoint)

---

## EDOT — Elastic Distribution of OpenTelemetry

### What Is EDOT?

**EDOT** is Elastic's certified distribution of the [OpenTelemetry](https://opentelemetry.io/) SDK and Collector. It is a drop-in, standards-compliant implementation that ships all telemetry signals — **traces, metrics, and logs** — to Elastic using the OTLP protocol.

EDOT is not a proprietary agent. It is OpenTelemetry, packaged and supported by Elastic, with:
- Pre-configured exporters pointing to Elastic's OTLP endpoint
- Elastic-certified auto-instrumentation libraries for Node.js, Java, Python, .NET, Go
- Full compatibility with any OpenTelemetry-compatible backend

### Why OpenTelemetry First?

| Approach | Old way (elastic-apm-node) | This demo (EDOT) |
|----------|---------------------------|------------------|
| Instrumentation | Elastic proprietary agent | OpenTelemetry standard |
| Vendor lock-in | Yes | No — OTLP works with any backend |
| Code changes needed | Requires SDK import + manual spans | Zero application code changes |
| Auto-instrumentation | Partial | Full (HTTP, Express, DB, etc.) |
| Standards compliance | Elastic-specific | W3C Trace Context, OTLP |

### How EDOT Works in This Project

The key is in the Kubernetes deployment manifest. **No SDK is installed in the application.** Instead, the OpenTelemetry Operator reads a single pod annotation and auto-injects the EDOT Node.js agent at startup:

```yaml
# Kubernetes/deployment-app.yaml
annotations:
  instrumentation.opentelemetry.io/inject-nodejs: "opentelemetry-operator-system/elastic-instrumentation"
```

That annotation is the entire instrumentation configuration. The operator injects EDOT as an init container before the app starts, which:
1. Installs the EDOT Node.js agent into the pod
2. Sets `NODE_OPTIONS=--require @elastic/opentelemetry-node` so it loads before any application code
3. Configures OTLP export to Elastic's MOTEL endpoint via environment variables

The application (`app.edot.js`) uses only the **vendor-neutral `@opentelemetry/api`** package — the zero-dependency OTel API — purely to read the active trace context for log enrichment:

```js
// app.edot.js — reading OTel trace context for structured logs
const { trace } = require('@opentelemetry/api');

res.on('finish', () => {
  const span = trace.getActiveSpan();
  const ctx = span?.spanContext();

  console.log(JSON.stringify({
    '@timestamp': new Date().toISOString(),
    level: res.statusCode >= 400 ? 'error' : 'info',
    message: `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
    'trace.id': ctx?.traceId,   // → correlated in Kibana
    'span.id': ctx?.spanId,
  }));
});
```

The spans themselves — HTTP transactions, route handlers, async operations — are all captured automatically by EDOT. No `apm.startTransaction()`, no manual span creation.


## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          ELASTIC CLOUD                               │
│  ┌────────────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
│  │ Elasticsearch  │  │    Kibana     │  │  APM Server (OTLP ingest)│ │
│  └───────┬────────┘  └───────┬───────┘  └─────────────┬────────────┘ │
└──────────┼──────────────────┼───────────────────────── ┼─────────────┘
           │                  │                          │ OTLP/gRPC
           │                  │                ┌─────────┴────────────┐
           │                  │                │  EDOT Node.js Agent  │
           │                  │                │  (injected by OTel   │
           │                  │                │   Operator at start) │
           │                  │                └─────────┬────────────┘
           │                  │                          │ auto-instruments
           │                  │                ┌─────────┴────────────┐
           │                  │                │   Express Server     │
           └──────────────────┘                │   app.edot.js        │
                                               │   port 3000          │
                                               └─────────┬────────────┘
                                                         ▲
                                                         │ HTTP
                                                         │ W3C traceparent headers
                                               ┌─────────┴────────────┐
                                               │  Synthetic Runner    │
                                               │  (Playwright)        │
                                               │  13 journeys         │
                                               └──────────────────────┘
```

---

## Project Structure

```
├── server/
│   ├── app.edot.js            # Main app — OTel-native, zero proprietary SDK
│   ├── app.js                 # Reference app — elastic-apm-node (for comparison)
│   ├── Dockerfile             # Runs app.edot.js
│   ├── package.json
│   └── views/                 # EJS templates (13 pages)
├── synthetics/
│   ├── journeys/              # 13 synthetic monitor journeys
│   ├── lightweight/
│   │   └── heartbeat.yml      # Lightweight HTTP health monitor
│   └── synthetics.config.ts   # Monitor config (schedule, location, params)
└── Kubernetes/
    └── deployment-app.yaml    # K8s Service + Deployment with OTel annotation
```

### The 13 Journeys

| Journey | Category | Steps | What It Tests |
|---------|----------|-------|---------------|
| `api-health` | API | 1 | Health endpoint availability |
| `login` | Auth | 4 | Full login flow |
| `failed-login` | Auth | 3 | Error handling & messaging |
| `navigation` | UI | 6 | Site-wide navigation |
| `products` | E-commerce | 5 | Product search & filtering |
| `cart` | E-commerce | 5 | Add to cart flow |
| `checkout` | E-commerce | 7 | Full checkout process |
| `throttled-checkout` | Performance | 6 | Checkout under 3G network simulation |
| `profile` | User | 4 | Profile editing |
| `settings` | User | 6 | Settings management |
| `performance` | Performance | 2 | Slow page load timing |
| `trace-correlation` | Observability | 2 | APM trace linking |
| `observability-dashboard` | Observability | 5 | Live metrics + dashboard |

---

## Quick Start

### Prerequisites

- Node.js 18+
- An Elastic Cloud cluster (APM Server with OTLP endpoint enabled)
- Docker + kubectl + OpenTelemetry Operator (for Kubernetes deployment)

### 1. Run the Server Locally (without EDOT)

Without Kubernetes, you can run the server directly. EDOT won't inject automatically, but the app still works:

```bash
cd server
npm install
node app.edot.js
```

To get EDOT traces locally, use the `@elastic/opentelemetry-node` package with `NODE_OPTIONS`:

```bash
npm install --save-dev @elastic/opentelemetry-node

OTEL_EXPORTER_OTLP_ENDPOINT=https://<your-cluster>.apm.elastic-cloud.com \
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <your-secret-token>" \
OTEL_SERVICE_NAME=synth-monitor-server \
NODE_OPTIONS="--require @elastic/opentelemetry-node" \
node app.edot.js
```

Server starts at `http://localhost:3000`. Test credentials: `testuser` / `testpass123`.

### 2. Run Synthetic Journeys Locally

```bash
cd synthetics
npm install

# Run all journeys against localhost
MY_ENV=development npx @elastic/synthetics journeys/

# Run a single journey
MY_ENV=development npx @elastic/synthetics journeys/login.journey.ts

# Run against a custom URL
SYNTH_TARGET_URL=http://35.226.244.170 npx @elastic/synthetics journeys/
```

### 3. Push Monitors to Kibana

Deploys all 13 journeys as scheduled monitors running every 10 minutes:

```bash
cd synthetics

# Generate an API key in Kibana: Stack Management → API Keys
SYNTHETICS_API_KEY=<your-key> \
MY_ENV=production \
npx @elastic/synthetics push
```

---

## Kubernetes Deployment (with EDOT auto-injection)

This is where the zero-code EDOT instrumentation comes to life. The OpenTelemetry Operator must be installed in the cluster with an `Instrumentation` CR named `elastic-instrumentation` in the `opentelemetry-operator-system` namespace.

```bash
# Deploy the application — the OTel annotation does the rest
kubectl apply -f Kubernetes/deployment-app.yaml

# Get the external IP
kubectl get svc express-app-service
```

The pod annotation in [Kubernetes/deployment-app.yaml](Kubernetes/deployment-app.yaml) that triggers EDOT injection:

```yaml
annotations:
  instrumentation.opentelemetry.io/inject-nodejs: "opentelemetry-operator-system/elastic-instrumentation"
```

The `Instrumentation` CR configures EDOT to export to your Elastic Cloud OTLP endpoint — no environment variables needed in the pod spec.

### Build & Push Your Own Image

```bash
cd server
docker build -t <your-registry>/my-server-synth:vx --platform linux/amd64 .
docker push <your-registry>/my-server-synth:vx
```

Update the image reference in [Kubernetes/deployment-app.yaml](Kubernetes/deployment-app.yaml).

---

## Environment Variables

### Server (`server/`) — when running without OTel Operator

| Variable | Description | Example |
|----------|-------------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Elastic OTLP endpoint | `https://..elastic-cloud.com` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Auth header | `Authorization=Bearer <token>` |
| `OTEL_SERVICE_NAME` | Service name in APM | `synth-monitor-server` |
| `NODE_OPTIONS` | Load EDOT agent | `--require @elastic/opentelemetry-node` |
| `NODE_ENV` | Environment | `development` / `production` |
| `PORT` | Server port (default: 3000) | `3000` |

### Synthetics (`synthetics/`)

| Variable | Description | Example |
|----------|-------------|---------|
| `MY_ENV` | Target environment | `development` / `production` |
| `SYNTH_TARGET_URL` | Override monitor target URL |
| `SYNTH_USERNAME` | Test account username | `testuser` |
| `SYNTH_PASSWORD` | Test account password | `testpass123` |
| `SYNTHETICS_API_KEY` | Kibana API key (for push) | Generated in Kibana |

---

## API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health
# → {"status":"ok","timestamp":"...","uptime":...}

# Live application metrics
curl http://localhost:3000/api/metrics
# → {"requestCount":...,"errorCount":...,"avgResponseTime":...,"memory":...}

# Trace demo — auto-instrumented async operations (no manual spans)
curl http://localhost:3000/api/trace-demo
# → {"stats":...,"inventory":...,"products":...,"timestamp":"..."}

# Slow page — intentional delay for performance journey testing
curl "http://localhost:3000/slow?delay=2000"
```

---

## Why Elastic? — Observability Advantages

### Synthetic Monitoring

- **13 browser journeys** covering real user flows: login, checkout, profile, settings, 3G network simulation
- **Lightweight monitors** (`heartbeat.yml`) for simple HTTP uptime alongside full browser journeys
- **Private locations**: run monitors from your own Kubernetes cluster using Elastic Agent, not just Elastic's managed locations
- **Scheduled execution** every 5–10 minutes with multi-step assertions, screenshots on failure, and step-level timing breakdown

### APM via EDOT (OpenTelemetry)

- **Zero-code instrumentation**: the `instrumentation.opentelemetry.io/inject-nodejs` annotation is the only configuration needed — no SDK changes in the application
- **Full auto-instrumentation**: EDOT captures every HTTP transaction, Express route, and async operation automatically
- **Standards-based**: all telemetry uses OTLP. Switch backends without touching your application
- **Distributed tracing**: W3C `traceparent` propagation works across service boundaries out of the box

### Logs

- EDOT automatically enriches application logs with `trace.id` and `span.id` when logs are emitted during an active span
- `app.edot.js` writes structured JSON logs using `trace.getActiveSpan().spanContext()` — these are indexed in Elasticsearch and filterable by trace/transaction ID directly in Kibana Discover or Logs Explorer
- Log anomaly detection (ML) works across the same data, no separate logging backend needed

### Unified Observability in Kibana

| Signal | What You Get |
|--------|-------------|
| **Synthetics** | Journey status, step screenshots, step timing, geo-distributed checks, SLA tracking |
| **APM (via EDOT)** | Service map, transaction traces, span waterfall, error tracking, latency distributions |
| **Logs** | Structured logs correlated to traces by `trace.id`, filterable by synthetic run |
| **Metrics** | Infrastructure + runtime metrics from the same OTLP pipeline — no separate agent |
| **Alerting** | Alert on synthetic failures, APM error rate spikes, or log anomalies — one rule engine |

All signals share the same trace context, so navigating from a failed synthetic step to the backend trace to the application log for that exact request is a single click.
