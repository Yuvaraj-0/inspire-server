import { Router } from 'express';
import Category from '../models/Category.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

// GET /categories — public
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    // Map to { id, name } to match frontend ApiCategory shape
    res.json(
      categories.map((c) => ({ id: c._id.toString(), name: c.name }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /categories — admin only
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const existing = await Category.findOne({ name: name.trim().toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Category already exists' });

    const category = await Category.create({ name: name.trim() });
    res.status(201).json({ id: category._id.toString(), name: category.name });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /categories/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
