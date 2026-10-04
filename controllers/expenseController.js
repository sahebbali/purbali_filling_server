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
