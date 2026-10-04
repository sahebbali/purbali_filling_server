// routes/purchaseRoutes.js
import express from "express";
import mongoose from "mongoose";
import {
  createPurchase,
  getPurchases,
  getAccountSummary,
  getPurchase,
  updatePurchase,
  addPayment,
  deletePurchase,
  dailyReport,
  dayPurchases,
} from "../../controllers/purchaseController.js";

const router = express.Router();

const validId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }
  next();
};

/* Purchases */
router.route("/purchases").post(createPurchase).get(getPurchases);

// keep before "/purchases/:id" so "summary" isn't treated as an id
router.get("/purchases/summary/:accountNo", getAccountSummary);

router
  .route("/purchases/:id")
  .all(validId)
  .get(getPurchase)
  .put(updatePurchase)
  .delete(deletePurchase);

router.patch("/purchases/:id/pay", validId, addPayment);

/* Error handler for this router */
router.use((err, req, res, next) => {
  if (err.name === "ValidationError") {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.code === 11000) {
    return res
      .status(409)
      .json({ success: false, message: "Duplicate value", keys: err.keyValue });
  }
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Server error" });
});
router.get("/purchases/report/daily", dailyReport);
router.get("/purchases/report/day", dayPurchases);

export default router;
