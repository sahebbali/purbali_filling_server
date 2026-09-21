import express from "express";

import {
  addRate,
  getAllRates,
  updateRate,
  deleteRate,
  toggleShowInBill,
} from "../../controllers/purbaliRateController.js";

const router = express.Router();

// Add rate
router.post("/purbali-rates", addRate);

// Get all rates
router.get("/purbali-rates", getAllRates);

// Update rate
router.put("/update-purbali-rates/:id", updateRate);

router.patch("/purbali-rates/:id/show-in-bill", toggleShowInBill);

// Delete rate
router.delete("/purbali-rates:id", deleteRate);

export default router;
