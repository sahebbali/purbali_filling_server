import PurbaliEntry from "../models/PurbaliEntry.js";

// @route   POST /api/purbali-entries
export const createEntry = async (req, res) => {
  try {
    const { date, receivingDate, vehicleNo, couponNo, carNo, items } = req.body;

    if (!date || !carNo) {
      return res
        .status(400)
        .json({ success: false, message: "Date and Car No are required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one item is required" });
    }

    const entry = await PurbaliEntry.create({
      date,
      receivingDate,
      vehicleNo,
      couponNo,
      carNo,
      items,
      createdBy: req.user?._id, // remove if no auth middleware
    });

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
        .sort({ [sortField]: sortDir })
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
    const { date, receivingDate, vehicleNo, couponNo, carNo, items } = req.body;

    const entry = await PurbaliEntry.findByIdAndUpdate(
      req.params.id,
      { date, receivingDate, vehicleNo, couponNo, carNo, items },
      { new: true, runValidators: true },
    );

    if (!entry)
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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
