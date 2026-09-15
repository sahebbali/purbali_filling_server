// ---------------------------------------------------------------
// controllers/purbaliEntry.controller.js
// ---------------------------------------------------------------
import PurbaliEntry from "../models/PurbaliEntry.js";

const TZ = "Asia/Dhaka"; // group by local month, not UTC

/**
 * GET /api/purbali-entries/monthly
 *
 * Optional query: ?accountNo=&carNo=&department=&year=&from=&to=
 *
 * Returns one row per month that actually has entries:
 * { year, month, key: "2026-09", label: "September 2026",
 *   totalAmount, entryCount, totalQty, firstDate, lastDate }
 */
export const getMonthlySummary = async (req, res) => {
  try {
    const { accountNo, carNo, department, year, from, to } = req.query;

    const match = {};
    if (accountNo) match.accountNo = accountNo.trim();
    if (carNo) match.carNo = carNo.trim();
    if (department) match.department = department.trim();

    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    } else if (year) {
      match.date = {
        $gte: new Date(Number(year), 0, 1),
        $lt: new Date(Number(year) + 1, 0, 1),
      };
    }

    const rows = await PurbaliEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: { date: "$date", timezone: TZ } },
            month: { $month: { date: "$date", timezone: TZ } },
          },
          totalAmount: { $sum: "$totalAmount" },
          entryCount: { $sum: 1 },
          totalQty: { $sum: { $sum: "$items.qty" } },
          firstDate: { $min: "$date" },
          lastDate: { $max: "$date" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          key: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: [
                  { $lt: ["$_id.month", 10] },
                  { $concat: ["0", { $toString: "$_id.month" }] },
                  { $toString: "$_id.month" },
                ],
              },
            ],
          },
          totalAmount: 1,
          entryCount: 1,
          totalQty: 1,
          firstDate: 1,
          lastDate: 1,
        },
      },
    ]);

    const grandTotal = rows.reduce((s, r) => s + r.totalAmount, 0);

    res.status(200).json({
      success: true,
      count: rows.length,
      grandTotal,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/purbali-entries?month=2026-09&accountNo=...
 * The drill-down used when a month card is clicked.
 */
export const getEntriesByMonth = async (req, res) => {
  try {
    const { month, accountNo, carNo, department } = req.query;

    const filter = {};
    if (accountNo) filter.accountNo = accountNo.trim();
    if (carNo) filter.carNo = carNo.trim();
    if (department) filter.department = department.trim();

    if (month) {
      const [y, m] = month.split("-").map(Number);
      filter.date = {
        $gte: new Date(y, m - 1, 1),
        $lt: new Date(y, m, 1),
      };
    }

    const data = await PurbaliEntry.find(filter).sort({ date: -1 }).lean();

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------
// routes/purbaliEntry.routes.js
// ---------------------------------------------------------------
// import express from "express";
// import { getMonthlySummary, getEntriesByMonth } from "../controllers/purbaliEntry.controller.js";
//
// const router = express.Router();
// router.get("/monthly", getMonthlySummary);
// router.get("/", getEntriesByMonth);
// export default router;

// ---------------------------------------------------------------
// Index to add to the model (makes the $match + $group cheap)
// ---------------------------------------------------------------
// purbaliEntrySchema.index({ accountNo: 1, date: -1 });
// purbaliEntrySchema.index({ department: 1, date: -1 });
