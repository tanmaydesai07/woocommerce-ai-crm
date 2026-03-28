import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import 'dotenv/config';
import User from './models/User.js';
import Customer from './models/Customer.js';
import Order from './models/Order.js';
import Communication from './models/Communication.js';
import { initWooCommerce, getWooApi, getWooCustomers, getWooOrders, getSimulatedCustomers, getSimulatedOrders } from './woocommerce.js';

const app = express();

app.use(express.json());
// No static file serving - React handles frontend
app.use(session({
  secret: 'crm-hackathon-secret',
  resave: false,
  saveUninitialized: false
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(e => console.log('MongoDB error:', e));

// Initialize WooCommerce (uses env vars or falls back to simulated data)
initWooCommerce(
  process.env.WOO_URL,
  process.env.WOO_CONSUMER_KEY,
  process.env.WOO_CONSUMER_SECRET
);

// Seed default users
async function seedUsers() {
  const count = await User.countDocuments();
  if (count === 0) {
    await User.create([
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'user', password: 'user123', role: 'user' }
    ]);
    console.log('Default users: admin/admin123, user/user123');
  }
}
seedUsers();

// Auth middleware
function auth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

// ==================== AUTH ROUTES ====================

app.post('/api/signup', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username taken' });
    const user = await User.create({ username, password, role: role || 'user' });
    req.session.userId = user._id;
    req.session.role = user.role;
    res.json({ username: user.username, role: user.role });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.userId = user._id;
    req.session.role = user.role;
    res.json({ username: user.username, role: user.role });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ role: req.session.role });
});

// ==================== CUSTOMER ROUTES ====================

// Get all customers
app.get('/api/customers', auth, async (req, res) => {
  try {
    const filter = req.session.role === 'admin' ? {} : { assignedTo: req.session.username };
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.json(customers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single customer
app.get('/api/customers/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create customer
app.post('/api/customers', auth, async (req, res) => {
  try {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const customer = await Customer.create({ ...req.body, createdBy: 'admin' });
    res.json(customer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update customer
app.put('/api/customers/:id', auth, async (req, res) => {
  try {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(customer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete customer
app.delete('/api/customers/:id', auth, async (req, res) => {
  try {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await Customer.findByIdAndDelete(req.params.id);
    await Order.deleteMany({ customer: req.params.id });
    await Communication.deleteMany({ customer: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== ORDER ROUTES ====================

// Get all orders
app.get('/api/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find().populate('customer').sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get orders for a specific customer
app.get('/api/orders/customer/:customerId', auth, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.params.customerId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create order
app.post('/api/orders', auth, async (req, res) => {
  try {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const order = await Order.create({ ...req.body, createdBy: 'admin' });
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update order
app.put('/api/orders/:id', auth, async (req, res) => {
  try {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete order
app.delete('/api/orders/:id', auth, async (req, res) => {
  try {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== COMMUNICATION ROUTES ====================

// Get all communications
app.get('/api/communications', auth, async (req, res) => {
  try {
    const comms = await Communication.find().populate('customer').sort({ createdAt: -1 });
    res.json(comms);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get communications for a specific customer
app.get('/api/communications/customer/:customerId', auth, async (req, res) => {
  try {
    const comms = await Communication.find({ customer: req.params.customerId }).sort({ createdAt: -1 });
    res.json(comms);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create communication
app.post('/api/communications', auth, async (req, res) => {
  try {
    const comm = await Communication.create({ ...req.body, createdBy: req.session.username });
    res.json(comm);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update communication
app.put('/api/communications/:id', auth, async (req, res) => {
  try {
    const comm = await Communication.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(comm);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete communication
app.delete('/api/communications/:id', auth, async (req, res) => {
  try {
    await Communication.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== WOOCOMMERCE SYNC ====================

// Sync customers from WooCommerce (real API or simulated)
app.post('/api/woocommerce/sync-customers', auth, async (req, res) => {
  try {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    
    let wooCustomers;
    let source;
    
    // Try real WooCommerce API first
    try {
      wooCustomers = await getWooCustomers();
      source = 'WooCommerce API';
    } catch {
      // Fallback to simulated data
      wooCustomers = getSimulatedCustomers();
      source = 'simulated data';
    }

    let synced = 0;
    let updated = 0;

    for (const wc of wooCustomers) {
      const wooId = String(wc.id);
      const existing = await Customer.findOne({ wooCustomerId: wooId });
      
      const customerData = {
        wooCustomerId: wooId,
        firstName: wc.first_name,
        lastName: wc.last_name,
        email: wc.email,
        phone: wc.billing?.phone || '',
        company: wc.billing?.company || '',
        address: wc.billing?.address_1 || '',
        status: 'customer',
        createdBy: 'woocommerce-sync'
      };

      if (existing) {
        await Customer.findByIdAndUpdate(existing._id, customerData);
        updated++;
      } else {
        await Customer.create(customerData);
        synced++;
      }
    }

    res.json({ 
      success: true, 
      message: `Synced ${synced} new, updated ${updated} customers from ${source}` 
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sync orders from WooCommerce (real API or simulated)
app.post('/api/woocommerce/sync-orders', auth, async (req, res) => {
  try {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    let wooOrders;
    let source;
    
    // Try real WooCommerce API first
    try {
      wooOrders = await getWooOrders();
      source = 'WooCommerce API';
    } catch {
      // Fallback to simulated data
      wooOrders = getSimulatedOrders();
      source = 'simulated data';
    }

    const customers = await Customer.find({ wooCustomerId: { $ne: null } });
    let synced = 0;
    let updated = 0;

    // Map WooCommerce status to our status
    const statusMap = {
      'pending': 'pending',
      'processing': 'processing',
      'on-hold': 'pending',
      'completed': 'delivered',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'failed': 'cancelled'
    };

    for (const wo of wooOrders) {
      const wooId = String(wo.id);
      const existing = await Order.findOne({ wooOrderId: wooId });
      
      // Find customer by WooCommerce ID
      const customerWooId = String(wo.customer_id);
      const customer = customers.find(c => c.wooCustomerId === customerWooId);
      if (!customer) continue;

      const orderData = {
        wooOrderId: wooId,
        customer: customer._id,
        orderNumber: wo.number || wooId,
        products: (wo.line_items || []).map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.total) || 0
        })),
        totalAmount: parseFloat(wo.total) || 0,
        status: statusMap[wo.status] || 'pending',
        paymentStatus: wo.status === 'completed' ? 'paid' : 'pending',
        notes: wo.customer_note || '',
        createdBy: 'woocommerce-sync'
      };

      if (existing) {
        await Order.findByIdAndUpdate(existing._id, orderData);
        updated++;
      } else {
        await Order.create(orderData);
        synced++;
      }
    }

    res.json({ 
      success: true, 
      message: `Synced ${synced} new, updated ${updated} orders from ${source}` 
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Check WooCommerce connection status
app.get('/api/woocommerce/status', auth, async (req, res) => {
  try {
    const api = getWooApi();
    if (api) {
      // Try to fetch store info
      try {
        const response = await api.get("system_status");
        res.json({ 
          connected: true, 
          store: response.data?.settings?.title || 'Connected',
          url: process.env.WOO_URL 
        });
      } catch {
        res.json({ connected: false, message: 'WooCommerce API error' });
      }
    } else {
      res.json({ connected: false, message: 'Using simulated data - configure WOO_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET in .env' });
    }
  } catch (e) {
    res.json({ connected: false, error: e.message });
  }
});

// ==================== DASHBOARD STATS ====================

app.get('/api/stats', auth, async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalComms = await Communication.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const openComms = await Communication.countDocuments({ status: 'open' });

    const customersByStatus = await Customer.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      totalCustomers,
      totalOrders,
      totalComms,
      pendingOrders,
      openComms,
      customersByStatus,
      ordersByStatus
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('http://localhost:3000'));
