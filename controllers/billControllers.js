// ---------------------------------------------------------------
// controllers/purbaliEntry.controller.js
// ---------------------------------------------------------------
import PurbaliEntry from "../models/PurbaliEntry.js";
import ExcelJS from "exceljs";

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

/**
 * Purbali Filling Station — Monthly Entries / Bill / Breakdown API (v2)
 * ------------------------------------------------------------------
 * npm install exceljs   (only new dependency vs. the previous version)
 *
 * Endpoints in this file:
 *   GET /entries/month-details          -> full entry list + totals (History tab)
 *   GET /entries/month-overview         -> tiny combined stats for the Bill/Summary
 *                                           preview cards at the top of the page
 *   GET /entries/month-bill             -> JSON bill (Bill tab)
 *   GET /entries/month-bill/export      -> same data, streamed as .xlsx
 *   GET /entries/month-breakdown        -> JSON breakdown (Summary tab)
 *   GET /entries/month-breakdown/export -> same data, streamed as .xlsx
 *
 * All accept the same query filters: month=YYYY-MM (required), accountNo,
 * carNo, department (all optional).
 */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function monthToRange(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const err = new Error("A valid `month` query param (YYYY-MM) is required.");
    err.status = 400;
    throw err;
  }
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 1, 0, 0, 0));
  return { start, end };
}

function buildMatch({ month, accountNo, carNo, department }) {
  const { start, end } = monthToRange(month);
  const match = { date: { $gte: start, $lt: end } };
  if (accountNo) match.accountNo = accountNo;
  if (carNo) match.carNo = carNo;
  if (department) match.department = department;
  return match;
}

function monthLabelFromQuery(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month || "";
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/* ------------------------------------------------------------------ */
/*  Shared data fetchers (used by both the JSON and Excel endpoints)   */
/* ------------------------------------------------------------------ */

async function fetchEntries(match) {
  const entries = await PurbaliEntry.find(match)
    .sort({ date: 1, couponNo: 1 })
    .lean();

  const totals = entries.reduce(
    (acc, e) => {
      acc.totalAmount += e.totalAmount || 0;
      acc.totalQty += (e.items || []).reduce(
        (s, it) => s + (Number(it.qty) || 0),
        0,
      );
      acc.dateSet.add(new Date(e.date).toISOString().slice(0, 10));
      return acc;
    },
    { totalAmount: 0, totalQty: 0, dateSet: new Set() },
  );

  return {
    entries,
    entryCount: entries.length,
    dateCount: totals.dateSet.size,
    totalQty: totals.totalQty,
    totalAmount: totals.totalAmount,
  };
}

async function fetchBillData(match) {
  const accounts = await PurbaliEntry.aggregate([
    { $match: match },
    { $unwind: "$items" },
    {
      $project: {
        accountNo: 1,
        date: 1,
        couponNo: 1,
        item: {
          id: "$items.id",
          label: "$items.label",
          rate: "$items.rate",
          qty: "$items.qty",
          amount: "$items.amount",
        },
      },
    },
    { $sort: { accountNo: 1, date: 1 } },
    {
      $group: {
        _id: "$accountNo",
        items: { $push: "$item" },
        totalQty: { $sum: "$item.qty" },
        totalAmount: { $sum: "$item.amount" },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        accountNo: "$_id",
        items: 1,
        totalQty: 1,
        totalAmount: 1,
      },
    },
  ]);

  const entryCount = await PurbaliEntry.countDocuments(match);

  const grand = accounts.reduce(
    (acc, r) => {
      acc.totalQty += r.totalQty || 0;
      acc.totalAmount += r.totalAmount || 0;
      return acc;
    },
    { totalQty: 0, totalAmount: 0 },
  );

  return {
    accounts,
    totals: {
      entryCount,
      totalQty: grand.totalQty,
      totalAmount: grand.totalAmount,
    },
  };
}

async function fetchBreakdownData(match) {
  const groupBy = (extraGroupExpr) =>
    PurbaliEntry.aggregate([
      { $match: match },
      {
        $addFields: {
          dayKey: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          entryQty: {
            $sum: {
              $map: {
                input: "$items",
                as: "it",
                in: { $ifNull: ["$$it.qty", 0] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: extraGroupExpr,
          entryCount: { $sum: 1 },
          dateSet: { $addToSet: "$dayKey" },
          totalQty: { $sum: "$entryQty" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          key: "$_id",
          entryCount: 1,
          dateCount: { $size: "$dateSet" },
          totalQty: 1,
          totalAmount: 1,
        },
      },
      { $sort: { key: 1 } },
    ]);

  const totalsPipeline = PurbaliEntry.aggregate([
    { $match: match },
    {
      $addFields: {
        dayKey: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        entryQty: {
          $sum: {
            $map: {
              input: "$items",
              as: "it",
              in: { $ifNull: ["$$it.qty", 0] },
            },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        entryCount: { $sum: 1 },
        dateSet: { $addToSet: "$dayKey" },
        totalQty: { $sum: "$entryQty" },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
    {
      $project: {
        _id: 0,
        entryCount: 1,
        dateCount: { $size: "$dateSet" },
        totalQty: 1,
        totalAmount: 1,
      },
    },
  ]);

  const [byDay, byAccount, byCar, byConsumptionType, byDepartment, totalsAgg] =
    await Promise.all([
      groupBy("$dayKey"),
      groupBy("$accountNo"),
      groupBy({ $ifNull: ["$carNo", "—"] }),
      groupBy({ $ifNull: ["$consumptionType", "—"] }),
      groupBy({ $ifNull: ["$department", "—"] }),
      totalsPipeline,
    ]);

  return {
    totals: totalsAgg[0] || {
      entryCount: 0,
      dateCount: 0,
      totalQty: 0,
      totalAmount: 0,
    },
    byDay,
    byAccount,
    byCar,
    byConsumptionType,
    byDepartment,
  };
}

async function fetchOverview(match) {
  const rows = await PurbaliEntry.aggregate([
    { $match: match },
    {
      $addFields: {
        dayKey: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        entryQty: {
          $sum: {
            $map: {
              input: "$items",
              as: "it",
              in: { $ifNull: ["$$it.qty", 0] },
            },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        entryCount: { $sum: 1 },
        dateSet: { $addToSet: "$dayKey" },
        accountSet: { $addToSet: "$accountNo" },
        totalQty: { $sum: "$entryQty" },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
    {
      $project: {
        _id: 0,
        entryCount: 1,
        dateCount: { $size: "$dateSet" },
        accountCount: { $size: "$accountSet" },
        totalQty: 1,
        totalAmount: 1,
      },
    },
  ]);

  return (
    rows[0] || {
      entryCount: 0,
      dateCount: 0,
      accountCount: 0,
      totalQty: 0,
      totalAmount: 0,
    }
  );
}

/* ------------------------------------------------------------------ */
/*  JSON endpoints                                                      */
/* ------------------------------------------------------------------ */

export const getMonthDetails = asyncHandler(async (req, res) => {
  const match = buildMatch(req.query);
  const data = await fetchEntries(match);
  res.json({ success: true, data });
});

export const getMonthOverview = asyncHandler(async (req, res) => {
  const match = buildMatch(req.query);
  const overview = await fetchOverview(match);
  res.json({
    success: true,
    data: { label: monthLabelFromQuery(req.query.month), ...overview },
  });
});

export const getMonthlyBill = asyncHandler(async (req, res) => {
  const match = buildMatch(req.query);
  const bill = await fetchBillData(match);
  res.json({
    success: true,
    data: { label: monthLabelFromQuery(req.query.month), ...bill },
  });
});

export const getMonthlyBreakdown = asyncHandler(async (req, res) => {
  const match = buildMatch(req.query);
  const breakdown = await fetchBreakdownData(match);
  res.json({
    success: true,
    data: { label: monthLabelFromQuery(req.query.month), ...breakdown },
  });
});

/* ------------------------------------------------------------------ */
/*  Excel export — Bill                                                */
/* ------------------------------------------------------------------ */

const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0F172A" },
};
const HEADER_FONT = { color: { argb: "FFFFFFFF" }, bold: true };
const SUBTOTAL_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" },
};
const MONEY_FMT = "#,##0.00";

export const exportMonthlyBillExcel = asyncHandler(async (req, res) => {
  const match = buildMatch(req.query);
  const { accounts, totals } = await fetchBillData(match);
  const label = monthLabelFromQuery(req.query.month);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Purbali Filling Station";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Bill", {
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
    },
  });

  sheet.columns = [
    { key: "col1", width: 6 },
    { key: "col2", width: 42 },
    { key: "col3", width: 14 },
    { key: "col4", width: 12 },
    { key: "col5", width: 16 },
  ];

  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = `Monthly Bill — ${label}`;
  sheet.getCell("A1").font = { bold: true, size: 14 };

  const filterParts = [
    req.query.accountNo && `Account: ${req.query.accountNo}`,
    req.query.carNo && `Car: ${req.query.carNo}`,
    req.query.department && `Department: ${req.query.department}`,
  ].filter(Boolean);
  if (filterParts.length) {
    sheet.mergeCells("A2:E2");
    sheet.getCell("A2").value = filterParts.join("   ·   ");
    sheet.getCell("A2").font = {
      italic: true,
      color: { argb: "FF64748B" },
      size: 10,
    };
  }

  sheet.addRow([]);

  accounts.forEach((acct) => {
    const acctHeaderRow = sheet.addRow([`Account ${acct.accountNo}`]);
    sheet.mergeCells(`A${acctHeaderRow.number}:E${acctHeaderRow.number}`);
    acctHeaderRow.font = { bold: true, size: 11 };
    acctHeaderRow.fill = SUBTOTAL_FILL;

    const headerRow = sheet.addRow([
      "#",
      "Description",
      "Rate",
      "Qty",
      "Amount",
    ]);
    headerRow.eachCell((cell) => {
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
    });

    acct.items.forEach((it, i) => {
      const row = sheet.addRow([i + 1, it.label, it.rate, it.qty, it.amount]);
      row.getCell(3).numFmt = MONEY_FMT;
      row.getCell(5).numFmt = MONEY_FMT;
    });

    const subtotalRow = sheet.addRow([
      "",
      "",
      "Subtotal",
      acct.totalQty,
      acct.totalAmount,
    ]);
    subtotalRow.font = { bold: true };
    subtotalRow.fill = SUBTOTAL_FILL;
    subtotalRow.getCell(5).numFmt = MONEY_FMT;

    sheet.addRow([]);
  });

  const grandRow = sheet.addRow([
    "",
    "",
    "Grand total",
    totals.totalQty,
    totals.totalAmount,
  ]);
  grandRow.font = { bold: true, size: 12 };
  grandRow.fill = HEADER_FILL;
  grandRow.eachCell((cell) => {
    if (cell.value !== "") cell.font = { ...HEADER_FONT, size: 12 };
  });
  grandRow.getCell(5).numFmt = MONEY_FMT;

  const filename = `purbali-bill-${req.query.month}${
    req.query.accountNo ? `-acc${req.query.accountNo}` : ""
  }.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

/* ------------------------------------------------------------------ */
/*  Excel export — Summary / Breakdown                                 */
/* ------------------------------------------------------------------ */

function addBreakdownSheet(workbook, title, keyLabel, rows) {
  const sheet = workbook.addWorksheet(title);
  sheet.columns = [
    { header: keyLabel, key: "key", width: 26 },
    { header: "Entries", key: "entryCount", width: 12 },
    { header: "Days", key: "dateCount", width: 10 },
    { header: "Qty", key: "totalQty", width: 12 },
    { header: "Amount", key: "totalAmount", width: 16 },
  ];
  sheet.getRow(1).eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
  });

  rows.forEach((r) => {
    const row = sheet.addRow({
      key: r.key,
      entryCount: r.entryCount,
      dateCount: r.dateCount,
      totalQty: r.totalQty,
      totalAmount: r.totalAmount,
    });
    row.getCell("totalQty").numFmt = MONEY_FMT;
    row.getCell("totalAmount").numFmt = MONEY_FMT;
  });

  const totalRow = sheet.addRow({
    key: "Total",
    entryCount: rows.reduce((s, r) => s + r.entryCount, 0),
    totalQty: rows.reduce((s, r) => s + r.totalQty, 0),
    totalAmount: rows.reduce((s, r) => s + r.totalAmount, 0),
  });
  totalRow.font = { bold: true };
  totalRow.fill = SUBTOTAL_FILL;
  totalRow.getCell("totalQty").numFmt = MONEY_FMT;
  totalRow.getCell("totalAmount").numFmt = MONEY_FMT;

  return sheet;
}

export const exportMonthlyBreakdownExcel = asyncHandler(async (req, res) => {
  const match = buildMatch(req.query);
  const breakdown = await fetchBreakdownData(match);
  const label = monthLabelFromQuery(req.query.month);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Purbali Filling Station";
  workbook.created = new Date();

  const overview = workbook.addWorksheet("Overview");
  overview.columns = [
    { key: "label", width: 22 },
    { key: "value", width: 20 },
  ];
  overview.addRow([`Monthly Summary — ${label}`]).font = {
    bold: true,
    size: 14,
  };
  overview.addRow([]);
  [
    ["Entries", breakdown.totals.entryCount],
    ["Days with entries", breakdown.totals.dateCount],
    ["Total quantity", breakdown.totals.totalQty],
    ["Total amount", breakdown.totals.totalAmount],
  ].forEach(([k, v]) => {
    const row = overview.addRow([k, v]);
    row.getCell(1).font = { bold: true };
  });

  addBreakdownSheet(workbook, "By Day", "Date", breakdown.byDay);
  addBreakdownSheet(workbook, "By Account", "Account no.", breakdown.byAccount);
  addBreakdownSheet(workbook, "By Car", "Car no.", breakdown.byCar);
  addBreakdownSheet(
    workbook,
    "By Type",
    "Consumption type",
    breakdown.byConsumptionType,
  );
  addBreakdownSheet(
    workbook,
    "By Department",
    "Department",
    breakdown.byDepartment,
  );

  const filename = `purbali-summary-${req.query.month}.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

/* ------------------------------------------------------------------ */

function purbaliErrorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  res
    .status(status)
    .json({ success: false, message: err.message || "Server error" });
}
