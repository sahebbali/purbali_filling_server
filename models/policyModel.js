import mongoose from "mongoose";

// ── Item sub-document ─────────────────────────────────────────────────────────
const itemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Rule text is required"],
      trim: true,
      maxlength: [1000, "Rule text cannot exceed 1000 characters"],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// ── Section document ──────────────────────────────────────────────────────────
const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Section name is required"],
      trim: true,
      maxlength: [200, "Section name cannot exceed 200 characters"],
    },
    category: {
      type: String,
      enum: {
        values: ["return", "refund", "claim", "general"],
        message: "Category must be return, refund, claim, or general",
      },
      required: [true, "Category is required"],
      default: "general",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    items: [itemSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual: item count
sectionSchema.virtual("itemCount").get(function () {
  return this.items.length;
});

// Index for fast category filtering
sectionSchema.index({ category: 1, order: 1 });
const Policy = mongoose.model("Policy", sectionSchema);
export default Policy;
