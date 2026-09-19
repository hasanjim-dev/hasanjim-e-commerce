require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// ⚠️ JWT_SECRET Railway Variables এ অবশ্যই সেট করুন (নিচে নোট দেখুন)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
  process.exit(1);
}

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hasan_jim_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

// ---------- RATE LIMITERS ----------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
});
app.use(generalLimiter);

// ---------- AUTH MIDDLEWARE ----------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// ---------- ADMIN-ONLY MIDDLEWARE ----------
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

// ---------- INPUT VALIDATION HELPERS ----------
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// USER AUTH ROUTES
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'customer']
    );

    const token = jwt.sign(
      { id: result.insertId, email, role: 'customer', name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: result.insertId, name, email, role: 'customer' }
    });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists or invalid request.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ error: 'User not found.' });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PRODUCTS API
app.get('/api/products', async (req, res) => {
  const { category, search, sort, page = 1, limit = 12 } = req.query;
  try {
    let query = 'SELECT * FROM products WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    let params = [];

    if (category && category !== 'All' && category !== 'undefined') {
      query += ' AND category = ?';
      countQuery += ' AND category = ?';
      params.push(category);
    }
    if (search && search.trim() !== '') {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      countQuery += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const [[{ total }]] = await db.query(countQuery, params);

    if (sort === 'price_low') query += ' ORDER BY price ASC';
    else if (sort === 'price_high') query += ' ORDER BY price DESC';
    else query += ' ORDER BY id DESC';

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await db.query(query, params);
    res.json({
      products: rows,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      totalItems: total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ⚠️ এখন Admin role লাগবে প্রোডাক্ট যুক্ত/ডিলীট করতে
app.post('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  const { title, category, price, original_price, stock, image, description, badge } = req.body;

  if (!title || !category || !price || !image) {
    return res.status(400).json({ error: 'Title, category, price, and image are required.' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO products (title, category, price, stock, image, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, category, price, stock || 10, image, description || '']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- ADMIN DASHBOARD APIs ----------
app.get('/api/admin/products/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [[{ totalRevenue }]] = await db.query(
      "SELECT COALESCE(SUM(total_amount),0) as totalRevenue FROM orders WHERE status != 'CANCELLED'"
    );
    const [[{ totalOrders }]] = await db.query('SELECT COUNT(*) as totalOrders FROM orders');
    const [[{ totalProducts }]] = await db.query('SELECT COUNT(*) as totalProducts FROM products');
    const [lowStock] = await db.query('SELECT id, title, stock FROM products WHERE stock <= 5 ORDER BY stock ASC');
    res.json({ totalRevenue, totalOrders, totalProducts, lowStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders ORDER BY id DESC LIMIT 100');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { status } = req.body;
  const allowed = ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }
  try {
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT category, COUNT(*) as count FROM products GROUP BY category');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WISHLIST API
app.get('/api/wishlist', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.* FROM wishlists w JOIN products p ON w.product_id = p.id WHERE w.user_id = ?`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wishlist/toggle', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  try {
    const [exists] = await db.query(
      'SELECT * FROM wishlists WHERE user_id = ? AND product_id = ?',
      [req.user.id, productId]
    );

    if (exists.length > 0) {
      await db.query('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
      res.json({ success: true, added: false });
    } else {
      await db.query('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [req.user.id, productId]);
      res.json({ success: true, added: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REVIEWS API
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const [reviews] = await db.query('SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC', [req.params.id]);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/:id/reviews', authenticateToken, async (req, res) => {
  const { rating, comment } = req.body;
  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Comment is required.' });
  }
  try {
    await db.query(
      'INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.name, rating, comment]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHECKOUT & TRACKING API (এখন স্টক চেক + কমানো হয়)
app.post('/api/checkout', async (req, res) => {
  const { customerName, customerEmail, customerPhone, shippingAddress, paymentMethod, cartItems, totalAmount } = req.body;

  if (!customerName || !customerEmail || !customerPhone || !shippingAddress || !cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: 'All fields and at least one cart item are required.' });
  }

  const trackingNumber = 'HJ-' + Math.floor(100000 + Math.random() * 900000);

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // ✅ প্রথমে স্টক চেক করুন
    for (const item of cartItems) {
      const [[product]] = await connection.query('SELECT stock, title FROM products WHERE id = ? FOR UPDATE', [item.id]);
      if (!product) {
        throw new Error(`Product not found: ${item.title || item.id}`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for "${product.title}". Only ${product.stock} left.`);
      }
    }

    const [orderRes] = await connection.query(
      `INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_address, total_amount, status, tracking_number) 
       VALUES (?, ?, ?, ?, ?, 'PROCESSING', ?)`,
      [customerName, customerEmail, customerPhone, `${shippingAddress} (Payment: ${paymentMethod})`, totalAmount, trackingNumber]
    );

    const orderId = orderRes.insertId;

    for (const item of cartItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.id, item.quantity, item.price]
      );
      // ✅ স্টক কমান
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.id]
      );
    }

    await connection.commit();
    res.json({ success: true, trackingNumber });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/orders/track/:trackingNumber', async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE tracking_number = ?', [req.params.trackingNumber]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found.' });

    const [items] = await db.query(
      `SELECT oi.*, p.title, p.image FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [orders[0].id]
    );

    res.json({ order: orders[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});