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

const carouselManagerSchema = new Schema(
  {
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
    header: {
      type: String,
      maxlength: 500,
      default: "",
    },
    subHeader: {
      type: String,
      default: "",
    },
    buttonText: {
      type: String,
      default: "",
    },

    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    bannerImages: bannerImageSchema,
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  },
);

// Indexes
carouselManagerSchema.index({ brand: "text", header: "text" });
carouselManagerSchema.index({ is_active: 1, parent_id: 1 });

const CarouselManager = mongoose.model(
  "CarouselManager",
  carouselManagerSchema,
);
export default CarouselManager;
