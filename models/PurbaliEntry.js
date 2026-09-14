import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    qty: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 }, // qty * rate, snapshot at entry time
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
    accountNo: { type: String, trim: true },
    department: { type: String, trim: true },
    items: {
      type: [itemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one item with quantity is required",
      },
    },
    totalAmount: { type: Number, required: true, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // remove if you don't track this
  },
  { timestamps: true },
);

// Keep totalAmount honest even if something bypasses the client calc
purbaliEntrySchema.pre("validate", function (next) {
  if (Array.isArray(this.items)) {
    this.totalAmount = this.items.reduce(
      (sum, item) => sum + Number(item.amount || item.qty * item.rate || 0),
      0,
    );
  }
  next();
});

purbaliEntrySchema.index({ carNo: 1, date: -1 });

const PurbaliEntry = mongoose.model("PurbaliEntry", purbaliEntrySchema);
export default PurbaliEntry;
