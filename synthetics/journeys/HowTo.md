### **4. ELASTIC APM + SYNTHETICS CORRELATION (TECHNICAL DETAILS)**
#### **How It Works:**
**Step 1: Synthetic Monitor Initiates Request**
```
Elastic Synthetic Monitor
  └─> HTTP Request with traceparent header
      └─> Header: traceparent: 00-[trace-id]-[parent-id]-01
```
**Step 2: Backend Receives via elastic-apm-node**
- Node.js agent checks for `traceparent` header on incoming request
- If present, creates child transaction of existing trace
- If absent, starts new trace
**Step 3: Automatic Instrumentation**
- elastic-apm-node auto-instruments Express middleware
- All database queries, external API calls captured as spans
- Logs automatically correlated with trace context
**Step 4: Data Correlation in Kibana**
- All data (synthetic request, backend traces, application logs) unified in single trace view
- APM Correlations feature uses ML to identify probable causes of slowdowns
#### **Header Details:**
- **Standard**: W3C Trace Context specification (default in newer versions)
- **Legacy**: elastic-apm-traceparent header (deprecated; default is now false)
- **Header format**: `00-[32-char hex trace-id]-[16-char hex span-id]-[trace-flags]`
#### **Express App Configuration Example:**
```javascript
const apm = require('elastic-apm-node');
apm.start({
  serviceName: 'my-express-app',
  serverUrl: 'http://localhost:8200',
  secretToken: 'your-token'
});
const express = require('express');
const app = express();
// elastic-apm-node automatically instruments Express
app.get('/api/endpoint', (req, res) => {
  // Automatically creates transaction for this request
  // Traceparent header from synthetic monitor is automatically picked up
  res.json({ success: true });
});
```
**Source:** [Distributed tracing in APM Node.js agent](https://www.elastic.co/guide/en/apm/agent/nodejs/master/distributed-tracing.html), [APM correlations in Elastic Observability](https://www.elastic.co/blog/apm-correlations-elastic-observability-root-cause-transactions)