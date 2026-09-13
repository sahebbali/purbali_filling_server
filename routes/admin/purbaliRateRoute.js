import express from "express";

import {
  addRate,
  getAllRates,
  updateRate,
  deleteRate,
} from "../../controllers/purbaliRateController.js";

const router = express.Router();

// Add rate
router.post("/purbali-rates", addRate);

// Get all rates
router.get("/purbali-rates", getAllRates);

// Update rate
router.put("/:id", updateRate);

// Delete rate
router.delete("/purbali-rates:id", deleteRate);

export default router;
