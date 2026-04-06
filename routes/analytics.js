import { Router } from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';

const router = Router();

// GET /analytics — public (dashboard + analytics page)
router.get('/', async (req, res) => {
  try {
    const [totalProducts, totalCategories, totalOrders, stockAgg, perCategoryAgg] =
      await Promise.all([
        Product.countDocuments(),
        Category.countDocuments(),
        Order.countDocuments(),
        Product.aggregate([{ $group: { _id: null, total: { $sum: '$stock' } } }]),
        Product.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 }, stock: { $sum: '$stock' } } },
          { $sort: { _id: 1 } },
        ]),
      ]);

    const totalStock = stockAgg[0]?.total ?? 0;

    const productsPerCategory = perCategoryAgg.map((g) => ({
      category: g._id,
      count: g.count,
    }));

    const stockDistribution = perCategoryAgg.map((g) => ({
      name: g._id,
      value: g.stock,
    }));

    res.json({
      totalProducts,
      totalCategories,
      totalOrders,
      totalStock,
      productsPerCategory,
      stockDistribution,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
