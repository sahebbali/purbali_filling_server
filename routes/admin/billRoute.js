import express from "express";
import {
  exportMonthlyBillExcel,
  exportMonthlyBreakdownExcel,
  getItemWiseMonthlyBill,
  getMonthDetails,
  getMonthlyBill,
  getMonthlyBreakdown,
  getMonthlySummary,
  getMonthlySummaryMatrix,
  getMonthOverview,
} from "../../controllers/billControllers.js";

const router = express.Router();

// Add rate
router.post("/purbali-entries/monthly", getMonthlySummary);

router.get("/entries/month-details", getMonthDetails);
router.get("/entries/month-overview", getMonthOverview);

router.get("/entries/month-bill", getItemWiseMonthlyBill);
router.get("/entries/month-bill/export", exportMonthlyBillExcel);

router.get("/entries/month-breakdown", getMonthlyBreakdown);
router.get("/entries/month-breakdown/export", exportMonthlyBreakdownExcel);

router.get("/purbali/monthly-summary-matrix", getMonthlySummaryMatrix);

export default router;
