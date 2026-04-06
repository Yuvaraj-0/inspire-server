import mongoose from 'mongoose';

const SizeVariantSchema = new mongoose.Schema({
  size: { type: String, required: true },
  stock: { type: Number, required: true, min: 0, default: 0 },
  price: { type: Number, required: true, min: 0 }
});

const ColorVariantSchema = new mongoose.Schema({
  color: { type: String, required: true },
  colorHex: { type: String, required: true },
  images: [String],
  sizes: [SizeVariantSchema]
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, lowercase: true, trim: true },
  description: { type: String, default: '' },
  basePrice: { type: Number, required: true, min: 0 },

  images: [String],
  variants: [ColorVariantSchema]
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
    }
  }
});

const Product = mongoose.model('Product', productSchema);
export default Product;
