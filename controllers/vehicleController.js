import Vehicle from "../models/vehicleModel.js";

const ALLOWED_FIELDS = [
  "vehicle_no",
  "fuel_type",
  "department_name",
  "account_no",
];

// Keep only whitelisted fields from the request body
const pickFields = (body) =>
  ALLOWED_FIELDS.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Wraps async handlers so errors go to the error middleware
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// POST /api/vehicles
export const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.create(pickFields(req.body));
  res.status(201).json({ success: true, data: vehicle });
});

// POST /api/vehicles/bulk  — body: array of vehicles
export const bulkCreateVehicles = asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body) || req.body.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Body must be a non-empty array" });
  }

  const docs = req.body.map(pickFields);

  try {
    const inserted = await Vehicle.insertMany(docs, { ordered: false });
    res.status(201).json({
      success: true,
      inserted: inserted.length,
      skipped: docs.length - inserted.length,
    });
  } catch (err) {
    // ordered:false continues past duplicates; report what went in
    if (err.code === 11000 || err.writeErrors) {
      const inserted = err.insertedDocs ? err.insertedDocs.length : 0;
      return res.status(207).json({
        success: true,
        inserted,
        skipped: docs.length - inserted,
        message: "Some records were skipped (duplicates or invalid)",
      });
    }
    throw err;
  }
});

// GET /api/vehicles?fuel_type=&department_name=&account_no=&search=&page=&limit=
export const getVehicles = asyncHandler(async (req, res) => {
  const { fuel_type, department_name, account_no, search } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = {};
  if (fuel_type === "null") filter.fuel_type = null;
  else if (fuel_type) filter.fuel_type = fuel_type.toUpperCase();
  if (department_name) filter.department_name = department_name;
  if (account_no) filter.account_no = account_no;
  if (search)
    filter.vehicle_no = { $regex: escapeRegex(search), $options: "i" };

  const [data, total] = await Promise.all([
    Vehicle.find(filter)
      .sort({ vehicle_no: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Vehicle.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    count: data.length,
    data,
  });
});

// GET /api/vehicles/:id
export const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return res
      .status(404)
      .json({ success: false, message: "Vehicle not found" });
  }
  res.json({ success: true, data: vehicle });
});

// PUT /api/vehicles/:id
export const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findByIdAndUpdate(
    req.params.id,
    { $set: pickFields(req.body) },
    { new: true, runValidators: true },
  );
  if (!vehicle) {
    return res
      .status(404)
      .json({ success: false, message: "Vehicle not found" });
  }
  res.json({ success: true, data: vehicle });
});

// DELETE /api/vehicles/:id
export const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
  if (!vehicle) {
    return res
      .status(404)
      .json({ success: false, message: "Vehicle not found" });
  }
  res.json({ success: true, message: "Vehicle deleted" });
});
const normalizeVehicleNo = (value) => value?.replace(/\s+/g, " ").toUpperCase();
const cleanString = (value) =>
  typeof value === "string" ? value.trim() : undefined;
export const getVehicleByIdOrNo = asyncHandler(async (req, res) => {
  console.log("req.query:", req.query);
  const accountNo = cleanString(req.query.account_no);
  const vehicleNo = normalizeVehicleNo(cleanString(req.query.vehicle_no));

  console.log("accountNo:", accountNo, "vehicleNo:", vehicleNo);

  if (!accountNo && !vehicleNo) {
    return res.status(400).json({
      success: false,
      message: "Provide account_no and/or vehicle_no",
    });
  }

  const filter = {};
  if (accountNo) filter.account_no = accountNo;
  if (vehicleNo) {
    // "3454" matches "12-3454" (ends with), case-insensitive
    filter.vehicle_no = { $regex: `${escapeRegex(vehicleNo)}$`, $options: "i" };
  }

  // Single lookup: vehicle_no given (with or without account_no)
  if (vehicleNo) {
    const vehicle = await Vehicle.findOne(filter).select("-__v ").lean();

    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }
    return res.json({ success: true, data: vehicle });
  }
});
