import Account from "../models/accountInfo.js";
import {
  Purchase,
  PurchaseRate,
  PRODUCT_ITEMS,
  CHARGE_ITEMS,
} from "../models/purchaseRate.js";

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */

/**
 * Normalize an account number for lookups.
 *   "20 A"  -> "20A"
 *   " 8(a) " -> "8(A)"
 *   "32a"   -> "32A"
 * We collapse whitespace and uppercase. Parentheses are kept so
 * "8A" and "8(A)" stay distinct.
 */
const normAcNo = (v) =>
  String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

/** Escape user input for safe use inside a $regex. */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Numeric rates only, floored, >= 0. Unknown keys are dropped. */
const RATE_KEYS = [
  "octane",
  "diesel",
  "looseMobile",
  "tq1",
  "tq5",
  "brakeOil",
  "powerOil",
  "gearOil",
  "qw",
  "af",
  "mf",
  "pf",
  "df",
  "af2",
  "servicing",
];

const sanitizeRates = (input = {}) => {
  const out = {};
  for (const k of RATE_KEYS) {
    if (input[k] === undefined) continue;
    const n = Number(input[k]);
    out[k] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }
  return out;
};

/** Build a case-insensitive regex matcher for ac_no (spaces ignored). */
const acNoRegex = (raw) => new RegExp(`^${escapeRegex(normAcNo(raw))}$`, "i");

/* ------------------------------------------------------------------
   GET /api/accounts
   Query: ?search=&page=1&limit=20&sort=sl_no
------------------------------------------------------------------ */
export const getAllAccounts = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search ?? "").trim();
    const sort = String(req.query.sort ?? "createdAt");
    console.log({ search });
    const filter = search
      ? {
          $or: [
            { ac_no: { $regex: escapeRegex(search), $options: "i" } },
            { name: { $regex: escapeRegex(search), $options: "i" } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      Account.find(filter)
        .sort({ [sort]: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Account.countDocuments(filter),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------
   GET /api/accounts/:ac_no
   Accepts "8A", "8 A", "8a" — all match the stored "8(A)" only if
   they normalize to the same string. To also match "8(A)" from "8A",
   use the fuzzy fallback below.
------------------------------------------------------------------ */
export const getAc = async (req, res, next) => {
  try {
    const raw = req.params.ac_no;

    console.log({ raw });
    // Primary: exact normalized match.
    let account = await Account.findOne({ ac_no: acNoRegex(raw) }).lean();

    // Fallback: strip parentheses and try again so "8A" finds "8(A)".
    if (!account) {
      const loose = normAcNo(raw).replace(/[()]/g, "");
      if (loose !== normAcNo(raw)) {
        account = await Account.findOne({
          ac_no: new RegExp(`^${escapeRegex(loose)}$`, "i"),
        }).lean();
      } else {
        account = await Account.findOne({
          ac_no: new RegExp(
            `^${escapeRegex(loose).replace(/A$/, "")}\\(?A?\\)?$`,
            "i",
          ),
        }).lean();
      }
    }

    if (!account) {
      return res.status(404).json({ error: `Account '${raw}' not found` });
    }
    res.json(account);
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------
   POST /api/accounts
   Body: { _id?, sl_no?, ac_no, name, address?, lines?, purchase_rates? }
------------------------------------------------------------------ */
export const createAc = async (req, res, next) => {
  try {
    const body = req.body ?? {};

    if (!body.ac_no)
      return res.status(400).json({ error: "ac_no is required" });
    if (!body.name) return res.status(400).json({ error: "name is required" });

    // Reject duplicates (normalized).
    const exists = await Account.findOne({
      ac_no: acNoRegex(body.ac_no),
    }).lean();
    if (exists) {
      return res.status(409).json({
        error: `Account with ac_no '${body.ac_no}' already exists`,
        _id: exists._id,
      });
    }

    const payload = {
      _id: body._id !== undefined ? Number(body._id) : undefined,
      sl_no: body.sl_no ?? null,
      ac_no: String(body.ac_no).trim(),
      name: String(body.name).trim(),
      address: Array.isArray(body.address) ? body.address : [],
      lines: Array.isArray(body.lines) ? body.lines : [],
      purchase_rates: sanitizeRates(body.purchase_rates),
    };

    // If _id wasn't supplied, let Mongo generate one — but your schema
    // types _id as Number, so we fall back to sl_no or a timestamp.
    if (payload._id === undefined) {
      const max = await Account.findOne()
        .sort({ _id: -1 })
        .select("_id")
        .lean();
      payload._id = (max?._id ?? 0) + 1;
    }

    const created = await Account.create(payload);
    res.status(201).json(created.toObject());
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ error: "Duplicate key", keys: err.keyValue });
    }
    next(err);
  }
};

/* ------------------------------------------------------------------
   PATCH /api/accounts/:ac_no
   Body: any subset of { sl_no, ac_no, name, address, lines, purchase_rates }
------------------------------------------------------------------ */
export const patchAc = async (req, res, next) => {
  try {
    const raw = req.params.ac_no;
    const body = req.body ?? {};

    const update = {};

    if (body.sl_no !== undefined) update.sl_no = body.sl_no;
    if (body.name !== undefined) update.name = String(body.name).trim();

    // Renaming ac_no — check for collision first.
    if (body.ac_no !== undefined) {
      const next_ac = String(body.ac_no).trim();
      if (next_ac !== raw) {
        const clash = await Account.findOne({
          ac_no: acNoRegex(next_ac),
        }).lean();
        if (clash) {
          return res.status(409).json({
            error: `Another account already uses ac_no '${next_ac}'`,
          });
        }
      }
      update.ac_no = next_ac;
    }

    if (body.address !== undefined) {
      update.address = Array.isArray(body.address)
        ? body.address.map((s) => String(s).trim()).filter(Boolean)
        : [];
    }
    if (body.lines !== undefined) {
      update.lines = Array.isArray(body.lines) ? body.lines : [];
    }
    if (body.purchase_rates !== undefined) {
      // Merge with the existing rates instead of nuking missing keys.
      const existing = await Account.findOne({ ac_no: acNoRegex(raw) })
        .select("purchase_rates")
        .lean();
      if (!existing)
        return res.status(404).json({ error: "Account not found" });

      update.purchase_rates = {
        ...existing.purchase_rates,
        ...sanitizeRates(body.purchase_rates),
      };
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const updated = await Account.findOneAndUpdate(
      { ac_no: acNoRegex(raw) },
      { $set: update },
      { new: true, runValidators: true },
    ).lean();

    if (!updated)
      return res.status(404).json({ error: `Account '${raw}' not found` });
    res.json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ error: "Duplicate key", keys: err.keyValue });
    }
    next(err);
  }
};

/* ------------------------------------------------------------------
   PUT /api/accounts/:ac_no/purchase-rates
   Replace the whole purchase_rates sub-doc.
------------------------------------------------------------------ */
export const updatePurchaseRates = async (req, res, next) => {
  try {
    const raw = req.params.ac_no;
    const rates = sanitizeRates(req.body?.purchase_rates ?? req.body ?? {});

    // Ensure every key exists (default 0) so the sub-doc is complete.
    const complete = Object.fromEntries(
      RATE_KEYS.map((k) => [k, rates[k] ?? 0]),
    );

    const updated = await Account.findOneAndUpdate(
      { ac_no: acNoRegex(raw) },
      { $set: { purchase_rates: complete } },
      { new: true, runValidators: true },
    ).lean();

    if (!updated)
      return res.status(404).json({ error: `Account '${raw}' not found` });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------
   DELETE /api/accounts/:ac_no
------------------------------------------------------------------ */
export const delAc = async (req, res, next) => {
  try {
    const raw = req.params.ac_no;
    const deleted = await Account.findOneAndDelete({
      ac_no: acNoRegex(raw),
    }).lean();
    if (!deleted) {
      return res.status(404).json({ error: `Account '${raw}' not found` });
    }
    res.json({ ok: true, deleted: { _id: deleted._id, ac_no: deleted.ac_no } });
  } catch (err) {
    next(err);
  }
};

// controllers/purchaseController.js

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const pick = (obj, keys) =>
  Object.fromEntries(
    keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]),
  );

// Build line items from either:
//  - items: [{ item, qty, rate? }]  (rate falls back to the account's rate card)
//  - quantities: { octane: 50, diesel: 30 }  (rates come from the rate card)

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

// qty x rate lines. Accepts either:
//   { quantities: { octane: 50 }, rates: { octane: 130 } }   (rates optional)
//   { items: [{ item: "octane", qty: 50, rate: 130 }] }      (rate optional)
// Returns [] when neither has anything (charges-only purchase).
const buildItems = async (accountNo, body) => {
  const { quantities, rates, items } = body;

  // 1) quantities map (used by the AddPurchase form)
  const hasQty =
    quantities &&
    typeof quantities === "object" &&
    Object.values(quantities).some((q) => Number(q) > 0);

  if (hasQty) {
    const card = await PurchaseRate.findOne({ accountNo });
    if (!card)
      throw httpError(404, `No rate card found for account ${accountNo}`);

    const lines = card.toLineItems(quantities, rates);
    if (lines.some((l) => !(Number(l.rate) > 0))) {
      throw httpError(400, "Every item needs a rate greater than 0");
    }
    return lines;
  }

  // 2) explicit items array
  if (Array.isArray(items) && items.length > 0) {
    const needsCard = items.some((l) => l.rate === undefined || l.rate === "");
    const card = needsCard ? await PurchaseRate.findOne({ accountNo }) : null;

    return items.map((l) => {
      if (!PRODUCT_ITEMS.includes(l.item))
        throw httpError(400, `Unknown item: ${l.item}`);

      const qty = Number(l.qty);
      if (!(qty > 0))
        throw httpError(400, `Quantity for "${l.item}" must be greater than 0`);

      const rate =
        l.rate !== undefined && l.rate !== "" ? Number(l.rate) : card?.[l.item];
      if (!(Number(rate) > 0)) {
        throw httpError(
          400,
          `No rate for "${l.item}". Send a rate or create a rate card.`,
        );
      }

      return { item: l.item, qty, rate: Number(rate) };
    });
  }

  return []; // nothing here, charges may still be present
};

// Amount-only lines: { af: 500, servicing: 300, others: 100 }
const buildCharges = (charges = {}) => {
  if (!charges || typeof charges !== "object") return [];

  return Object.entries(charges)
    .filter(([key, amt]) => CHARGE_ITEMS.includes(key) && Number(amt) > 0)
    .map(([key, amt]) => ({ key, amount: Number(amt) }));
};

/* ------------------------------------------------------------------ */
/* Purchases                                                           */
/* ------------------------------------------------------------------ */

// POST /api/purchases
export const createPurchase = asyncHandler(async (req, res) => {
  const { accountNo } = req.body;
  if (!accountNo) throw httpError(400, "accountNo is required");

  const items = await buildItems(accountNo, req.body);
  const charges = buildCharges(req.body.charges);

  if (items.length === 0 && charges.length === 0) {
    throw httpError(400, "Add at least one item or charge");
  }

  // total, itemsTotal and chargesTotal are computed by the model's
  // pre("validate") hook, so any `total` sent by the client is ignored.
  const purchase = await Purchase.create({
    ...pick(req.body, ["accountNo", "couponNo", "date", "note"]),
    items,
    charges,
  });

  res.status(201).json({ success: true, data: purchase });
});

// GET /api/purchases?accountNo=&status=&from=&to=&page=&limit=
export const getPurchases = asyncHandler(async (req, res) => {
  const { accountNo, status, from, to } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

  const filter = {};
  if (accountNo) filter.accountNo = accountNo;
  if (status) filter.status = status;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const [data, total] = await Promise.all([
    Purchase.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Purchase.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// GET /api/purchases/summary/:accountNo?from=&to=
export const getAccountSummary = asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : undefined;
  const to = req.query.to ? new Date(req.query.to) : undefined;
  const [summary] = await Purchase.accountSummary(
    req.params.accountNo,
    from,
    to,
  );

  res.json({
    success: true,
    data: summary || {
      _id: req.params.accountNo,
      bills: 0,
      total: 0,
      paid: 0,
      due: 0,
    },
  });
});

// GET /api/purchases/:id
export const getPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) throw httpError(404, "Purchase not found");
  res.json({ success: true, data: purchase, byItem: purchase.totalsByItem() });
});

// PUT /api/purchases/:id
// Load -> modify -> save() so the pre-validate hook recomputes totals.
export const updatePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) throw httpError(404, "Purchase not found");

  purchase.set(pick(req.body, ["date", "discount", "paid", "note"]));

  if (req.body.items || req.body.quantities) {
    purchase.items = await buildItems(purchase.accountNo, req.body);
  }

  await purchase.save();
  res.json({ success: true, data: purchase });
});

// PATCH /api/purchases/:id/pay   body: { amount }
export const addPayment = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!(amount > 0)) throw httpError(400, "amount must be greater than 0");

  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) throw httpError(404, "Purchase not found");

  purchase.paid += amount;
  await purchase.save();
  res.json({ success: true, data: purchase });
});

// DELETE /api/purchases/:id
export const deletePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findByIdAndDelete(req.params.id);
  if (!purchase) throw httpError(404, "Purchase not found");
  res.json({ success: true, message: "Purchase deleted" });
});

const TZ = "Asia/Dhaka";
const dayStart = (d) => new Date(`${d}T00:00:00.000+06:00`);
const dayEnd = (d) => new Date(`${d}T23:59:59.999+06:00`);

const pageOpts = (q) => {
  const page = Math.max(parseInt(q.page) || 1, 1);
  const limit = Math.min(parseInt(q.limit) || 15, 100);
  return { page, limit, skip: (page - 1) * limit };
};
const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit) || 1,
});

/* ---------- API 1: daily summary (one row per date) ---------- */
export const dailyReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { page, limit, skip } = pageOpts(req.query);

    const match = {};
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = dayStart(from);
      if (to) match.date.$lte = dayEnd(to);
    }

    const [r] = await Purchase.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: TZ },
          },
          bills: { $sum: 1 },
          subtotal: { $sum: "$subtotal" },
          discount: { $sum: "$discount" },
          total: { $sum: "$total" },
          paid: { $sum: "$paid" },
          due: { $sum: "$due" },
        },
      },
      { $sort: { _id: -1 } },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          count: [{ $count: "n" }],
          grand: [
            {
              $group: {
                _id: null,
                bills: { $sum: "$bills" },
                subtotal: { $sum: "$subtotal" },
                discount: { $sum: "$discount" },
                total: { $sum: "$total" },
                paid: { $sum: "$paid" },
                due: { $sum: "$due" },
              },
            },
          ],
        },
      },
    ]);

    const total = r.count[0]?.n ?? 0;
    res.json({
      data: r.rows.map(({ _id, ...rest }) => ({ date: _id, ...rest })),
      summary: r.grand[0] ?? {
        bills: 0,
        subtotal: 0,
        discount: 0,
        total: 0,
        paid: 0,
        due: 0,
      },
      pagination: pagination(page, limit, total),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ---------- API 2: purchases of one date ---------- */
export const dayPurchases = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date)
      return res.status(400).json({ message: "date is required (YYYY-MM-DD)" });
    const { page, limit, skip } = pageOpts(req.query);

    const match = { date: { $gte: dayStart(date), $lte: dayEnd(date) } };

    const [rows, total, sums] = await Promise.all([
      Purchase.find(match).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      Purchase.countDocuments(match),
      Purchase.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            subtotal: { $sum: "$subtotal" },
            discount: { $sum: "$discount" },
            total: { $sum: "$total" },
            paid: { $sum: "$paid" },
            due: { $sum: "$due" },
          },
        },
      ]),
    ]);

    res.json({
      data: rows,
      summary: sums[0] ?? {
        subtotal: 0,
        discount: 0,
        total: 0,
        paid: 0,
        due: 0,
      },
      pagination: pagination(page, limit, total),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
