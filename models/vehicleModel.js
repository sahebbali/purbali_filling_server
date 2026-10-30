import mongoose from "mongoose";

const FUEL_TYPES = ["DIESEL", "OCTANE", "PETROL", "LPG"];

const vehicleSchema = new mongoose.Schema(
  {
    vehicle_no: {
      type: String,
      required: [true, "Vehicle number is required"],

      trim: true,
      index: true,
    },
    // Many records have no fuel type yet, so null is allowed
    fuel_type: {
      type: String,
      enum: {
        values: [...FUEL_TYPES, null],
        message: "{VALUE} is not a valid fuel type",
      },
      uppercase: true,
      default: null,
    },
    // Only present in some records (e.g. "ACCL")
    department_name: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    account_no: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

// Compound index for filtering by account and department together
vehicleSchema.index({ account_no: 1, department_name: 1 });

vehicleSchema.statics.FUEL_TYPES = FUEL_TYPES;

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

export default Vehicle;
