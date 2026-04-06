import { Router } from 'express';
import Cart from '../models/Cart.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// All cart routes require authentication
router.use(protect);

// GET /cart/:userId — get user's cart
router.get('/:userId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    res.json(cart || { userId: req.params.userId, items: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /cart/add — add item to cart (or increment qty if exists)
router.post('/add', async (req, res) => {
  try {
    const { productId, name, price, quantity, image, size } = req.body;
    const userId = req.user._id;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({
        userId,
        items: [{ productId, name, price, quantity: quantity || 1, image, size }],
      });
      return res.status(201).json(cart);
    }

    // Check if same product + size already exists
    const idx = cart.items.findIndex(
      (i) => i.productId.toString() === productId && i.size === (size || '')
    );

    if (idx > -1) {
      cart.items[idx].quantity += quantity || 1;
    } else {
      cart.items.push({ productId, name, price, quantity: quantity || 1, image, size });
    }

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /cart/update — update quantity of an item
router.put('/update', async (req, res) => {
  try {
    const { productId, size, quantity } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const idx = cart.items.findIndex(
      (i) => i.productId.toString() === productId && i.size === (size || '')
    );

    if (idx === -1) return res.status(404).json({ error: 'Item not found in cart' });

    if (quantity <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = quantity;
    }

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /cart/remove — remove item from cart
router.delete('/remove', async (req, res) => {
  try {
    const { productId, size } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.items = cart.items.filter(
      (i) => !(i.productId.toString() === productId && i.size === (size || ''))
    );

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /cart/sync — bulk sync cart (merge localStorage cart on login)
router.post('/sync', async (req, res) => {
  try {
    const { items } = req.body; // array of { productId, name, price, quantity, image, size }
    const userId = req.user._id;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({ userId, items });
      return res.status(201).json(cart);
    }

    // Merge incoming items with existing cart
    for (const incoming of items) {
      const idx = cart.items.findIndex(
        (i) => i.productId.toString() === incoming.productId && i.size === (incoming.size || '')
      );
      if (idx > -1) {
        cart.items[idx].quantity += incoming.quantity || 1;
      } else {
        cart.items.push(incoming);
      }
    }

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /cart/clear — clear entire cart (used after order placement)
router.delete('/clear', async (req, res) => {
  try {
    const userId = req.user._id;
    await Cart.findOneAndUpdate({ userId }, { items: [] });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
