import mongoose from "mongoose";
const { Schema } = mongoose;

const LINE_TYPES = [
  "FUEL",
  "GENERATOR",
  "SERVICING",
  "LUBE",
  "BRANCH",
  "PERIOD",
  "OTHER",
];

const LineSchema = new Schema(
  {
    line_name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: LINE_TYPES,
      default: "OTHER",
    },
    unit: { type: String, trim: true }, // single tag code, e.g. "APBML"
    tags: [{ type: String, trim: true }], // multiple tag codes, e.g. Akij Group's SAL/ACRL/...
  },
  { _id: false },
);

const AccountSchema = new Schema(
  {
    _id: { type: Number }, // matches the numeric _id used in accounts.json
    sl_no: { type: Number, default: null }, // original Sl No; null where the sheet left it blank
    ac_no: { type: String, required: true, trim: true }, // kept as string: "8(A)", "20 A", "32A", etc.
    name: { type: String, required: true, trim: true },
    lines: [LineSchema],
  },
  {
    timestamps: true,
    collection: "accounts",
  },
);

// Common lookups
AccountSchema.index({ ac_no: 1 });
AccountSchema.index({ name: "text", "lines.line_name": "text" });

const Account = mongoose.model("Account-Info", AccountSchema);

export default Account;
