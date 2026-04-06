import { Router } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Lazy Razorpay init — so server can start even if keys are not yet set
let razorpay = null;
function getRazorpay() {
  if (!razorpay) {
    const key_id = process.env.RAZOR_TEST_API_KEY;
    const key_secret = process.env.RAZOR_KEY_SECRET;
    if (!key_id || !key_secret) {
      throw new Error('Razorpay keys are not configured in .env');
    }
    razorpay = new Razorpay({ key_id, key_secret });
  }
  return razorpay;
}

// GET /checkout/key — return Razorpay key to frontend
router.get('/checkout/key', (req, res) => {
  res.json({ key: process.env.RAZOR_TEST_API_KEY || '' });
});

// POST /checkout — Create a Razorpay order
router.post('/checkout', protect, async (req, res) => {
  try {
    const { items, totalAmount, addressDetails } = req.body;
    const userId = req.user._id;

    if (!items || !items.length || !totalAmount) {
      return res.status(400).json({ error: 'Items and totalAmount are required' });
    }

    const rp = getRazorpay();

    // Create Razorpay order (amount in paise)
    const options = {
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: `order_${Date.now()}`,
    };

    const order = await rp.orders.create(options);

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /verify-payment — Verify Razorpay signature & save order
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      totalAmount,
      addressDetails,
    } = req.body;

    const userId = req.user._id;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZOR_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Save order to DB
    const order = await Order.create({
      userId,
      items,
      totalAmount,
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      status: 'paid',
      address: addressDetails,
    });

    // Clear user's cart
    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res.json({ success: true, order });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
