import express from "express";

import {
  getMonthlySummary,
  getMonthlySummaryDrillDown,
} from "../../controllers/reportController.js";
const router = express.Router();

router.get("/monthly-summary", getMonthlySummary);
router.get("/monthly-summary/:year/:month", getMonthlySummaryDrillDown);

export default router;
