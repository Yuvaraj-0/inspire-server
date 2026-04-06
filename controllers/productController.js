import Product from '../models/Product.js';
import { uploadImage, deleteImage } from '../config/cloudinary.js';

// Helper to extract Cloudinary public ID from URL
const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const fileWithExt = parts.pop();
  if (!fileWithExt) return null;
  const file = fileWithExt.split('.')[0];
  const folder = parts.pop();
  return `${folder}/${file}`;
};

export const getAllProducts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, category, description, basePrice } = req.body;
    
    let variants = [];
    if (req.body.variants) {
      try {
        variants = JSON.parse(req.body.variants);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid variants JSON' });
      }
    }

    const images = [];

    // upload.fields provides an object with keys matching the field names
    // If not using fields, but just a flat array, Multer puts it in req.files if using upload.any()
    // Let's support both req.files (array) or req.files (object from fields)
    const filesArray = Array.isArray(req.files) ? req.files : [];
    if (!Array.isArray(req.files) && req.files) {
      Object.keys(req.files).forEach(key => filesArray.push(...req.files[key]));
    }

    if (filesArray.length > 0) {
      for (const file of filesArray) {
        const result = await uploadImage(file.buffer);
        if (file.fieldname === 'images') {
          images.push(result.url);
        } else if (file.fieldname.startsWith('variantImages_')) {
          const index = parseInt(file.fieldname.split('_')[1], 10);
          if (variants[index]) {
            if (!variants[index].images) variants[index].images = [];
            variants[index].images.push(result.url);
          }
        }
      }
    }

    const product = await Product.create({
      name,
      category,
      description,
      basePrice: Number(basePrice),
      images,
      variants,
    });
    
    res.status(201).json(product);
  } catch (err) {
    console.error(">>> CREATE PRODUCT ERROR:", err);
    res.status(500).json({ error: err.stack || err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let parsedVariants = undefined;
    if (req.body.variants) {
      try {
        parsedVariants = JSON.parse(req.body.variants);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid variants JSON' });
      }
    }
    
    const filesArray = Array.isArray(req.files) ? req.files : [];
    if (!Array.isArray(req.files) && req.files) {
      Object.keys(req.files).forEach(key => filesArray.push(...req.files[key]));
    }

    const newGeneralImages = [];
    if (filesArray.length > 0) {
      for (const file of filesArray) {
        const result = await uploadImage(file.buffer);
        if (file.fieldname === 'images') {
          newGeneralImages.push(result.url);
        } else if (file.fieldname.startsWith('variantImages_')) {
          const index = parseInt(file.fieldname.split('_')[1], 10);
          if (parsedVariants && parsedVariants[index]) {
            if (!parsedVariants[index].images) parsedVariants[index].images = [];
            parsedVariants[index].images.push(result.url);
          }
        }
      }
    }

    const updates = { ...req.body };
    if (updates.basePrice) updates.basePrice = Number(updates.basePrice);
    if (parsedVariants) updates.variants = parsedVariants;

    let finalGeneralImages = [];
    if (updates.existingImages) {
      finalGeneralImages = Array.isArray(updates.existingImages) ? updates.existingImages : [updates.existingImages];
    } else if (product.images && newGeneralImages.length === 0) {
      finalGeneralImages = product.images;
    }
    updates.images = [...finalGeneralImages, ...newGeneralImages];

    const updated = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    res.json(updated);
  } catch (err) {
    console.error(">>> UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ error: err.stack || err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let urlsToDelete = [...(product.images || [])];
    if (product.variants) {
      for (const v of product.variants) {
        if (v.images) urlsToDelete.push(...v.images);
      }
    }
    
    if (product._doc.image) urlsToDelete.push(product._doc.image);

    for (const url of urlsToDelete) {
      const publicId = extractPublicId(url);
      if (publicId) await deleteImage(publicId).catch(() => {});
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
