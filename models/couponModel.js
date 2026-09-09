import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    discountType: {
      type: String,
      required: [true, "Discount type is required"],
      enum: ["percentage", "fixed"],
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0.01, "Discount value must be greater than 0"],
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
    minPurchase: {
      type: Number,
      required: [true, "Minimum purchase amount is required"],
      default: 0,
      min: [0, "Minimum purchase cannot be negative"],
    },
    maxDiscount: {
      type: Number,
      min: [0, "Maximum discount cannot be negative"],
      validate: {
        validator: function (value) {
          // Only validate if discountType is percentage and maxDiscount is provided
          if (this.discountType === "percentage" && value) {
            return value > 0;
          }
          return true;
        },
        message:
          "Maximum discount must be greater than 0 for percentage coupons",
      },
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      validate: {
        validator: function (value) {
          return value <= this.endDate;
        },
        message: "Start date must be before or equal to end date",
      },
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (value) {
          return value >= this.startDate;
        },
        message: "End date must be after or equal to start date",
      },
    },
    usageLimit: {
      type: Number,
      required: [true, "Usage limit is required"],
      min: [1, "Usage limit must be at least 1"],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    userLimit: {
      type: Number,
      default: 1,
      min: 1,
      comment: "How many times a single user can use this coupon",
    },
    createdBy: {
      type: String,
      required: true,
    },
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        discountApplied: Number,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
couponSchema.index({ startDate: 1, endDate: 1 });
couponSchema.index({ isActive: 1, endDate: 1 });
couponSchema.index({ code: 1, isActive: 1 });

// Virtual field to check if coupon is expired
couponSchema.virtual("isExpired").get(function () {
  return new Date() > this.endDate;
});

// Virtual field to check if coupon is valid
couponSchema.virtual("isValid").get(function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.startDate &&
    now <= this.endDate &&
    this.usedCount < this.usageLimit
  );
});

// Method to check if coupon can be used by user
couponSchema.methods.canBeUsedByUser = function (email) {
  const userUsage = this.usedBy.filter((usage) => usage.user === email);
  return userUsage.length < this.userLimit;
};

// Method to apply coupon
couponSchema.methods.applyCoupon = async function (
  userId,
  orderId,
  cartTotal,
  discountAmount,
) {
  this.usedCount += 1;
  this.usedBy.push({
    user: userId,
    orderId: orderId,
    discountApplied: discountAmount,
  });
  await this.save();
};

// Static method to validate and calculate discount
couponSchema.statics.calculateDiscount = async function (
  couponCode,
  cartTotal,
  email,
) {
  const coupon = await this.findOne({ code: couponCode.toUpperCase() });

  if (!coupon) {
    throw new Error("Invalid coupon code");
  }

  // if (!coupon.isValid) {
  //   throw new Error("Coupon is not valid");
  // }

  if (cartTotal < coupon.minPurchase) {
    throw new Error(`Minimum purchase of ৳${coupon.minPurchase} required`);
  }

  if (!coupon.canBeUsedByUser(email)) {
    throw new Error("You have reached the usage limit for this coupon");
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (cartTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.min(discount, cartTotal);

  return {
    coupon,
    discount,
    newTotal: cartTotal - discount,
  };
};

export default mongoose.model("Coupon", couponSchema);
