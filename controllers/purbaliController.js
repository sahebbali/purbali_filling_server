import PurbaliEntry from "../models/PurbaliEntry.js";
import Expense, { EXPENSE_TYPES } from "../models/PurbaliExpense.js";
import KachaSlip from "../models/kachaSlip.js";

// @route   POST /api/purbali-entries
// Treat "", null and whitespace-only strings as "not provided"
const clean = (v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? undefined : t;
  }
  return v;
};

export const createPurbaliEntry = async (req, res) => {
  try {
    const date = clean(req.body.date);
    const receivingDate = clean(req.body.receivingDate);
    const couponNo = clean(req.body.couponNo);
    const accountNo = clean(req.body.accountNo);
    const department = clean(req.body.department);
    const consumptionType = clean(req.body.consumptionType);
    const carNo = clean(req.body.carNo);
    const { items } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required." });
    }
    if (!carNo && !consumptionType) {
      return res
        .status(400)
        .json({ message: "Car number or consumption type is required." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one item is required." });
    }

    // Validate items and recompute amounts on the server
    const cleanItems = [];
    for (const item of items) {
      const qty = Number(item?.qty);
      const rate = Number(item?.rate);
      if (!item?.id || !(qty > 0) || !(rate >= 0)) {
        return res.status(400).json({
          message: `Invalid item "${
            item?.label || item?.id || "unknown"
          }": qty and rate must be valid numbers.`,
        });
      }
      cleanItems.push({
        id: item.id,
        label: item.label,
        qty,
        rate,
        amount: Number((qty * rate).toFixed(2)),
      });
    }
    const totalAmount = Number(
      cleanItems.reduce((sum, i) => sum + i.amount, 0).toFixed(2),
    );

    // Only check duplicates when a coupon number was actually provided
    if (couponNo) {
      const existCoupon = await PurbaliEntry.exists({ couponNo });
      if (existCoupon) {
        return res
          .status(409)
          .json({
            message: "An entry with this coupon number already exists.",
          });
      }
    }

    const entry = await PurbaliEntry.create({
      date,
      receivingDate,
      couponNo,
      accountNo,
      department,
      consumptionType,
      carNo,
      items: cleanItems,
      totalAmount,
      createdBy: req.user?._id,
    });

    return res.status(201).json({ message: "Purbali entry created.", entry });
  } catch (err) {
    console.error("createPurbaliEntry error:", err);

    // Mongoose validation errors are the client's fault -> 400
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    // Race condition: two requests with the same coupon passed the check above
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "An entry with this coupon number already exists." });
    }

    return res.status(500).json({ message: "Failed to create Purbali entry." });
  }
};

// @desc    Get all Purbali entries (with optional filters + pagination)
// @route   GET /api/purbali-entries
export const getEntries = async (req, res) => {
  try {
    const {
      carNo,
      couponNo,
      vehicleNo,
      from,
      to,
      page = 1,
      limit = 20,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    const filter = {};

    // Partial, case-insensitive match for text fields (better UX than exact match)
    if (carNo) filter.carNo = { $regex: carNo.trim(), $options: "i" };
    if (couponNo) filter.couponNo = { $regex: couponNo.trim(), $options: "i" };
    if (vehicleNo)
      filter.vehicleNo = { $regex: vehicleNo.trim(), $options: "i" };

    // Date range filter — validate before using
    if (from || to) {
      filter.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid 'from' date" });
        }
        filter.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid 'to' date" });
        }
        // include the whole 'to' day
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20)); // cap to prevent abuse
    const skip = (pageNum - 1) * limitNum;

    const allowedSortFields = ["date", "receivingDate", "createdAt", "carNo"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "date";
    const sortDir = sortOrder === "asc" ? 1 : -1;

    const [entries, total] = await Promise.all([
      PurbaliEntry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(), // faster, read-only history view doesn't need mongoose docs
      PurbaliEntry.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: entries,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get a single entry by ID
// @route   GET /api/purbali-entries/:id
export const getEntryById = async (req, res) => {
  try {
    const entry = await PurbaliEntry.findById(req.params.id);
    if (!entry)
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update an entry
// @route   PUT /api/purbali-entries/:id
export const updateEntry = async (req, res) => {
  try {
    const {
      date,
      receivingDate,
      vehicleNo,
      couponNo,
      carNo,
      items,
      totalAmount,
    } = req.body;

    const entry = await PurbaliEntry.findByIdAndUpdate(
      req.params.id,
      { date, receivingDate, vehicleNo, couponNo, carNo, items, totalAmount },
      { new: true, runValidators: true },
    );

    if (!entry)
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    res.json({
      success: true,
      data: entry,
      message: "Entry updated successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// exports.updatePurbaliEntry = async (req, res) => {
//   try {
//     const entry = await PurbaliEntry.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true,
//     });
//     if (!entry) {
//       return res.status(404).json({ message: "Entry not found." });
//     }
//     return res.json({ message: "Entry updated.", entry });
//   } catch (err) {
//     console.error("updatePurbaliEntry error:", err);
//     return res.status(500).json({ message: "Failed to update entry." });
//   }
// };

// @desc    Delete an entry
// @route   DELETE /api/purbali-entries/:id
export const deleteEntry = async (req, res) => {
  try {
    const entry = await PurbaliEntry.findByIdAndDelete(req.params.id);
    if (!entry)
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    res.json({ success: true, message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const TZ = "Asia/Dhaka";
const DAY = 24 * 60 * 60 * 1000;
const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const ymd = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD

// Interpret from/to as whole Dhaka days (UTC+6)
function parseRange(q) {
  const today = ymd(new Date());
  const toStr = /^\d{4}-\d{2}-\d{2}$/.test(q.to || "") ? q.to : today;
  const fromStr = /^\d{4}-\d{2}-\d{2}$/.test(q.from || "")
    ? q.from
    : ymd(new Date(new Date(`${toStr}T00:00:00+06:00`).getTime() - 29 * DAY));

  const from = new Date(`${fromStr}T00:00:00+06:00`);
  const to = new Date(`${toStr}T23:59:59.999+06:00`);
  if (isNaN(from) || isNaN(to) || from > to) return null;

  const span = to.getTime() - from.getTime() + 1;
  return {
    from,
    to,
    prevFrom: new Date(from.getTime() - span),
    prevTo: new Date(from.getTime() - 1),
    fromStr,
    toStr,
  };
}

const delta = (cur, prev) =>
  prev > 0 ? round2(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0;

const inRange = (from, to) => ({ date: { $gte: from, $lte: to } });

const salesTotals = (from, to) =>
  PurbaliEntry.aggregate([
    { $match: inRange(from, to) },
    {
      $group: {
        _id: null,
        total: { $sum: "$totalAmount" },
        bills: { $sum: 1 },
      },
    },
  ]);

const expenseTotals = (from, to) =>
  Expense.aggregate([
    { $match: inRange(from, to) },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

const dailyGroup = (field) => ({
  $group: {
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: TZ } },
    total: { $sum: field },
  },
});

export async function getPurbaliDashboard(req, res) {
  try {
    const r = parseRange(req.query);
    if (!r) return res.status(400).json({ message: "Invalid date range" });
    const { from, to, prevFrom, prevTo } = r;

    const [
      curSales,
      prevSales,
      curExp,
      prevExp,
      salesDaily,
      expDaily,
      itemRows,
      consumptionRows,
      topAccounts,
      topCars,
      expenseRows,
      slipRows,
      pendingSlips,
      recentEntries,
    ] = await Promise.all([
      salesTotals(from, to),
      salesTotals(prevFrom, prevTo),
      expenseTotals(from, to),
      expenseTotals(prevFrom, prevTo),

      PurbaliEntry.aggregate([
        { $match: inRange(from, to) },
        dailyGroup("$totalAmount"),
      ]),
      Expense.aggregate([{ $match: inRange(from, to) }, dailyGroup("$amount")]),

      // Sales by item
      PurbaliEntry.aggregate([
        { $match: inRange(from, to) },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.id",
            label: { $first: "$items.label" },
            qty: { $sum: "$items.qty" },
            amount: { $sum: "$items.amount" },
          },
        },
        { $sort: { amount: -1 } },
      ]),

      // Sales by consumption type
      PurbaliEntry.aggregate([
        { $match: inRange(from, to) },
        {
          $group: {
            _id: {
              $cond: [
                { $in: ["$consumptionType", ["", null]] },
                "Unspecified",
                "$consumptionType",
              ],
            },
            amount: { $sum: "$totalAmount" },
            bills: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),

      // Top accounts
      PurbaliEntry.aggregate([
        { $match: inRange(from, to) },
        {
          $group: {
            _id: "$accountNo",
            amount: { $sum: "$totalAmount" },
            bills: { $sum: 1 },
            department: { $last: "$department" },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 5 },
      ]),

      // Top cars
      PurbaliEntry.aggregate([
        { $match: { ...inRange(from, to), carNo: { $nin: [null, ""] } } },
        {
          $group: {
            _id: "$carNo",
            amount: { $sum: "$totalAmount" },
            bills: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 5 },
      ]),

      // Expenses by type
      Expense.aggregate([
        { $match: inRange(from, to) },
        {
          $group: {
            _id: "$type",
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),

      // Kacha slips: pipeline status (all time, not deleted)
      KachaSlip.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$totalAmount" },
          },
        },
      ]),

      // Oldest pending slips first -> what needs billing
      KachaSlip.find({ isDeleted: false, status: "pending" })
        .sort({ date: 1 })
        .limit(6)
        .select("slNo date carNo accountNo couponNo totalAmount")
        .lean(),

      PurbaliEntry.find(inRange(from, to))
        .sort({ date: -1, createdAt: -1 })
        .limit(8)
        .select("date couponNo accountNo carNo consumptionType totalAmount")
        .lean(),
    ]);

    const sales = curSales[0]?.total || 0;
    const bills = curSales[0]?.bills || 0;
    const expenses = curExp[0]?.total || 0;
    const pSales = prevSales[0]?.total || 0;
    const pBills = prevSales[0]?.bills || 0;
    const pExpenses = prevExp[0]?.total || 0;

    // Fill every day of the range so the chart has no gaps
    const sMap = new Map(salesDaily.map((d) => [d._id, d.total]));
    const eMap = new Map(expDaily.map((d) => [d._id, d.total]));
    const trend = [];
    for (let t = from.getTime(); t <= to.getTime(); t += DAY) {
      const key = ymd(new Date(t));
      trend.push({
        date: key,
        sales: round2(sMap.get(key)),
        expenses: round2(eMap.get(key)),
      });
    }

    const labelOf = Object.fromEntries(
      EXPENSE_TYPES.map((t) => [t.key, t.label]),
    );
    const slip = Object.fromEntries(slipRows.map((s) => [s._id, s]));

    res.json({
      range: { from: r.fromStr, to: r.toStr },
      kpis: {
        sales: { value: round2(sales), change: delta(sales, pSales) },
        bills: { value: bills, change: delta(bills, pBills) },
        expenses: {
          value: round2(expenses),
          change: delta(expenses, pExpenses),
        },
        net: {
          value: round2(sales - expenses),
          change: delta(sales - expenses, pSales - pExpenses),
        },
        avgBill: { value: bills ? round2(sales / bills) : 0 },
        pendingSlips: {
          count: slip.pending?.count || 0,
          amount: round2(slip.pending?.amount),
        },
      },
      trend,
      items: itemRows.map((i) => ({
        id: i._id,
        label: i.label,
        qty: round2(i.qty),
        amount: round2(i.amount),
      })),
      consumption: consumptionRows.map((c) => ({
        type: c._id,
        amount: round2(c.amount),
        bills: c.bills,
      })),
      expenseByType: expenseRows.map((e) => ({
        type: e._id,
        label: labelOf[e._id] || e._id,
        amount: round2(e.amount),
        count: e.count,
      })),
      topAccounts: topAccounts.map((a) => ({
        accountNo: a._id,
        department: a.department || "",
        amount: round2(a.amount),
        bills: a.bills,
      })),
      topCars: topCars.map((c) => ({
        carNo: c._id,
        amount: round2(c.amount),
        bills: c.bills,
      })),
      slipStatus: {
        pending: slip.pending?.count || 0,
        billed: slip.billed?.count || 0,
        cancelled: slip.cancelled?.count || 0,
      },
      pendingSlips,
      recentEntries,
    });
  } catch (err) {
    console.error("purbali dashboard:", err);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
}
