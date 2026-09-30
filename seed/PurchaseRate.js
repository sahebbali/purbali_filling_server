// seed/purchaseRate.seed.js
import { PurchaseRateData } from "../data/purchaseRate.js";
import Account from "../models/accountInfo.js";

/* --------------------------------
   Helpers
--------------------------------- */

// Normalize account numbers so "20 A", " 20a ", "20A" all match.
const norm = (v) =>
  String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

// Safe number: strip commas, reject NaN/negatives → 0.
const num = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/* --------------------------------
   Rate field mapping
   key      = field on PurchaseRateSchema
   source   = column name in PurchaseRateData (null = not in sheet → 0)
--------------------------------- */
const RATE_FIELDS = {
  octane: "Octane",
  diesel: "Diesel",
  looseMobile: "Losse Mobile",
  tq1: "T.Q-1",
  tq5: "T.Q-5",
  brakeOil: "Brake Oil",
  powerOil: "Power Oil",
  gearOil: "Gear Oil",
  // Not present in PurchaseRateData — always seeded to 0:
  qw: null,
  af: null,
  mf: null,
  pf: null,
  df: null,
  af2: null,
  servicing: null,
};

const buildRates = (row) => {
  const out = {};
  for (const [field, source] of Object.entries(RATE_FIELDS)) {
    out[field] = source ? num(row[source]) : 0;
  }
  return out;
};

/* --------------------------------
   Seeder
--------------------------------- */

const CHUNK_SIZE = 500;

export const seedPurchaseRate = async ({ dryRun = false } = {}) => {
  if (!Array.isArray(PurchaseRateData) || PurchaseRateData.length === 0) {
    console.warn("[seedPurchaseRate] PurchaseRateData is empty.");
    return { prepared: 0, matched: 0, modified: 0, unmatched: [] };
  }

  // Load only what we need for the lookup.
  const accounts = await Account.find({}, { _id: 1, ac_no: 1 }).lean();
  const idByAcNo = new Map();
  for (const a of accounts) idByAcNo.set(norm(a.ac_no), a._id);

  const ops = [];
  const unmatched = [];
  const duplicates = [];
  const seen = new Set();

  for (const row of PurchaseRateData) {
    const rawAcNo = row["Account No"];
    const key = norm(rawAcNo);

    if (!key) {
      unmatched.push(rawAcNo ?? "<empty>");
      continue;
    }
    if (seen.has(key)) {
      duplicates.push(rawAcNo);
      continue; // last-wins vs first-wins: we skip dupes entirely
    }
    seen.add(key);

    const _id = idByAcNo.get(key);
    if (_id === undefined) {
      unmatched.push(rawAcNo);
      continue;
    }

    ops.push({
      updateOne: {
        filter: { _id },
        update: { $set: { purchase_rates: buildRates(row) } },
      },
    });
  }

  let matched = 0;
  let modified = 0;

  if (!dryRun && ops.length > 0) {
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      // ordered:false → don't stop on a single bad doc
      const r = await Account.bulkWrite(chunk, { ordered: false });
      matched += r.matchedCount;
      modified += r.modifiedCount;
    }
  }

  console.log(
    `[seedPurchaseRate] prepared=${ops.length} matched=${matched} ` +
      `modified=${modified}${dryRun ? " (dry run)" : ""}`,
  );
  if (duplicates.length)
    console.warn(
      `[seedPurchaseRate] duplicate Account No in source: ${duplicates.join(
        ", ",
      )}`,
    );
  if (unmatched.length)
    console.warn(
      `[seedPurchaseRate] no matching account for: ${unmatched.join(", ")}`,
    );

  return { prepared: ops.length, matched, modified, unmatched };
};

/* --------------------------------
   Standalone runner
   Usage: node seed/purchaseRate.seed.js
--------------------------------- */

const isDirectRun =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  const { default: mongoose } = await import("mongoose");
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is required to run this seed standalone.");
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    await seedPurchaseRate();
  } catch (err) {
    console.error("[seedPurchaseRate] failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
