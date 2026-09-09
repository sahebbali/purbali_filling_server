import mongoose from "mongoose";

const discountSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "Product ID is required"],
    unique: true, // One discount per product
  },
  productName: {
    type: String,
    required: [true, "Product name is required"],
  },
  discountType: {
    type: String,
    enum: ["fixed", "percentage"],
    required: [true, "Discount type is required"],
  },
  discountAmount: {
    type: Number,
    required: [true, "Discount amount is required"],
    min: [0, "Discount amount cannot be negative"],
    validate: {
      validator: function (value) {
        if (this.discountType === "percentage" && value > 100) {
          return false;
        }
        return true;
      },
      message: "Percentage discount cannot exceed 100%",
    },
  },
  startDate: {
    type: Date,
    required: [true, "Start date is required"],
  },
  endDate: {
    type: Date,
    required: [true, "End date is required"],
    validate: {
      validator: function (value) {
        return value > this.startDate;
      },
      message: "End date must be after start date",
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for better query performance
// discountSchema.index({ productId: 1 });
discountSchema.index({ startDate: 1, endDate: 1 });
discountSchema.index({ isActive: 1 });

// Virtual field to check if discount is currently active
discountSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
});

discountSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Discount = mongoose.model("Discount", discountSchema);

export default Discount;
