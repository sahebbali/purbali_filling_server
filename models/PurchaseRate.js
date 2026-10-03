// models/Purchase.js
// Rate card (per account) + Purchase (items, charges, computed totals)
import mongoose from "mongoose";

/* ------------------------------------------------------------------ */
/* Items & helpers                                                     */
/* ------------------------------------------------------------------ */

// Quantity x rate items (rates live on the account's rate card)
export const PRODUCT_ITEMS = [
  "octane",
  "diesel",
  "looseMobile",
  "tq1", // T.Q-1
  "tq5", // T.Q-5
  "brakeOil",
  "powerOil",
  "gearOil",
  "qw", // Q.W
];

// Amount-only items (no quantity, no rate)
export const CHARGE_ITEMS = [
  "af", // A.F
  "mf", // M.F
  "pf", // P.F
  "df", // D.F
  "af2", // A.F (2)
  "servicing",
  "others",
];

export const ITEMS = PRODUCT_ITEMS;

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/* ------------------------------------------------------------------ */
/* Rate card (one per account)                                         */
/* ------------------------------------------------------------------ */

const rate = { type: Number, default: 0, min: 0 };

const PurchaseRateSchema = new mongoose.Schema(
  {
    accountNo: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true },
    ...Object.fromEntries(PRODUCT_ITEMS.map((k) => [k, rate])),
  },
  { timestamps: true },
);

// quantities: { octane: 50, diesel: 30 }
// rates: optional per-purchase overrides { octane: 130 }
PurchaseRateSchema.methods.toLineItems = function (
  quantities = {},
  rates = {},
) {
  return Object.entries(quantities)
    .filter(([item, qty]) => PRODUCT_ITEMS.includes(item) && Number(qty) > 0)
    .map(([item, qty]) => {
      const override = rates?.[item];
      const r =
        override !== undefined && override !== "" && Number(override) >= 0
          ? Number(override)
          : this[item];
      return { item, qty: Number(qty), rate: r };
    });
};

export const PurchaseRate =
  mongoose.models.PurchaseRate ||
  mongoose.model("PurchaseRate", PurchaseRateSchema);

/* ------------------------------------------------------------------ */
/* Purchase                                                            */
/* ------------------------------------------------------------------ */

const LineSchema = new mongoose.Schema(
  {
    item: { type: String, enum: PRODUCT_ITEMS, required: true },
    qty: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 }, // snapshot at sale time
    amount: { type: Number, default: 0 }, // qty * rate (auto)
  },
  { _id: false },
);

const ChargeSchema = new mongoose.Schema(
  {
    key: { type: String, enum: CHARGE_ITEMS, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const PurchaseSchema = new mongoose.Schema(
  {
    accountNo: { type: String, required: true, trim: true, index: true },
    couponNo: { type: String, trim: true },
    date: { type: Date, default: Date.now, index: true },

    items: { type: [LineSchema], default: [] }, // qty x rate
    charges: { type: [ChargeSchema], default: [] }, // A.F, M.F, servicing, others...

    itemsTotal: { type: Number, default: 0 },
    chargesTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    note: { type: String, trim: true },
  },
  { timestamps: true },
);

// Auto-calculate everything before save/validate
PurchaseSchema.pre("validate", function (next) {
  if (!this.items.length && !this.charges.length) {
    return next(new Error("Add at least one item or charge"));
  }

  this.items.forEach((l) => {
    l.amount = round2(l.qty * l.rate);
  });

  const sum = (arr) => round2(arr.reduce((s, x) => s + x.amount, 0));
  this.itemsTotal = sum(this.items);
  this.chargesTotal = sum(this.charges);
  this.total = round2(this.itemsTotal + this.chargesTotal);

  next();
});

// Per-item breakdown (products + charges)
PurchaseSchema.methods.totalsByItem = function () {
  const acc = {};
  this.items.forEach((l) => {
    acc[l.item] = round2((acc[l.item] || 0) + l.amount);
  });
  this.charges.forEach((c) => {
    acc[c.key] = round2((acc[c.key] || 0) + c.amount);
  });
  return acc;
};

// Totals for an account over an optional date range
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
        itemsTotal: { $sum: "$itemsTotal" },
        chargesTotal: { $sum: "$chargesTotal" },
        total: { $sum: "$total" },
      },
    },
  ]);
};

export const Purchase =
  mongoose.models.Purchase || mongoose.model("Purchase", PurchaseSchema);

export default Purchase;
