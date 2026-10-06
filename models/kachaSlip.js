// models/KachaSlip.js
import mongoose from "mongoose";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const fuelLine = {
  qty: { type: Number, default: 0, min: 0 }, // litre / pcs
  rate: { type: Number, default: 0, min: 0 },
  amount: { type: Number, default: 0, min: 0 }, // computed: qty * rate
};

const kachaSlipSchema = new mongoose.Schema(
  {
    slNo: { type: Number, unique: true, index: true }, // Sl No (auto)
    date: { type: Date, required: true, default: Date.now, index: true },

    carNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    accountNo: { type: String, trim: true, index: true }, // A/c No
    couponNo: { type: String, trim: true, index: true },

    diesel: fuelLine,
    octane: fuelLine, // Octen
    petrol: fuelLine,
    mobil: fuelLine,
    others: {
      ...fuelLine,
      description: { type: String, trim: true },
    },

    driverName: { type: String, trim: true },
    phone: {
      type: String,
      trim: true,
      required: [true, "Phone number is required"],
      match: [
        /^01[3-9]\d{8}$/,
        "Invalid Bangladeshi phone number (must be 11 digits starting with 01)",
      ],
    },

    totalAmount: { type: Number, default: 0 },
    remarks: { type: String, trim: true },

    status: {
      type: String,
      enum: ["pending", "billed", "cancelled"],
      default: "pending",
      index: true,
    },
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurbaliEntry",
      default: null,
    },

    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// compound indexes for common searches
kachaSlipSchema.index({ date: -1, status: 1 });
kachaSlipSchema.index({ accountNo: 1, date: -1 });

const FUELS = ["diesel", "octane", "petrol", "mobil", "others"];

// auto serial number + compute amounts/total
kachaSlipSchema.pre("validate", async function (next) {
  try {
    // if (this.isNew && !this.slNo) {
    //   const c = await Counter.findOneAndUpdate(
    //     { _id: "kachaSlip" },
    //     { $inc: { seq: 1 } },
    //     { new: true, upsert: true }
    //   );
    //   this.slNo = c.seq;
    // }
    let total = 0;
    for (const f of FUELS) {
      const line = this[f];
      if (!line) continue;
      line.amount = round2((line.qty || 0) * (line.rate || 0));
      total += line.amount;
    }
    this.totalAmount = round2(total);
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("KachaSlip", kachaSlipSchema);
