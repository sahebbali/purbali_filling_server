import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    header: {
      type: String,
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

    image: {
      url: String,
      public_id: String,
    },

    order: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true },
);

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    description: {
      type: String,
      default: "",
    },

    logo: {
      url: String,
      public_id: String,
    },

    banners: {
      type: [bannerSchema],
      default: [],
    },

    website: {
      type: String,
    },

    country: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const Brand = mongoose.model("Brand", brandSchema);

export default Brand;
