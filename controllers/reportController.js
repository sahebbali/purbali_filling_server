import PurbaliEntry from "../models/PurbaliEntry.js";

/**
 * GET /api/purbali-entries/monthly-summary
 *
 * Returns one row per month that has at least one entry:
 *   {
 *     year: 2026,
 *     month: 9,               // 1-12
 *     label: "September 2026",
 *     dateCount: 12,          // distinct calendar days with an entry
 *     documentCount: 37,      // total entries in that month
 *     totalAmount: 154200
 *   }
 *
 * Optional filters (query params): accountNo, carNo
 */
export const getMonthlySummary = async (req, res) => {
  try {
    const { accountNo, carNo } = req.query;

    const match = {};
    if (accountNo) match.accountNo = accountNo;
    if (carNo) match.carNo = carNo;

    const pipeline = [
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" },
          },
          documentCount: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        // now collapse day-level groups up into month-level groups
        $group: {
          _id: { year: "$_id.year", month: "$_id.month" },
          dateCount: { $sum: 1 }, // number of distinct days in this month
          documentCount: { $sum: "$documentCount" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          dateCount: 1,
          documentCount: 1,
          totalAmount: 1,
        },
      },
      { $sort: { year: -1, month: -1 } },
    ];

    const results = await PurbaliEntry.aggregate(pipeline);

    const MONTH_NAMES = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const data = results.map((r) => ({
      ...r,
      label: `${MONTH_NAMES[r.month - 1]} ${r.year}`,
    }));

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("monthly-summary error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load monthly summary",
    });
  }
};

/**
 * GET /api/purbali-entries/monthly-summary/:year/:month
 *
 * Drill-down for one month — per-day breakdown plus the month total.
 * :month is 1-12.
 *
 * Response:
 *   {
 *     year: 2026, month: 9, label: "September 2026",
 *     documentCount: 37, totalAmount: 154200,
 *     days: [{ date: "2026-09-01", documentCount: 4, totalAmount: 12500 }, ...]
 *   }
 */
export const getMonthlySummaryDrillDown = async (req, res) => {
  try {
    const year = Number(req.params.year);
    const month = Number(req.params.month); // 1-12

    if (!year || !month || month < 1 || month > 12) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid year or month" });
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1)); // first day of next month

    const pipeline = [
      { $match: { date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" },
          },
          documentCount: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.day": 1 } },
    ];

    const dayRows = await PurbaliEntry.aggregate(pipeline);

    const days = dayRows.map((r) => ({
      date: `${r._id.year}-${String(r._id.month).padStart(2, "0")}-${String(
        r._id.day,
      ).padStart(2, "0")}`,
      documentCount: r.documentCount,
      totalAmount: r.totalAmount,
    }));

    const documentCount = days.reduce((sum, d) => sum + d.documentCount, 0);
    const totalAmount = days.reduce((sum, d) => sum + d.totalAmount, 0);

    const MONTH_NAMES = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    res.status(200).json({
      success: true,
      year,
      month,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      documentCount,
      totalAmount,
      days,
    });
  } catch (err) {
    console.error("monthly-summary drill-down error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load month details",
    });
  }
};
