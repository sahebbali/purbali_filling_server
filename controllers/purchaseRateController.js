// routes/accounts.js
import express from "express";
import mongoose from "mongoose";
import Account from "../models/accountInfo.js";

const router = express.Router();

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
