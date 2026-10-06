import KachaSlip from "../models/kachaSlip.js";

const PICK = [
  "date",
  "slNo",
  "status",
  "carNo",
  "accountNo",
  "couponNo",
  "diesel",
  "octane",
  "petrol",
  "mobil",
  "others",
  "driverName",
  "phone",
  "remarks",
];
const pick = (obj) =>
  Object.fromEntries(PICK.filter((k) => k in obj).map((k) => [k, obj[k]]));

export const createSlip = async (req, res) => {
  try {
    const slip = await KachaSlip.create({
      ...pick(req.body),
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: slip });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const getSlips = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      from,
      to,
      status,
      carNo,
      accountNo,
      couponNo,
      q,
    } = req.query;
    const filter = { isDeleted: false };

    if (status) filter.status = status;
    if (carNo) filter.carNo = new RegExp(carNo.trim(), "i");
    if (accountNo) filter.accountNo = accountNo.trim();
    if (couponNo) filter.couponNo = couponNo.trim();
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (q) {
      const rx = new RegExp(q.trim(), "i");
      const n = Number(q);
      filter.$or = [
        { carNo: rx },
        { accountNo: rx },
        { couponNo: rx },
        { driverName: rx },
        { phone: rx },
        ...(Number.isFinite(n) ? [{ slNo: n }] : []),
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total, agg] = await Promise.all([
      KachaSlip.find(filter)
        .sort({ date: -1, slNo: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      KachaSlip.countDocuments(filter),
      KachaSlip.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            amount: { $sum: "$totalAmount" },
            diesel: { $sum: "$diesel.qty" },
            octane: { $sum: "$octane.qty" },
            petrol: { $sum: "$petrol.qty" },
            mobil: { $sum: "$mobil.qty" },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data,
      totals: agg[0] || {
        amount: 0,
        diesel: 0,
        octane: 0,
        petrol: 0,
        mobil: 0,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getSlip = async (req, res) => {
  const { id } = req.params;
  // 👇 Reject non-ObjectId strings before hitting the DB
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: `Invalid slip id: "${id}"`,
    });
  }
  const slip = await KachaSlip.findOne({
    _id: id,
    isDeleted: false,
  });
  if (!slip)
    return res.status(404).json({ success: false, message: "Slip not found" });
  res.json({ success: true, data: slip });
};

export const updateSlip = async (req, res) => {
  try {
    const slip = await KachaSlip.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!slip)
      return res
        .status(404)
        .json({ success: false, message: "Slip not found" });
    if (slip.status !== "pending")
      return res
        .status(409)
        .json({ success: false, message: `Cannot edit a ${slip.status} slip` });

    slip.set(pick(req.body));
    slip.updatedBy = req.user?._id;
    await slip.save(); // re-runs total calculation
    res.json({ success: true, data: slip });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const updateStatus = async (req, res) => {
  const { status, billId } = req.body;
  if (!["billed", "cancelled"].includes(status))
    return res.status(400).json({ success: false, message: "Invalid status" });

  const slip = await KachaSlip.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    {
      status,
      billId: status === "billed" ? billId : null,
      updatedBy: req.user?._id,
    },
    { new: true },
  );
  if (!slip)
    return res.status(404).json({ success: false, message: "Slip not found" });
  res.json({ success: true, data: slip });
};

export const deleteSlip = async (req, res) => {
  const slip = await KachaSlip.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true, updatedBy: req.user?._id },
    { new: true },
  );
  if (!slip)
    return res.status(404).json({ success: false, message: "Slip not found" });
  res.json({ success: true, message: "Deleted" });
};

export const monthlySummary = async (req, res) => {
  const data = await KachaSlip.aggregate([
    { $match: { isDeleted: false, status: { $ne: "cancelled" } } },
    {
      $group: {
        _id: { y: { $year: "$date" }, m: { $month: "$date" } },
        count: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
        diesel: { $sum: "$diesel.qty" },
        octane: { $sum: "$octane.qty" },
        petrol: { $sum: "$petrol.qty" },
        mobil: { $sum: "$mobil.qty" },
      },
    },
    { $sort: { "_id.y": -1, "_id.m": -1 } },
    {
      $project: {
        _id: 0,
        year: "$_id.y",
        month: "$_id.m",
        count: 1,
        totalAmount: 1,
        diesel: 1,
        octane: 1,
        petrol: 1,
        mobil: 1,
      },
    },
  ]);
  res.json({ success: true, data });
};

const TZ = "Asia/Dhaka";
const pad = (n) => String(n).padStart(2, "0");
const dhaka = (y, m = 1, d = 1) =>
  new Date(`${y}-${pad(m)}-${pad(d)}T00:00:00+06:00`);
const SUM_KEYS = [
  "count",
  "diesel",
  "octane",
  "petrol",
  "mobil",
  "others",
  "amount",
];

export const slipReport = async (req, res) => {
  try {
    const now = new Date();
    const groupBy = ["day", "month", "year"].includes(req.query.groupBy)
      ? req.query.groupBy
      : "day";
    console.log("groupBy", groupBy);
    const year = Number(req.query.year) || now.getFullYear();
    const month = Math.min(
      Math.max(Number(req.query.month) || now.getMonth() + 1, 1),
      12,
    );
    const { status } = req.query;

    const match = {
      isDeleted: false,
      status: ["pending", "billed", "cancelled"].includes(status)
        ? status
        : { $ne: "cancelled" },
    };

    let format = "%Y";
    if (groupBy === "day") {
      match.date = {
        $gte: dhaka(year, month),
        $lt: month === 12 ? dhaka(year + 1) : dhaka(year, month + 1),
      };
      format = "%Y-%m-%d";
    } else if (groupBy === "month") {
      match.date = { $gte: dhaka(year), $lt: dhaka(year + 1) };
      format = "%Y-%m";
    }

    const rows = await KachaSlip.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format, date: "$date", timezone: TZ } },
          count: { $sum: 1 },
          diesel: { $sum: "$diesel.qty" },
          octane: { $sum: "$octane.qty" },
          petrol: { $sum: "$petrol.qty" },
          mobil: { $sum: "$mobil.qty" },
          others: { $sum: "$others.amount" },
          amount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: "$_id",
          count: 1,
          diesel: 1,
          octane: 1,
          petrol: 1,
          mobil: 1,
          others: 1,
          amount: 1,
        },
      },
    ]);

    const totals = Object.fromEntries(
      SUM_KEYS.map((k) => [k, rows.reduce((s, r) => s + r[k], 0)]),
    );
    res.json({ success: true, groupBy, year, month, data: rows, totals });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
};
