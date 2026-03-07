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
  // Also update the in-memory store
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

// --- API health ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- Root redirect ---
app.get('/', (req, res) => {
  res.redirect('/login');
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Synthetic Monitoring Test Server running on http://localhost:${PORT}`);
});
