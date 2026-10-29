import Vehicle from "../models/vehicleModel.js";

const FUEL_KEYWORDS = {
  DIESEL: ["DIESEL"],
  OCTANE: ["OCTANE"],
  PETROL: ["PETROL", "GASOLINE"],
  LPG: ["LPG"],
};

/**
 * Work out the fuel type from the entry items.
 * If several fuels are present, the one with the largest total qty wins.
 * Returns null when no fuel item is found (e.g. only servicing or recharge).
 */
const detectFuelType = (items = []) => {
  const totals = {};

  for (const item of items) {
    const text = `${item.id} ${item.label}`.toUpperCase();
    for (const [fuel, keywords] of Object.entries(FUEL_KEYWORDS)) {
      if (keywords.some((k) => text.includes(k))) {
        totals[fuel] = (totals[fuel] || 0) + Number(item.qty || 0);
        break;
      }
    }
  }

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
};
const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

const normalizeCarNo = (v) =>
  String(v || "")
    .replace(/[০-৯]/g, (d) => BANGLA_DIGITS.indexOf(d)) // ১২-১২৩৪ -> 12-1234
    .replace(/[\u2010-\u2015\u2212]/g, "-") // en/em dash -> "-"
    .replace(/\s*-\s*/g, "-") // "12 - 1234" -> "12-1234"
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
/**
 * Create the vehicle if missing; fill fuel_type only if it is still empty.
 * Never overwrites existing data.
 */
const ensureVehicle = async ({ carNo, accountNo, department, items }) => {
  const vehicleNo = normalizeCarNo(carNo);
  if (!vehicleNo) return { created: false };
  const existVehicle = await Vehicle.findOne({ vehicle_no: vehicleNo });
  if (existVehicle) return { created: false };

  try {
    const result = await Vehicle.updateOne(
      { vehicle_no: vehicleNo },
      {
        $setOnInsert: {
          vehicle_no: vehicleNo,
          account_no: accountNo || null,
          department_name: department || null,
          fuel_type: detectFuelType(items),
        },
      },
      { upsert: true },
    );
    return { created: result.upsertedCount > 0 };
  } catch (err) {
    if (err.code === 11000) return { created: false };
    throw err;
  }
};
export default ensureVehicle;
