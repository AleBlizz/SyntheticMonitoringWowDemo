// ============================================================
// Elastic APM — MUST be the very first require
// When a synthetic monitor sends a W3C traceparent header,
// the APM agent automatically picks it up and creates a child
// transaction, linking the synthetic run to the backend trace.
// ============================================================
//const apm = require('elastic-apm-node').start({
//  serviceName: process.env.APM_SERVICE_NAME || 'synth-monitor-server',
//  serverUrl:   process.env.APM_SERVER_URL   || 'http://localhost:8200',
//  secretToken: process.env.APM_SECRET_TOKEN || '',
//  environment: process.env.NODE_ENV         || 'development',
//  active:      process.env.APM_ACTIVE !== 'false',
//});

const express = require('express');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- View engine ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'synth-monitor-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// ============================================================
// In-memory application metrics
// Tracks request counts, errors, and response times so the
// /api/metrics endpoint can expose them. Competitors can't
// natively correlate these with synthetic monitor runs.
// ============================================================
const appMetrics = {
  requestCount: 0,
  errorCount: 0,
  totalResponseTime: 0,
  startedAt: new Date().toISOString(),
};

// --- Metrics-tracking middleware ---
app.use((req, res, next) => {
  const start = Date.now();
  appMetrics.requestCount++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    appMetrics.totalResponseTime += duration;
    if (res.statusCode >= 400) appMetrics.errorCount++;

    // ── Structured logging with APM trace context ──
    // Every log line carries the trace.id and transaction.id
    // so Kibana can correlate logs ↔ traces ↔ synthetic runs.
    const traceIds = apm.currentTraceIds;
    console.log(JSON.stringify({
      '@timestamp': new Date().toISOString(),
      level: res.statusCode >= 400 ? 'error' : 'info',
      message: `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
      http: { method: req.method, url: req.originalUrl, status_code: res.statusCode },
      duration_ms: duration,
      ...traceIds,
    }));
  });

  next();
});

// --- In-memory data ---
const USERS = {
  testuser: {
    username: 'testuser',
    password: 'testpass123',
    name: 'Test User',
    email: 'testuser@example.com',
    bio: 'QA automation enthusiast',
  },
};

const PRODUCTS = [
  { id: 1, name: 'Laptop Pro 15', description: 'High-performance laptop with 16GB RAM and 512GB SSD', price: 1299.99, category: 'Electronics', image: '💻' },
  { id: 2, name: 'Wireless Mouse', description: 'Ergonomic wireless mouse with long battery life', price: 29.99, category: 'Electronics', image: '🖱️' },
  { id: 3, name: 'Mechanical Keyboard', description: 'Cherry MX switches, RGB backlight', price: 89.99, category: 'Electronics', image: '⌨️' },
  { id: 4, name: 'JavaScript: The Good Parts', description: 'Classic book on JavaScript best practices', price: 24.99, category: 'Books', image: '📘' },
  { id: 5, name: 'Clean Code', description: 'A handbook of agile software craftsmanship', price: 34.99, category: 'Books', image: '📗' },
  { id: 6, name: 'Design Patterns', description: 'Elements of reusable object-oriented software', price: 44.99, category: 'Books', image: '📕' },
  { id: 7, name: 'Cotton T-Shirt', description: 'Comfortable 100% cotton t-shirt, various colors', price: 19.99, category: 'Clothing', image: '👕' },
  { id: 8, name: 'Denim Jeans', description: 'Classic fit denim jeans', price: 49.99, category: 'Clothing', image: '👖' },
  { id: 9, name: 'Running Shoes', description: 'Lightweight running shoes with cushioned sole', price: 79.99, category: 'Clothing', image: '👟' },
  { id: 10, name: 'Desk Lamp', description: 'Adjustable LED desk lamp with USB charging port', price: 39.99, category: 'Home', image: '💡' },
  { id: 11, name: 'Coffee Maker', description: 'Programmable 12-cup coffee maker', price: 59.99, category: 'Home', image: '☕' },
  { id: 12, name: 'Plant Pot Set', description: 'Set of 3 ceramic plant pots, minimalist design', price: 29.99, category: 'Home', image: '🪴' },
];

let orderCounter = 1000;

// --- Locals middleware (available in all templates) ---
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cart = req.session.cart || [];
  res.locals.cartCount = req.session.cart ? req.session.cart.length : 0;
  next();
});

// --- Auth middleware ---
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// ========================
// ROUTES
// ========================

// --- Login ---
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Login', error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];
  if (user && user.password === password) {
    req.session.user = { ...user };
    if (!req.session.cart) req.session.cart = [];
    if (!req.session.settings) {
      req.session.settings = {
        notifications: true,
        darkMode: false,
        language: 'en',
        timezone: 'UTC',
        emailFrequency: 'daily',
      };
    }
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Login', error: 'Invalid username or password' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// --- Dashboard ---
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    productCount: PRODUCTS.length,
    cartCount: req.session.cart ? req.session.cart.length : 0,
    orderCount: 0,
  });
});

// --- Profile ---
app.get('/profile', requireAuth, (req, res) => {
  res.render('profile', { title: 'Profile', success: false });
});

app.post('/profile', requireAuth, (req, res) => {
  const { name, email, bio } = req.body;
  req.session.user.name = name;
  req.session.user.email = email;
  req.session.user.bio = bio;
  if (USERS[req.session.user.username]) {
    USERS[req.session.user.username].name = name;
    USERS[req.session.user.username].email = email;
    USERS[req.session.user.username].bio = bio;
  }
  res.render('profile', { title: 'Profile', success: true });
});

// --- Products ---
app.get('/products', (req, res) => {
  const search = req.query.search || '';
  const category = req.query.category || '';
  const page = parseInt(req.query.page) || 1;
  const perPage = 6;

  let filtered = PRODUCTS;
  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  res.render('products', {
    title: 'Products',
    products: paginated,
    allProducts: filtered,
    search,
    category,
    page,
    totalPages,
    categories: ['Electronics', 'Books', 'Clothing', 'Home'],
  });
});

app.get('/products/:id', (req, res) => {
  const product = PRODUCTS.find((p) => p.id === parseInt(req.params.id));
  if (!product) {
    return res.status(404).send('Product not found');
  }
  res.render('product-detail', { title: product.name, product });
});

// --- Cart ---
app.get('/cart', requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.render('cart', { title: 'Cart', cartItems: cart, total });
});

app.post('/cart/add', requireAuth, (req, res) => {
  const productId = parseInt(req.body.productId);
  const quantity = parseInt(req.body.quantity) || 1;
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return res.redirect('/products');

  if (!req.session.cart) req.session.cart = [];
  const existing = req.session.cart.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    req.session.cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
    });
  }
  res.redirect('/cart');
});

app.post('/cart/update', requireAuth, (req, res) => {
  const productId = parseInt(req.body.productId);
  const quantity = parseInt(req.body.quantity) || 1;
  if (req.session.cart) {
    const item = req.session.cart.find((i) => i.productId === productId);
    if (item) item.quantity = quantity;
  }
  res.redirect('/cart');
});

app.post('/cart/remove', requireAuth, (req, res) => {
  const productId = parseInt(req.body.productId);
  if (req.session.cart) {
    req.session.cart = req.session.cart.filter((i) => i.productId !== productId);
  }
  res.redirect('/cart');
});

// --- Checkout ---
app.get('/checkout', requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.render('checkout', { title: 'Checkout', cartItems: cart, total, confirmation: null });
});

app.post('/checkout', requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  orderCounter++;
  const orderId = `ORD-${orderCounter}`;
  req.session.cart = [];
  res.render('checkout', {
    title: 'Order Confirmation',
    cartItems: [],
    total,
    confirmation: { orderId, total },
  });
});

// --- Settings ---
app.get('/settings', requireAuth, (req, res) => {
  const settings = req.session.settings || {
    notifications: true,
    darkMode: false,
    language: 'en',
    timezone: 'UTC',
    emailFrequency: 'daily',
  };
  res.render('settings', { title: 'Settings', settings, success: false });
});

app.post('/settings', requireAuth, (req, res) => {
  req.session.settings = {
    notifications: req.body.notifications === 'on',
    darkMode: req.body.darkMode === 'on',
    language: req.body.language,
    timezone: req.body.timezone,
    emailFrequency: req.body.emailFrequency,
  };
  res.render('settings', { title: 'Settings', settings: req.session.settings, success: true });
});

// --- Slow page ---
app.get('/slow', (req, res) => {
  const delay = parseInt(req.query.delay) || 3000;
  setTimeout(() => {
    res.render('slow', { title: 'Slow Page', delay });
  }, delay);
});

// ============================================================
// Observability page — Elastic-only differentiator
// Shows live server metrics and trace context in the UI.
// ============================================================
app.get('/observability', requireAuth, (req, res) => {
  res.render('observability', { title: 'Observability' });
});

// ============================================================
// API ROUTES — Elastic APM differentiators
// ============================================================

// --- Health endpoint (unchanged) ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================================
// /api/metrics — Application metrics endpoint
// Exposes request counts, error rates, response times, and
// memory usage. In Elastic, these correlate with APM traces
// and synthetic runs in the same Kibana dashboard.
// Competitors can't query this data alongside synthetic
// results because they use separate data stores.
// ============================================================
app.get('/api/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    requestCount: appMetrics.requestCount,
    errorCount: appMetrics.errorCount,
    avgResponseTime: appMetrics.requestCount > 0
      ? Math.round(appMetrics.totalResponseTime / appMetrics.requestCount)
      : 0,
    uptime: Math.round(process.uptime()),
    startedAt: appMetrics.startedAt,
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1048576),
      heapTotalMB: Math.round(mem.heapTotal / 1048576),
      rssMB: Math.round(mem.rss / 1048576),
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// /api/trace-demo — THE killer differentiator
//
// This endpoint creates multiple custom APM spans that show
// up as a rich waterfall in Kibana APM. When triggered by a
// synthetic monitor, the W3C traceparent header links the
// synthetic run → this transaction → all child spans.
//
// No other synthetic monitoring tool provides this level of
// end-to-end trace correlation out of the box.
// ============================================================
app.get('/api/trace-demo', async (req, res) => {
  try {
    // Span 1: Simulate fetching products from a data source
    const products = await new Promise((resolve) => {
      const span = apm.startSpan('fetch-products', 'db', 'query');
      const filtered = PRODUCTS.filter((p) => p.category === 'Electronics');
      setTimeout(() => {
        if (span) span.end();
        resolve(filtered);
      }, 30 + Math.random() * 70); // 30-100ms
    });

    // Span 2: Compute statistics over the fetched data
    const stats = await new Promise((resolve) => {
      const span = apm.startSpan('compute-stats', 'app', 'compute');
      const prices = products.map((p) => p.price);
      const result = {
        count: prices.length,
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
        total: Math.round(prices.reduce((a, b) => a + b, 0) * 100) / 100,
      };
      setTimeout(() => {
        if (span) span.end();
        resolve(result);
      }, 20 + Math.random() * 30); // 20-50ms
    });

    // Span 3: Simulate a slow downstream service call
    const externalResult = await new Promise((resolve) => {
      const span = apm.startSpan('call-inventory-service', 'external', 'http');
      setTimeout(() => {
        if (span) span.end();
        resolve({ available: true, warehouse: 'us-east-1', checkedAt: new Date().toISOString() });
      }, 50 + Math.random() * 150); // 50-200ms
    });

    // Return results with trace context for verification
    const traceIds = apm.currentTraceIds;
    res.json({
      stats,
      inventory: externalResult,
      products: products.map((p) => ({ id: p.id, name: p.name, price: p.price })),
      trace: {
        traceId: traceIds['trace.id'] || 'apm-inactive',
        transactionId: traceIds['transaction.id'] || 'apm-inactive',
        message: 'This trace links the synthetic monitor run to the backend transaction. '
               + 'View it in Kibana APM → Services → synth-monitor-server → Transactions.',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    apm.captureError(err);
    res.status(500).json({ error: 'Internal error', message: err.message });
  }
});

// --- Root redirect ---
app.get('/', (req, res) => {
  res.redirect('/login');
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Synthetic Monitoring Test Server running on http://localhost:${PORT}`);
  //console.log(`APM agent active: ${apm.isStarted()}`);
});
