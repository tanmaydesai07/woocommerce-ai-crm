import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import axios from 'axios';
import 'dotenv/config';
import User from './models/User.js';
import Customer from './models/Customer.js';
import Order from './models/Order.js';
import Communication from './models/Communication.js';
import { initWooCommerce, getWooApi, getWooCustomers, getWooOrders, getSimulatedCustomers, getSimulatedOrders } from './woocommerce.js';
import { mapWooStatusToOrderStatus, buildOrderStatusCommunication } from './utils/orderWorkflow.js';

async function createStatusChangeCommunication({ order, previousStatus, nextStatus, createdBy }) {
  if (!order?.customer) return;

  const payload = buildOrderStatusCommunication({
    orderNumber: order.orderNumber,
    previousStatus,
    nextStatus
  });
  if (!payload) return;

  await Communication.create({
    customer: order.customer,
    ...payload,
    createdBy
  });
}

function getDefaultFollowUpDate() {
  const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return nextDay.toISOString().slice(0, 10);
}

function parseGeminiJson(text) {
  if (!text || typeof text !== 'string') return null;

  const direct = text.trim();
  try {
    return JSON.parse(direct);
  } catch {
    // continue
  }

  const withoutFence = direct
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    // continue
  }

  const objectMatch = withoutFence.match(/\{[\s\S]*\}/);
  if (!objectMatch) return null;

  try {
    return JSON.parse(objectMatch[0]);
  } catch {
    return null;
  }
}

function buildRuleBasedSuggestion({ customer, order, communications, goal }) {
  const customerName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Customer';
  const orderRef = order?.orderNumber ? `#${order.orderNumber}` : 'their recent order';
  const openComms = (communications || []).filter(c => c.status === 'open').length;

  let priority = 'medium';
  let recommendedType = 'email';
  let nextAction = `Send a proactive update for order ${orderRef}`;
  let reason = 'Proactive updates reduce support tickets and improve trust.';

  if (order?.status === 'pending') {
    priority = 'high';
    nextAction = `Confirm payment and expected processing timeline for order ${orderRef}`;
    reason = 'Pending orders benefit from early intervention to prevent drop-offs.';
  } else if (order?.status === 'processing') {
    nextAction = `Send fulfillment progress update for order ${orderRef}`;
    reason = 'Processing-stage updates improve transparency and customer confidence.';
  } else if (order?.status === 'shipped') {
    recommendedType = 'note';
    nextAction = `Share delivery ETA and tracking reassurance for order ${orderRef}`;
    reason = 'Shipping-stage reassurance lowers anxiety and repeat support contacts.';
  } else if (order?.status === 'delivered') {
    recommendedType = 'email';
    nextAction = `Request feedback and suggest next best product after order ${orderRef}`;
    reason = 'Post-delivery outreach boosts retention and repeat purchases.';
  }

  if (openComms > 0) {
    priority = 'high';
    reason = `There are ${openComms} open communication thread(s); a quick follow-up prevents SLA misses.`;
  }

  const draftMessage = [
    `Hi ${customerName},`,
    '',
    `Quick update from our team regarding ${orderRef}.`,
    order?.status
      ? `Current status: ${order.status}. We are tracking this closely and will keep you informed.`
      : 'We reviewed your recent activity and wanted to proactively support your next step.',
    goal ? `Our internal goal here is: ${goal}.` : 'Our goal is to keep your experience smooth and transparent.',
    '',
    'If you need anything urgent, reply to this message and we will prioritize it.',
    '',
    'Best regards,',
    'Customer Success Team'
  ].join('\n');

  return {
    nextAction,
    draftMessage,
    priority,
    reason,
    recommendedType,
    followUpDate: getDefaultFollowUpDate()
  };
}

function normalizeSuggestion(suggestion, fallback) {
  const allowedPriority = new Set(['low', 'medium', 'high']);
  const allowedType = new Set(['call', 'email', 'meeting', 'note', 'support']);

  const normalizedPriority = String(suggestion?.priority || '').toLowerCase();
  const normalizedType = String(suggestion?.recommendedType || '').toLowerCase();
  const followUpDate = suggestion?.followUpDate ? String(suggestion.followUpDate).slice(0, 10) : fallback.followUpDate;

  return {
    nextAction: suggestion?.nextAction?.trim() || fallback.nextAction,
    draftMessage: suggestion?.draftMessage?.trim() || fallback.draftMessage,
    priority: allowedPriority.has(normalizedPriority) ? normalizedPriority : fallback.priority,
    reason: suggestion?.reason?.trim() || fallback.reason,
    recommendedType: allowedType.has(normalizedType) ? normalizedType : fallback.recommendedType,
    followUpDate
  };
}

function extractGeminiErrorMessage(error) {
  const statusCode = error?.response?.status;
  const apiStatus = error?.response?.data?.error?.status;
  const responseData = error?.response?.data;
  const responseMessage = responseData?.error?.message;
  const normalizedMessage = String(responseMessage || error?.message || '').toLowerCase();

  if (
    statusCode === 429 ||
    apiStatus === 'RESOURCE_EXHAUSTED' ||
    normalizedMessage.includes('quota') ||
    normalizedMessage.includes('rate limit')
  ) {
    return 'Gemini is temporarily unavailable due to quota limits. Using built-in AI suggestion.';
  }

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    normalizedMessage.includes('permission') ||
    normalizedMessage.includes('api key')
  ) {
    return 'Gemini access is not available right now. Using built-in AI suggestion.';
  }

  if (statusCode >= 500) {
    return 'Gemini service is temporarily unavailable. Using built-in AI suggestion.';
  }

  if (responseMessage || error?.message) {
    return 'Gemini is currently unavailable. Using built-in AI suggestion.';
  }

  return 'Gemini request failed. Using built-in AI suggestion.';
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// No static file serving - React handles frontend
app.use(session({
  secret: process.env.SESSION_SECRET || 'crm-hackathon-secret',
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
    const { username, password } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username taken' });
    const user = await User.create({ username, password, role: 'user' });
    req.session.userId = user._id;
    req.session.username = user.username;
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
    req.session.username = user.username;
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
    const customers = await Customer.find({}).sort({ createdAt: -1 });
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
    const customer = await Customer.create({ ...req.body, createdBy: 'admin' });
    res.json(customer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update customer
app.put('/api/customers/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(customer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete customer
app.delete('/api/customers/:id', auth, async (req, res) => {
  try {
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
    const order = await Order.create({ ...req.body, createdBy: 'admin' });
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update order
app.put('/api/orders/:id', auth, async (req, res) => {
  try {
    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) return res.status(404).json({ error: 'Order not found' });

    const previousStatus = existingOrder.status;
    Object.assign(existingOrder, req.body);
    await existingOrder.save();

    await createStatusChangeCommunication({
      order: existingOrder,
      previousStatus,
      nextStatus: existingOrder.status,
      createdBy: req.session.username || 'system'
    });

    const order = await Order.findById(existingOrder._id).populate('customer');
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete order
app.delete('/api/orders/:id', auth, async (req, res) => {
  try {
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
        status: mapWooStatusToOrderStatus(wo.status),
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

// ==================== AI SUGGESTIONS ====================

app.post('/api/ai/suggest', auth, async (req, res) => {
  try {
    const { customerId, orderId, goal } = req.body;

    let customer = null;
    let order = null;

    if (customerId) {
      customer = await Customer.findById(customerId);
    }

    if (orderId) {
      order = await Order.findById(orderId).populate('customer');
    }

    if (!customer && order?.customer) {
      customer = order.customer;
    }

    if (!customer) {
      customer = await Customer.findOne().sort({ createdAt: -1 });
    }

    if (!order && customer?._id) {
      order = await Order.findOne({ customer: customer._id }).sort({ createdAt: -1 }).populate('customer');
    }

    if (!customer && !order) {
      return res.status(400).json({ error: 'No customer/order context available. Add data first.' });
    }

    const resolvedCustomerId = customer?._id || order?.customer?._id || null;
    const resolvedOrderId = order?._id || null;

    const recentCommunications = resolvedCustomerId
      ? await Communication.find({ customer: resolvedCustomerId }).sort({ createdAt: -1 }).limit(5)
      : [];

    const fallback = buildRuleBasedSuggestion({
      customer,
      order,
      communications: recentCommunications,
      goal: goal || ''
    });

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        source: 'rule-based-fallback',
        warning: 'GEMINI_API_KEY is missing. Using rule-based suggestion.',
        customerId: resolvedCustomerId,
        orderId: resolvedOrderId,
        ...fallback
      });
    }

    const prompt = [
      'You are an e-commerce CRM copilot for customer success and operations.',
      'Return ONLY valid JSON with keys:',
      'nextAction, draftMessage, priority, reason, recommendedType, followUpDate',
      'Constraints:',
      '- priority must be one of: low, medium, high',
      '- recommendedType must be one of: call, email, meeting, note, support',
      '- followUpDate must be YYYY-MM-DD',
      '',
      `Goal: ${goal || 'Improve customer retention and close open loops quickly.'}`,
      `Customer: ${JSON.stringify({
        id: String(resolvedCustomerId || ''),
        firstName: customer?.firstName || order?.customer?.firstName || '',
        lastName: customer?.lastName || order?.customer?.lastName || '',
        email: customer?.email || order?.customer?.email || '',
        status: customer?.status || order?.customer?.status || ''
      })}`,
      `Order: ${JSON.stringify(order ? {
        id: String(order._id),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        notes: order.notes,
        products: order.products
      } : null)}`,
      `RecentCommunications: ${JSON.stringify(recentCommunications.map(c => ({
        type: c.type,
        subject: c.subject,
        status: c.status,
        createdAt: c.createdAt
      })))}`
    ].join('\n');

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    try {
      const response = await axios.post(geminiUrl, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      }, {
        timeout: 15000
      });

      const rawText = response.data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n') || '';
      const parsedSuggestion = parseGeminiJson(rawText);
      const suggestion = normalizeSuggestion(parsedSuggestion, fallback);

      return res.json({
        source: 'gemini',
        model,
        customerId: resolvedCustomerId,
        orderId: resolvedOrderId,
        ...suggestion
      });
    } catch (geminiError) {
      const warning = extractGeminiErrorMessage(geminiError);
      const statusCode = geminiError?.response?.status || 'unknown';
      console.warn(`AI suggestion warning (Gemini unavailable, status ${statusCode}). Using fallback.`);

      return res.json({
        source: 'rule-based-fallback',
        model,
        warning,
        customerId: resolvedCustomerId,
        orderId: resolvedOrderId,
        ...fallback
      });
    }
  } catch (e) {
    console.error('AI suggestion error:', e.message);
    res.status(500).json({ error: 'Failed to generate AI suggestion. Check GEMINI_API_KEY and try again.' });
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

// ==================== WEBHOOKS (Real-time Push) ====================

// Webhook for order updates from WooCommerce
app.post('/api/webhooks/order', async (req, res) => {
  try {
    const body = req.body || {};

    // WooCommerce may send a verification ping as x-www-form-urlencoded: webhook_id=...
    // Accept and acknowledge this so webhook activation succeeds.
    if (body.webhook_id && !body.id) {
      console.log(`Webhook verification ping received: webhook_id=${body.webhook_id}`);
      return res.status(200).json({ success: true, message: 'Webhook verification received' });
    }

    const { id, status, customer_id, total, line_items, customer_note } = body;

    if (!id) {
      return res.status(200).json({ success: true, message: 'Webhook received (no order id)' });
    }
    
    // Find or create customer
    let customer = await Customer.findOne({ wooCustomerId: String(customer_id) });
    if (!customer && customer_id) {
      customer = await Customer.create({
        wooCustomerId: String(customer_id),
        firstName: 'Webhook',
        lastName: 'Customer',
        email: `webhook-${customer_id}@woo.com`,
        status: 'customer',
        createdBy: 'webhook'
      });
    }

    const mappedStatus = mapWooStatusToOrderStatus(status);

    // Find or create order
    const existingOrder = await Order.findOne({ wooOrderId: String(id) });
    if (existingOrder) {
      const previousStatus = existingOrder.status;
      existingOrder.status = mappedStatus;
      existingOrder.notes = customer_note || existingOrder.notes;
      await existingOrder.save();

      await createStatusChangeCommunication({
        order: existingOrder,
        previousStatus,
        nextStatus: existingOrder.status,
        createdBy: 'webhook'
      });
    } else if (customer) {
      const createdOrder = await Order.create({
        wooOrderId: String(id),
        customer: customer._id,
        orderNumber: String(id),
        products: (line_items || []).map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.total) || 0
        })),
        totalAmount: parseFloat(total) || 0,
        status: mappedStatus,
        paymentStatus: status === 'completed' ? 'paid' : 'pending',
        notes: customer_note || '',
        createdBy: 'webhook'
      });

      await Communication.create({
        customer: createdOrder.customer,
        type: 'note',
        subject: `New WooCommerce order #${createdOrder.orderNumber}`,
        notes: `Automated workflow: new order created via webhook with status ${createdOrder.status}.`,
        followUpDate: ['pending', 'processing'].includes(createdOrder.status)
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : null,
        status: createdOrder.status === 'delivered' ? 'resolved' : 'open',
        createdBy: 'webhook'
      });
    }

    console.log(`Webhook received: Order ${id} - ${status}`);
    res.json({ success: true, message: 'Webhook processed' });
  } catch (e) {
    console.error('Webhook error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Webhook for customer updates from WooCommerce
app.post('/api/webhooks/customer', async (req, res) => {
  try {
    const { id, first_name, last_name, email, billing } = req.body;
    
    const existingCustomer = await Customer.findOne({ wooCustomerId: String(id) });
    if (existingCustomer) {
      existingCustomer.firstName = first_name || existingCustomer.firstName;
      existingCustomer.lastName = last_name || existingCustomer.lastName;
      existingCustomer.email = email || existingCustomer.email;
      existingCustomer.phone = billing?.phone || existingCustomer.phone;
      existingCustomer.company = billing?.company || existingCustomer.company;
      existingCustomer.address = billing?.address_1 || existingCustomer.address;
      await existingCustomer.save();
    } else {
      await Customer.create({
        wooCustomerId: String(id),
        firstName: first_name || 'Unknown',
        lastName: last_name || 'Customer',
        email: email || `webhook-${id}@woo.com`,
        phone: billing?.phone || '',
        company: billing?.company || '',
        address: billing?.address_1 || '',
        status: 'customer',
        createdBy: 'webhook'
      });
    }

    console.log(`Webhook received: Customer ${id} - ${first_name} ${last_name}`);
    res.json({ success: true, message: 'Webhook processed' });
  } catch (e) {
    console.error('Webhook error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Mock webhook test endpoint (for demo)
app.post('/api/webhooks/test', auth, async (req, res) => {
  try {
    const { type } = req.body;
    
    if (type === 'order') {
      // Simulate WooCommerce order webhook
      const testCustomer = await Customer.findOne();
      const mockOrder = {
        id: 'WC-' + Date.now(),
        status: 'processing',
        customer_id: testCustomer?.wooCustomerId || 'WC-2001',
        total: '4999.00',
        line_items: [{ name: 'Webhook Test Product', quantity: 1, total: '4999.00' }],
        customer_note: 'Test order from webhook'
      };
      
      // Process as if real webhook
      const customer = await Customer.findOne({ wooCustomerId: mockOrder.customer_id });
      if (customer) {
        await Order.create({
          wooOrderId: mockOrder.id,
          customer: customer._id,
          orderNumber: mockOrder.id,
          products: [{ name: 'Webhook Test Product', quantity: 1, price: 4999 }],
          totalAmount: 4999,
          status: 'processing',
          paymentStatus: 'paid',
          notes: 'Created via webhook test',
          createdBy: 'webhook-test'
        });
      }
      res.json({ success: true, message: 'Test order webhook processed' });
    } else if (type === 'customer') {
      // Simulate WooCommerce customer webhook
      await Customer.create({
        wooCustomerId: 'WC-' + Date.now(),
        firstName: 'Webhook',
        lastName: 'Test Customer',
        email: `webhook-${Date.now()}@test.com`,
        phone: '9999999999',
        company: 'Test Company',
        address: 'Webhook Test Address',
        status: 'lead',
        createdBy: 'webhook-test'
      });
      res.json({ success: true, message: 'Test customer webhook processed' });
    } else {
      res.status(400).json({ error: 'Invalid type. Use "order" or "customer"' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('http://localhost:3000'));
