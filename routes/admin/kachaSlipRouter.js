import express from "express";

import {
  monthlySummary,
  createSlip,
  deleteSlip,
  getSlip,
  getSlips,
  updateSlip,
  updateStatus,
  slipReport,
} from "../../controllers/kachaSlipController.js";

const router = express.Router();

router.get("/summary/monthly", monthlySummary);

router.post("/kacha-slips", createSlip);
router.get("/kacha-slips", getSlips);

// Specific route MUST come before /:id
router.get("/kacha-slips-reports", slipReport);

// Dynamic routes AFTER specific routes
router.get("/kacha-slips/:id", getSlip);
router.patch("/kacha-slips/:id", updateSlip);
router.delete("/kacha-slips/:id", deleteSlip);
router.patch("/kacha-slips/:id/status", updateStatus);

export default router;
