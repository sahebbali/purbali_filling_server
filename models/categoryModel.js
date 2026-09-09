import mongoose from "mongoose";
const Schema = mongoose.Schema;
// Banner Image Schema
const bannerImageSchema = new Schema({
  url: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 2,
      maxlength: 50,
      index: true,
    },
    brand_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: "Tescon",
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },
    icon: {
      type: String,
      default: "🗂️",
    },
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    path: {
      type: String,
      index: true,
    },
    level: {
      type: Number,
      default: 0,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    subcategories: [],
    bannerImages: [bannerImageSchema],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  },
);

// Indexes
categorySchema.index({ name: "text" });
categorySchema.index({ is_active: 1, parent_id: 1 });
categorySchema.index({ path: 1, is_active: 1 });
categorySchema.index({ level: 1, is_active: 1 });

// Virtuals
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent_id",
  justOne: false,
});

categorySchema.virtual("parent", {
  ref: "Category",
  localField: "parent_id",
  foreignField: "_id",
  justOne: true,
});

// Pre-save hook for hierarchy management
categorySchema.pre("save", async function (next) {
  if (this.isModified("parent_id")) {
    if (this.parent_id) {
      const Category = mongoose.model("Category");
      const parent = await Category.findById(this.parent_id);
      if (!parent) {
        return next(new Error("Parent category not found"));
      }
      this.level = parent.level + 1;
      this.path = parent.path
        ? `${parent.path},${this._id}`
        : `${parent._id},${this._id}`;
    } else {
      this.level = 0;
      this.path = this._id.toString();
    }
  }

  // Auto-generate slug if not provided
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  }

  next();
});

const Category = mongoose.model("Category", categorySchema);
export default Category;
