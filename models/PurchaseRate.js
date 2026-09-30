// models/PurchaseRate.js
import mongoose from "mongoose";

const rate = { type: Number, default: 0, min: 0 };

const PurchaseRateSchema = new mongoose.Schema(
  {
    accountNo: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true },

    // Fuel
    octane: rate,
    diesel: rate,

    // Oils
    looseMobile: rate,
    tq1: rate, // T.Q-1
    tq5: rate, // T.Q-5
    brakeOil: rate,
    powerOil: rate,
    gearOil: rate,

    // Other items
    qw: rate, // Q.W
    af: rate, // A.F
    mf: rate, // M.F
    pf: rate, // P.F
    df: rate, // D.F
    af2: rate, // second "A.F" in your list (duplicate, rename as needed)

    servicing: rate,
  },
  { timestamps: true },
);

const PurchaseRate = mongoose.model("PurchaseRate", PurchaseRateSchema);

export default PurchaseRate;
