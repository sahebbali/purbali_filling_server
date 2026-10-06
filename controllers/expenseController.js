import Expense, {
  EXPENSE_KEYS,
  EXPENSE_TYPES,
} from "../models/PurbaliExpense.js";

const TZ = "Asia/Dhaka";

// 'YYYY-MM-DD' -> Date at midnight Dhaka time
const toDhakaDate = (str) => new Date(`${str}T00:00:00+06:00`);

const isValidDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

// ---------- Create (one or many expenses for a date) ----------
// body: { date: "2026-09-04", items: [{ type: "fuel", amount: 5000, note: "" }, ...] }
export const createExpenses = async (req, res) => {
  try {
    const { date, items } = req.body;
    if (!isValidDay(date)) {
      return res.status(400).json({ message: "date must be YYYY-MM-DD" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "items must be a non-empty array" });
    }

    const docs = [];
    for (const it of items) {
      const amount = Number(it.amount);
      if (!EXPENSE_KEYS.includes(it.type)) {
        return res.status(400).json({ message: `Invalid type: ${it.type}` });
      }
      if (!Number.isFinite(amount) || amount <= 0) continue; // skip empty cells
      docs.push({
        date: toDhakaDate(date),
        type: it.type,
        amount,
        note: it.note || "",
        createdBy: req.user?._id,
      });
    }
    if (docs.length === 0) {
      return res.status(400).json({ message: "No valid amounts provided" });
    }

    const created = await Expense.insertMany(docs);
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- List (with filters + pagination) ----------
// GET /?month=2026-09&type=fuel&page=1&limit=50
export const listExpenses = async (req, res) => {
  try {
    const { month, from, to, type, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (month) {
      const [y, m] = month.split("-").map(Number);
      const start = toDhakaDate(`${month}-01`);
      const next = new Date(y, m, 1); // first of next month
      const end = toDhakaDate(
        `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(
          2,
          "0",
        )}-01`,
      );
      filter.date = { $gte: start, $lt: end };
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toDhakaDate(from);
      if (to) filter.date.$lt = new Date(toDhakaDate(to).getTime() + 86400000);
    }
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Expense.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Expense.countDocuments(filter),
    ]);

    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Update ----------
export const updateExpense = async (req, res) => {
  try {
    const { type, amount, note, date } = req.body;
    const update = {};
    if (type !== undefined) {
      if (!EXPENSE_KEYS.includes(type)) {
        return res.status(400).json({ message: `Invalid type: ${type}` });
      }
      update.type = type;
    }
    if (amount !== undefined) {
      if (!(Number(amount) > 0))
        return res.status(400).json({ message: "Invalid amount" });
      update.amount = Number(amount);
    }
    if (note !== undefined) update.note = note;
    if (date !== undefined) {
      if (!isValidDay(date))
        return res.status(400).json({ message: "date must be YYYY-MM-DD" });
      update.date = toDhakaDate(date);
    }

    const doc = await Expense.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!doc) return res.status(404).json({ message: "Expense not found" });
    res.json({ data: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Delete ----------
export const deleteExpense = async (req, res) => {
  try {
    const doc = await Expense.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Monthly matrix (the sheet) ----------
// GET /matrix?month=2026-09
export const getMonthlyExpenseMatrix = async (req, res) => {
  try {
    const { month } = req.query;
    if (!/^\d{4}-\d{2}$/.test(month || "")) {
      return res.status(400).json({ message: "month must be YYYY-MM" });
    }

    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const start = toDhakaDate(`${month}-01`);
    const end = new Date(start.getTime() + daysInMonth * 86400000);

    const totals = await Expense.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date",
                timezone: TZ,
              },
            },
            type: "$type",
          },
          amount: { $sum: "$amount" },
        },
      },
    ]);

    // day -> type -> amount
    const byDay = new Map();
    for (const t of totals) {
      const { day, type } = t._id;
      if (!byDay.has(day)) byDay.set(day, {});
      byDay.get(day)[type] = (byDay.get(day)[type] || 0) + t.amount;
    }

    const columnTotals = Object.fromEntries(EXPENSE_KEYS.map((k) => [k, 0]));
    let grandTotal = 0;

    // one row per calendar day, like the sheet
    const rows = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const day = `${month}-${String(d).padStart(2, "0")}`;
      const cells = byDay.get(day) || {};
      const values = {};
      let rowTotal = 0;
      for (const key of EXPENSE_KEYS) {
        const v = cells[key] || 0;
        values[key] = v || null; // null -> render "-"
        rowTotal += v;
        columnTotals[key] += v;
      }
      grandTotal += rowTotal;
      rows.push({ date: day, values, total: rowTotal || null });
    }

    // sum of the 3 "Miscellaneous Expenses" columns
    const groupTotals = {};
    for (const t of EXPENSE_TYPES) {
      if (t.group)
        groupTotals[t.group] =
          (groupTotals[t.group] || 0) + columnTotals[t.key];
    }

    res.json({
      month,
      columns: EXPENSE_TYPES,
      rows,
      totals: { values: columnTotals, groups: groupTotals, amount: grandTotal },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Types (for frontend dropdowns / table headers) ----------
export const getExpenseTypes = (req, res) => res.json({ data: EXPENSE_TYPES });

const OFFSET = "+06:00"; // Bangladesh has no DST
const pad = (n) => String(n).padStart(2, "0");

// Columns for the sheet, including the merged "Miscellaneous Expenses" group
const COLUMNS = EXPENSE_TYPES.map(({ key, label, group }) => ({
  key,
  label,
  group,
}));

const zeroRow = () => Object.fromEntries(EXPENSE_TYPES.map((t) => [t.key, 0]));

const dhakaStart = (ymd) => new Date(`${ymd}T00:00:00${OFFSET}`);

const monthRange = (month) => {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    start: dhakaStart(`${month}-01`),
    end: dhakaStart(`${next}-01`),
    keys: Array.from(
      { length: daysInMonth },
      (_, i) => `${month}-${pad(i + 1)}`,
    ),
  };
};

const yearRange = (year) => ({
  start: dhakaStart(`${year}-01-01`),
  end: dhakaStart(`${Number(year) + 1}-01-01`),
  keys: Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`),
});

// Builds sheet-style rows (one per period) + column totals + grand total
function pivot(aggRows, bucketKeys) {
  const map = new Map(
    bucketKeys.map((k) => [k, { period: k, values: zeroRow(), total: 0 }]),
  );
  const totals = zeroRow();
  let grandTotal = 0;

  for (const { _id, total } of aggRows) {
    const row = map.get(_id.bucket);
    if (!row) continue;
    row.values[_id.type] += total;
    row.total += total;
    totals[_id.type] += total;
    grandTotal += total;
  }

  // Subtotal for each group (e.g. "Miscellaneous Expenses")
  const groupTotals = {};
  for (const t of EXPENSE_TYPES) {
    if (t.group)
      groupTotals[t.group] = (groupTotals[t.group] || 0) + totals[t.key];
  }

  return { rows: [...map.values()], totals, groupTotals, grandTotal };
}

const aggregateBy = (start, end, format, type) =>
  Expense.aggregate([
    {
      $match: {
        date: { $gte: start, $lt: end },
        ...(type ? { type } : {}),
      },
    },
    {
      $group: {
        _id: {
          bucket: { $dateToString: { format, date: "$date", timezone: TZ } },
          type: "$type",
        },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

const bad = (res, message) => res.status(400).json({ success: false, message });

const validType = (type) => !type || EXPENSE_TYPES.some((t) => t.key === type);

/**
 * GET /api/expenses/reports/daily?date=2026-10-06
 * One day: per-type totals + every entry of that day
 */
export const getDailyReport = async (req, res) => {
  try {
    const { date, type } = req.query;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || ""))
      return bad(res, "date is required in YYYY-MM-DD format");
    if (!validType(type)) return bad(res, "Invalid expense type");

    const start = dhakaStart(date);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const [entries, agg] = await Promise.all([
      Expense.find({
        date: { $gte: start, $lt: end },
        ...(type ? { type } : {}),
      })
        .sort({ createdAt: 1 })
        .populate("createdBy", "name")
        .lean(),
      aggregateBy(start, end, "%Y-%m-%d", type),
    ]);

    const { rows, totals, groupTotals, grandTotal } = pivot(agg, [date]);

    res.json({
      success: true,
      data: {
        date,
        columns: COLUMNS,
        values: rows[0].values,
        totals,
        groupTotals,
        grandTotal,
        entryCount: entries.length,
        entries,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/expenses/reports/monthly?month=2026-10
 * Day-by-day sheet for a month (every day included, zeros when empty)
 */
export const getMonthlyReport = async (req, res) => {
  try {
    const { month, type } = req.query;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || ""))
      return bad(res, "month is required in YYYY-MM format");
    if (!validType(type)) return bad(res, "Invalid expense type");

    const { start, end, keys } = monthRange(month);
    const agg = await aggregateBy(start, end, "%Y-%m-%d", type);
    const report = pivot(agg, keys);

    res.json({
      success: true,
      data: {
        month,
        columns: COLUMNS,
        ...report,
        rows: report.rows.map(({ period, ...r }) => ({ date: period, ...r })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/expenses/reports/yearly?year=2026
 * Month-by-month summary for a year (12 rows)
 */
export const getYearlyReport = async (req, res) => {
  try {
    const { year, type } = req.query;
    if (!/^\d{4}$/.test(year || ""))
      return bad(res, "year is required in YYYY format");
    if (!validType(type)) return bad(res, "Invalid expense type");

    const { start, end, keys } = yearRange(year);
    const agg = await aggregateBy(start, end, "%Y-%m", type);
    const report = pivot(agg, keys);

    res.json({
      success: true,
      data: {
        year,
        columns: COLUMNS,
        ...report,
        rows: report.rows.map(({ period, ...r }) => ({ month: period, ...r })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
