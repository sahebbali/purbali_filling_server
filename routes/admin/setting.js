import express from "express";
import settingsController from "../../controllers/settingsController.js";
const router = express.Router();
import { upload } from "../../utils/cloudinary.js";

// Settings routes
router.get("/get-settings", settingsController.getSettings);
router.delete("/delete-number", settingsController.deleteNumber);
router.put("/", settingsController.updateSettings);
router.post(
  "/save-settings",
  (req, res, next) => {
    upload.array("images", 20)(req, res, function (err) {
      if (err) {
        console.log("route err", err);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  settingsController.saveSettings,
);
// router.post(
//   "/upload-logo",
//   upload.single("logo"),
//   settingsController.uploadLogo,
// );
router.post("/test-smtp", settingsController.testSMTP);
router.get("/payment-status", settingsController.getPaymentStatus);

export default router;
