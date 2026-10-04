import mongoose from "mongoose";

export const EXPENSE_TYPES = [
  { key: "entertainment", label: "Entertainment", group: null },
  {
    key: "fuel_carrying_charge",
    label: "Fuel Carrying Charge",
    group: "Miscellaneous Expenses",
  },
  { key: "fuel", label: "Fuel", group: "Miscellaneous Expenses" },
  { key: "donation", label: "Donation", group: "Miscellaneous Expenses" },
  { key: "commission", label: "Commission", group: null },
  { key: "conveyance", label: "Conveyance", group: null },
  { key: "salary", label: "Salary", group: null },
  { key: "utility_bill", label: "Utility Bill", group: null },
  { key: "stationery", label: "Stationery", group: null },
  { key: "medical", label: "Medical", group: null },
  {
    key: "maintenance_furniture",
    label: "Maintenance & Furniture",
    group: null,
  },
  { key: "md_sir", label: "MD Sir", group: null },
  { key: "mr_bulu", label: "Mr. Bulu", group: null },
  { key: "ait_bsti", label: "AIT & BSTI", group: null },
  { key: "eid_bonus", label: "Eid Bonus", group: null },
  { key: "padma_l", label: "Padma L", group: null },
  { key: "rent", label: "Rent", group: null },
];

export const EXPENSE_KEYS = EXPENSE_TYPES.map((t) => t.key);

const purbaliExpenseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    type: { type: String, enum: EXPENSE_KEYS, required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

purbaliExpenseSchema.index({ date: 1, type: 1 });

const Expense = mongoose.model("Expense", purbaliExpenseSchema);

export default Expense;

// One place to define columns. Order here = column order in the sheet.
// `group` is used for the "Miscellaneous Expenses" merged header.
