import express from "express";
import { getMonthlySummary } from "../../controllers/billControllers.js";

const router = express.Router();

// Add rate
router.post("/purbali-entries/monthly", getMonthlySummary);

export default router;
