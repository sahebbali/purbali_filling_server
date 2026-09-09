import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    // General Settings
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    storePhone: {
      type: String,
      trim: true,
    },
    storeAddress: {
      type: String,
      trim: true,
    },
    storeLogo: {
      type: String,
      default: null,
    },
    currency: {
      type: String,
      default: "BDT",
    },
    timezone: {
      type: String,
      default: "BST",
    },
    dateFormat: {
      type: String,
      default: "MM/DD/YYYY",
    },

    // Payment Settings
    paymentGateway: {
      type: String,
      enum: ["bkash", "nagad", "upay", "rocket"],
      default: "bkash",
    },

    // bKash Settings
    bkashNumbers: {
      type: [String],
      trim: true,
      default: [],
    },
    // Nagad Settings
    nagadNumbers: {
      type: [String],
      trim: true,
      default: [],
    },
    // Rocket Settings
    rocketNumbers: {
      type: [String],
      trim: true,
      default: [],
    },

    // Additional Payment Methods
    codEnabled: {
      type: Boolean,
      default: true,
    },
    bankTransferEnabled: {
      type: Boolean,
      default: false,
    },

    // Email Settings
    smtpHost: {
      type: String,
      trim: true,
    },
    smtpPort: {
      type: Number,
    },
    smtpUser: {
      type: String,
      trim: true,
    },
    smtpPassword: {
      type: String,
      trim: true,
    },
    smtpEncryption: {
      type: String,
      enum: ["tls", "ssl", "none"],
      default: "tls",
    },
    fromEmail: {
      type: String,
      trim: true,
    },
    fromName: {
      type: String,
      trim: true,
    },
    emailTemplate: {
      type: String,
      default: "default",
    },

    // Notification Settings
    orderNotifications: {
      type: Boolean,
      default: true,
    },
    lowStockNotifications: {
      type: Boolean,
      default: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    customerQueryNotifications: {
      type: Boolean,
      default: true,
    },
    adminEmail: {
      type: String,
      trim: true,
    },
    alertEmail: {
      type: String,
      trim: true,
    },
    dailyReport: {
      type: Boolean,
      default: true,
    },
    weeklyReport: {
      type: Boolean,
      default: false,
    },

    id: {
      type: String,
      default: "system-info",
    },
  },
  {
    timestamps: true,
  },
);

// Encrypt sensitive data before saving
settingsSchema.pre("save", async function (next) {
  // Encrypt API keys and passwords
  const sensitiveFields = [
    "bkashApiSecret",
    "bkashPassword",
    "nagadPrivateKey",
    "upayApiSecret",
    "smtpPassword",
  ];

  sensitiveFields.forEach((field) => {
    if (this.isModified(field) && this[field]) {
      // Here you can add encryption logic
      // this[field] = encrypt(this[field]);
    }
  });

  next();
});

export default mongoose.model("Settings", settingsSchema);
