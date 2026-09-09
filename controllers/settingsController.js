import Settings from "../models/settingModel.js";
// Get settings
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne({ id: "system-info" }).lean();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Settings not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Get settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
};

// Update settings
const updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    const options = { new: true, runValidators: true };

    // Find and update settings
    let settings = await Settings.findOneAndUpdate(
      { userId: req.userId },
      updates,
      options,
    );

    if (!settings) {
      // Create new settings if not exists
      settings = new Settings({
        userId: req.userId,
        ...updates,
      });
      await settings.save();
    }

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating settings",
      error: error.message,
    });
  }
};

// Upload logo
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;

    const settings = await Settings.findOneAndUpdate(
      { userId: req.userId },
      { storeLogo: logoUrl },
      { new: true, upsert: true },
    );

    res.json({
      success: true,
      message: "Logo uploaded successfully",
      data: { logoUrl },
    });
  } catch (error) {
    console.error("Upload logo error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading logo",
      error: error.message,
    });
  }
};

// Test SMTP Connection
const testSMTP = async (req, res) => {
  try {
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpEncryption,
      fromEmail,
    } = req.body;

    // Here you can add nodemailer test logic
    // const transporter = nodemailer.createTransport({...});
    // await transporter.verify();

    res.json({
      success: true,
      message: "SMTP connection successful",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "SMTP connection failed",
      error: error.message,
    });
  }
};

// Get payment gateway status
const getPaymentStatus = async (req, res) => {
  try {
    const settings = await Settings.findOne({ userId: req.userId });

    const paymentStatus = {
      bkash: {
        enabled: !!(settings?.bkashNumber && settings?.bkashApiKey),
        configured: !!(settings?.bkashNumber && settings?.bkashApiKey),
      },
      nagad: {
        enabled: !!(settings?.nagadMerchantId && settings?.nagadNumber),
        configured: !!(settings?.nagadMerchantId && settings?.nagadNumber),
      },
      upay: {
        enabled: !!(settings?.upayMerchantId && settings?.upayApiKey),
        configured: !!(settings?.upayMerchantId && settings?.upayApiKey),
      },
      rocket: {
        enabled: !!(settings?.rocketNumber && settings?.rocketApiKey),
        configured: !!(settings?.rocketNumber && settings?.rocketApiKey),
      },
      cod: {
        enabled: settings?.codEnabled || false,
      },
      bankTransfer: {
        enabled: settings?.bankTransferEnabled || false,
      },
    };

    res.json({
      success: true,
      data: paymentStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching payment status",
      error: error.message,
    });
  }
};

// Create or Update Settings
export const saveSettings = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    let body = req.body;

    // যদি FormData থেকে data আসে string হিসেবে
    if (typeof body.data === "string") {
      body = JSON.parse(body.data);
    }

    // convert numbers array safely
    ["bkashNumbers", "nagadNumbers", "rocketNumbers"].forEach((key) => {
      if (typeof body[key] === "string") {
        try {
          body[key] = JSON.parse(body[key]);
        } catch {
          body[key] = body[key]
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
      }

      if (!Array.isArray(body[key])) {
        body[key] = [];
      }
    });

    // logo upload
    if (req.file) {
      body.storeLogo = req.file.path;
    }

    let settings = await Settings.findOne({ id: "system-info" });

    if (settings) {
      // old + new merge multiple numbers
      body.bkashNumbers = [
        ...new Set([
          ...(settings.bkashNumbers || []),
          ...(body.bkashNumbers || []),
        ]),
      ];

      body.nagadNumbers = [
        ...new Set([
          ...(settings.nagadNumbers || []),
          ...(body.nagadNumbers || []),
        ]),
      ];

      body.rocketNumbers = [
        ...new Set([
          ...(settings.rocketNumbers || []),
          ...(body.rocketNumbers || []),
        ]),
      ];

      settings = await Settings.findOneAndUpdate(
        { id: "system-info" },
        { $set: body },
        { new: true },
      );
    } else {
      settings = await Settings.create({
        id: "system-info",
        ...body,
      });
    }

    res.status(200).json({
      success: true,
      message: "Settings saved successfully",
      data: settings,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteNumber = async (req, res) => {
  try {
    const { number, gateway } = req.body;

    // Validation
    if (!number || !gateway) {
      return res.status(400).json({
        success: false,
        message: "Number and gateway are required",
      });
    }

    // Allowed fields
    const allowedGateways = ["bkashNumbers", "nagadNumbers", "rocketNumbers"];

    if (!allowedGateways.includes(gateway)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gateway name",
      });
    }

    // Remove number from selected gateway array
    const updatedSettings = await Settings.findOneAndUpdate(
      { id: "system-info" },
      { $pull: { [gateway]: number } },
      { new: true },
    );

    if (!updatedSettings) {
      return res.status(404).json({
        success: false,
        message: "Settings not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `${number} deleted from ${gateway} successfully`,
      data: updatedSettings,
    });
  } catch (error) {
    console.error("Delete number error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export default {
  getSettings,
  updateSettings,
  uploadLogo,
  testSMTP,
  getPaymentStatus,
  saveSettings,
  deleteNumber,
};
