import mongoose from "mongoose";

const purbaliItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    qty: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const purbaliEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    receivingDate: { type: Date },
    couponNo: { type: String, trim: true },
    accountNo: { type: String, trim: true },

    // Account-specific tag (e.g. a client/site tag), separate from consumptionType
    department: { type: String, trim: true },

    // Fixed consumption categories, independent of department
    consumptionType: {
      type: String,
      enum: ["Generator", "Hospital", "Stock", "Other", ""],
      default: "",
    },

    carNo: { type: String, required: true, trim: true },

    items: {
      type: [purbaliItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one item is required.",
      },
    },

    totalAmount: { type: Number, required: true, min: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
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

// Support filtering/sorting by car no, date range, and type on the entries list
purbaliEntrySchema.index({ carNo: 1 });
purbaliEntrySchema.index({ date: 1 });
purbaliEntrySchema.index({ consumptionType: 1 });
purbaliEntrySchema.index({ accountNo: 1 });

const PurbaliEntry = mongoose.model("PurbaliEntry", purbaliEntrySchema);
export default PurbaliEntry;
