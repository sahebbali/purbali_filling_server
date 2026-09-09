import mongoose from "mongoose";

// Cloudinary Image Schema
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: "" },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    badge: { type: String }, // For badges like "3.1 kg"
    width: { type: Number },
    height: { type: Number },
    format: { type: String },
    bytes: { type: Number },
  },
  { _id: false },
);

// Review schema for product ratings
const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 0, max: 5 },
    title: { type: String },
    comment: { type: String, required: true },
    isVerifiedPurchase: { type: Boolean, default: false },
    helpful: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

// Color Variant Schema
const colorVariantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // e.g., "black", "chalk"
    label: { type: String, required: true }, // e.g., "Black", "Chalk"
    hex: { type: String, required: true }, // e.g., "#363636"
    price: { type: Number },
    sku: { type: String },
    stockQuantity: { type: Number, default: 0, min: 0 },
    images: { type: [imageSchema], default: [] }, // Color-specific images
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

// Size Variant Schema
const sizeVariantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // e.g., "standard", "large"
    label: { type: String, required: true }, // e.g., "Transit Carry-On"
    dims: { type: String, required: true }, // e.g., "555 × 350 × 225 mm"
    price: { type: Number, required: true, min: 0 },
    sku: { type: String },
    stockQuantity: { type: Number, default: 0, min: 0 },
    weight: { type: String }, // e.g., "3.1 kg"
    volume: { type: String }, // e.g., "41L"
    capacity: { type: String }, // e.g., "34L"
    external: { type: String },
    internal: { type: String },
    handle: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

// Feature Schema
const featureSchema = new mongoose.Schema(
  {
    icon: { type: String }, // e.g., "✈", "🧳"
    text: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

// Media/Gallery Schema
const mediaSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    alt: { type: String },
    src: { type: String, required: true },
    publicId: { type: String, required: true }, // Cloudinary public ID
    badge: { type: String }, // Optional badge text
    isThumbnail: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

// Trust Badge Schema
const trustBadgeSchema = new mongoose.Schema(
  {
    icon: { type: String, required: true },
    label: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

// Breadcrumb Schema
const breadcrumbSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    href: { type: String, default: "#" },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

// Specifications Schema
const specificationsSchema = new mongoose.Schema(
  {
    volume: { type: String },
    capacity: { type: String },
    weight: { type: String },
    external: { type: String },
    internal: { type: String },
    handle: { type: String },
    warranty: { type: String },
    material: { type: String },
    origin: { type: String },
  },
  { _id: false },
);

// Main Product Schema
const productSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },

    // Breadcrumbs
    breadcrumbs: {
      type: [breadcrumbSchema],
      default: [],
    },

    // Pricing
    regularPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
    },
    cost: {
      type: Number,
      min: 0,
    },

    // Variants
    colors: {
      type: [colorVariantSchema],
      default: [],
    },
    sizes: {
      type: [sizeVariantSchema],
      default: [],
    },

    // Features
    features: {
      type: [featureSchema],
      default: [],
    },

    // Specifications (size-specific)
    specifications: {
      type: Map,
      of: specificationsSchema,
      default: {},
    },

    // Media
    media: {
      type: [mediaSchema],
      default: [],
    },
    thumbnail: {
      type: String, // Main thumbnail URL
    },

    // Trust Badges
    trustBadges: {
      type: [trustBadgeSchema],
      default: [],
    },

    // Shipping
    shipping: {
      badge: { type: String },
      timeframe: { type: String },
      freeShipping: { type: Boolean, default: false },
      shippingWeight: { type: Number },
    },

    // ⭐ Ratings & Reviews
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },

    // 📦 Inventory
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    isInStock: {
      type: Boolean,
      default: true,
    },

    // 🏷️ Tags & SEO
    tags: {
      type: [String],
      default: [],
    },
    metaTitle: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
    },
    metaKeywords: {
      type: [String],
      default: [],
    },

    // 📊 Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
    },

    // Additional Info
    warranty: {
      type: String,
    },
    returnPolicy: {
      type: String,
    },
    notes: {
      type: String,
      trim: true,
    },

    // Sales tracking
    totalSales: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

// 🔎 Indexing for better performance
productSchema.index({ name: "text", description: "text", brand: "text" });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ regularPrice: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ totalSales: -1 });
productSchema.index({ createdAt: -1 });
// productSchema.index({ "colors.sku": 1 });
// productSchema.index({ "sizes.sku": 1 });

// Virtual for calculated discount percentage
productSchema.virtual("discount").get(function () {
  if (this.originalPrice && this.originalPrice > this.regularPrice) {
    return Math.round(
      ((this.originalPrice - this.regularPrice) / this.originalPrice) * 100,
    );
  }
  return 0;
});

// Method to get minimum price across variants
productSchema.methods.getMinPrice = function () {
  const colorPrices = this.colors.map((c) => c.price);
  const sizePrices = this.sizes.map((s) => s.price);
  const allPrices = [this.regularPrice, ...colorPrices, ...sizePrices];
  return Math.min(...allPrices);
};

// Method to get maximum price across variants
productSchema.methods.getMaxPrice = function () {
  const colorPrices = this.colors.map((c) => c.price);
  const sizePrices = this.sizes.map((s) => s.price);
  const allPrices = [this.regularPrice, ...colorPrices, ...sizePrices];
  return Math.max(...allPrices);
};

// Method to check if product has variants
productSchema.methods.hasVariants = function () {
  return this.colors.length > 0 || this.sizes.length > 0;
};

// Pre-save middleware to update isInStock and discountPercentage
productSchema.pre("save", function (next) {
  // Update stock status
  this.isInStock = this.stockQuantity > 0;

  // Update discount percentage
  if (this.originalPrice && this.originalPrice > this.regularPrice) {
    this.discountPercentage = Math.round(
      ((this.originalPrice - this.regularPrice) / this.originalPrice) * 100,
    );
  } else {
    this.discountPercentage = 0;
  }

  next();
});

const Product = mongoose.model("Product", productSchema);

export default Product;
