import mongoose from "mongoose";

const purbaliRateSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["Litre", "Pcs"],
      default: "Pcs",
    },
    order: { type: Number, default: 0 },
    showInBill: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const PurbaliRate = mongoose.model("PurbaliRate", purbaliRateSchema);

export default PurbaliRate;
