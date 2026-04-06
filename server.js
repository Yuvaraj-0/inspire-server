// Load environment variables FIRST (must be before any import that reads process.env)
import 'dotenv/config';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

// Routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import analyticsRoutes from './routes/analytics.js';
import cartRoutes from './routes/cart.js';
import checkoutRoutes from './routes/checkout.js';
import ordersRoutes from './routes/orders.js';

import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import { protect, adminOnly } from './middleware/auth.js';
const app = express();
const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI;

//GOOGLE OAUTH 
app.use(passport.initialize());
// ─── Middleware ────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:8080'], credentials: true }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Nextlevell API is running 🚀' });
});

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/categories', categoryRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', ordersRoutes);
app.use('/', checkoutRoutes);

// ─── Contact Us & Live Notifications ───────────────────────
const ContactMessageSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const ContactMessage = mongoose.model('ContactMessage', ContactMessageSchema);

app.get('/contact/messages', protect, adminOnly, async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

let adminClients = []; // SSE connected clients

app.get('/admin/notifications', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).send('No token');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') return res.status(403).send('Forbidden');

    // Setup SSE HTTP headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish stream

    adminClients.push(res);

    req.on('close', () => {
      adminClients = adminClients.filter(c => c !== res);
    });
  } catch (err) {
    res.status(401).send('Invalid token');
  }
});

app.post('/contact', async (req, res) => {
  try {
    const { firstName, lastName, email, message } = req.body;
    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const msg = await ContactMessage.create({ firstName, lastName, email, message });
    
    // Broadcast live event to open admin clients
    adminClients.forEach(client => {
      client.write(`data: ${JSON.stringify(msg)}\n\n`);
    });

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ─── Connect & Start ─────────────────────────────────────
const startServer = async () => {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env file');
    process.exit(1);
  }

  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Mongoose event listeners
mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('🔄 MongoDB reconnected'));

startServer();