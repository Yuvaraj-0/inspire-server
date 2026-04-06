import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../controllers/productController.js';

const router = Router();

// dynamic fields for variants up to max 10
const uploadFields = [{ name: 'images' }];
for (let i = 0; i < 10; i++) {
  uploadFields.push({ name: `variantImages_${i}` });
}

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', protect, adminOnly, upload.fields(uploadFields), createProduct);
router.put('/:id', protect, adminOnly, upload.any(), updateProduct); 
router.delete('/:id', protect, adminOnly, deleteProduct);

export default router;
