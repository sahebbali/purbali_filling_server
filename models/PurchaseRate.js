// models/Purchase.js
// Rate card (per account) + Purchase (quantities, snapshot rates, computed totals)
import mongoose from "mongoose";

/* ------------------------------------------------------------------ */
/* Items & helpers                                                     */
/* ------------------------------------------------------------------ */

export const ITEMS = [
  // Fuel
  "octane",
  "diesel",
  // Oils
  "looseMobile",
  "tq1", // T.Q-1
  "tq5", // T.Q-5
  "brakeOil",
  "powerOil",
  "gearOil",
  // Other items
  "qw", // Q.W
  "af", // A.F
  "mf", // M.F
  "pf", // P.F
  "df", // D.F
  "af2", // second "A.F" (duplicate in original list, rename as needed)
  // Service
  "servicing",
];

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/* ------------------------------------------------------------------ */
/* Rate card (one per account)                                         */
/* ------------------------------------------------------------------ */

const rate = { type: Number, default: 0, min: 0 };

const PurchaseRateSchema = new mongoose.Schema(
  {
    accountNo: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true },
    ...Object.fromEntries(ITEMS.map((k) => [k, rate])),
  },
  { timestamps: true },
);

// Build line items from quantities: { octane: 50, diesel: 30, gearOil: 2 }
PurchaseRateSchema.methods.toLineItems = function (quantities = {}) {
  return Object.entries(quantities)
    .filter(([item, qty]) => ITEMS.includes(item) && qty > 0)
    .map(([item, qty]) => ({ item, qty, rate: this[item] }));
};

export const PurchaseRate =
  mongoose.models.PurchaseRate ||
  mongoose.model("PurchaseRate", PurchaseRateSchema);

/* ------------------------------------------------------------------ */
/* Purchase (bill with computed totals)                                */
/* ------------------------------------------------------------------ */

const LineSchema = new mongoose.Schema(
  {
    item: { type: String, enum: ITEMS, required: true },
    qty: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 }, // snapshot at sale time
    amount: { type: Number, default: 0 }, // qty * rate (auto)
  },
  { _id: false },
);

const PurchaseSchema = new mongoose.Schema(
  {
    accountNo: { type: String, required: true, trim: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    items: {
      type: [LineSchema],
      validate: (v) => v.length > 0,
    },

    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    note: { type: String, trim: true },
  },
  { timestamps: true },
);

// Auto-calculate everything before save/validate
PurchaseSchema.pre("validate", function (next) {
  this.items.forEach((l) => {
    l.amount = round2(l.qty * l.rate);
  });

  this.subtotal = round2(this.items.reduce((s, l) => s + l.amount, 0));
  this.total = round2(Math.max(this.subtotal - this.discount, 0));

  next();
});

// Per-item breakdown
PurchaseSchema.methods.totalsByItem = function () {
  return this.items.reduce((acc, l) => {
    acc[l.item] = round2((acc[l.item] || 0) + l.amount);
    return acc;
  }, {});
};

// Total / paid / due for an account over an optional date range
PurchaseSchema.statics.accountSummary = function (accountNo, from, to) {
  const match = { accountNo };
  if (from || to) {
    match.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  }
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$accountNo",
        bills: { $sum: 1 },
        total: { $sum: "$total" },
        paid: { $sum: "$paid" },
        due: { $sum: "$due" },
      },
    },
  ]);
};

export const Purchase =
  mongoose.models.Purchase || mongoose.model("Purchase", PurchaseSchema);

export default Purchase;

/* ------------------------------------------------------------------ */
/* Usage                                                               */
/* ------------------------------------------------------------------ */
// import Purchase, { PurchaseRate } from "./models/Purchase.js";
//
// const card = await PurchaseRate.findOne({ accountNo: "A-101" });
//
// const bill = await Purchase.create({
//   accountNo: card.accountNo,
//   items: card.toLineItems({ octane: 50, diesel: 30, gearOil: 2 }),
//   discount: 100,
//   paid: 2000,
// });
//
// bill.total; bill.due; bill.status; // all computed
//
// To edit a bill: load it, change fields, call bill.save() so totals recompute.
