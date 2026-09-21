import mongoose from "mongoose";

const { Schema } = mongoose;

const LINE_TYPES = [
  "FUEL",
  "GENERATOR",
  "SERVICING",
  "LUBE",
  "BRANCH",
  "PERIOD",
  "OTHER",
];

/* --------------------------------
   Account Line Schema
--------------------------------- */

const LineSchema = new Schema(
  {
    line_name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: LINE_TYPES,
      default: "OTHER",
    },

    // Single tag/unit code
    // Example: "APBML"
    unit: {
      type: String,
      trim: true,
    },

    // Multiple tag codes
    // Example: ["SAL", "ACRL", "Akij"]
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    cars: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    _id: false,
  },
);

/* --------------------------------
   Account Schema
--------------------------------- */

const AccountSchema = new Schema(
  {
    // Matches numeric _id from accounts.json
    _id: {
      type: Number,
    },

    // Original Sl No
    // null when the source sheet has no Sl No
    sl_no: {
      type: Number,
      default: null,
    },

    // Account number
    // Kept as String because values can be:
    // "8(A)", "20 A", "32A", etc.
    ac_no: {
      type: String,
      required: true,
      trim: true,
    },

    // Account / Bank name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Flexible address
    //
    // Can contain 1, 2, 3, 4, 5 or more lines.
    //
    // Example:
    // [
    //   "Head Office",
    //   "City Centre, Motijheel C/A",
    //   "Dhaka-1000, Dhaka"
    // ]
    address: {
      type: [String],
      default: [],
      set: (value) =>
        Array.isArray(value)
          ? value.map((line) => String(line).trim()).filter(Boolean)
          : [],
    },

    // Account-related lines
    lines: {
      type: [LineSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "accounts",
  },
);

/* --------------------------------
   Indexes
--------------------------------- */

// Account number lookup
AccountSchema.index({
  ac_no: 1,
});

// Search account name and line names
AccountSchema.index({
  name: "text",
  "lines.line_name": "text",
});

/* --------------------------------
   Model
--------------------------------- */

const Account = mongoose.model("Account-Info", AccountSchema);

export default Account;
