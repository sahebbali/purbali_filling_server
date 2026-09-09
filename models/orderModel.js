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
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  // Variants
  selectedColor: {
    id: String,
    label: String,
    hex: String,
    sku: String,
  },

  selectedSize: {
    id: String,
    label: String,
    dims: String,
    sku: String,
    price: Number,
  },
  sku: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});

const timelineSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  note: String,
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
      },
      phone: String,
      address: {
        type: String,
      },
    },
    items: [orderItemSchema],
    itemsCount: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shipping: {
      type: Number,
      required: true,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    payment: {
      method: {
        type: String,
        enum: ["bkash", "cash_on_delivery"],
      },
      transactionId: String,
      paymentDate: Date,
      bkashNumber: String,
    },
    shippingAddress: [
      {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
        zipCode: String,
      },
    ],
    timeline: [timelineSchema],
    notes: String,
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    coupons: [
      {
        code: {
          type: String,
          required: true,
        },
        discountType: {
          type: String,
          enum: ["percentage", "fixed"],
          required: true,
        },
        discountValue: {
          type: Number,
          required: true,
        },
        discountAmount: {
          type: Number,
          required: true,
        },
        appliedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalProfit: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Generate order ID before saving
orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const count = await this.constructor.countDocuments();
    this.orderId = `ORD-${year}${month}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Update timeline when status changes
orderSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    const statusMessages = {
      pending: "Order placed and awaiting processing",
      processing: "Order is being processed",
      shipped: "Order has been shipped",
      delivered: "Order has been delivered",
      cancelled: "Order has been cancelled",
    };

    this.timeline.push({
      status: this.status,
      date: new Date(),
      note: statusMessages[this.status],
    });
  }
  next();
});

//

export default mongoose.model("Order", orderSchema);
