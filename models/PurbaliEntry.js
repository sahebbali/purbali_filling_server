import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    qty: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const purbaliEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    receivingDate: { type: Date },
    vehicleNo: { type: String, trim: true },
    couponNo: { type: String, trim: true },
    carNo: { type: String, trim: true, required: true },
    items: {
      type: [itemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one item with quantity is required",
      },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // remove if you don't track this
  },
  { timestamps: true },
);

purbaliEntrySchema.index({ carNo: 1, date: -1 });

const PurbaliEntry = mongoose.model("PurbaliEntry", purbaliEntrySchema);
export default PurbaliEntry;
