import express from "express";

import {
  createDiscount,
  deleteDiscount,
  getDiscountById,
  getDiscountByProduct,
  getDiscounts,
  getDiscountStats,
  getSearchProducts,
  updateDiscount,
} from "../../controllers/discountController.js";

const router = express.Router();

// ─── Product CRUD ─────────────────────────────────────────────────────────────
// Routes
router.get("/get-search-products", getSearchProducts);
router.get("/get-discounts", getDiscounts);
router.post("/add-discounts", createDiscount);

router.get("/stats/summary", getDiscountStats);
router.get("/product/:productId", getDiscountByProduct);

router.get("/get-discount/:id", getDiscountById);

router.put("/update-discount/:id", updateDiscount);
router.delete("/delete-discount/:id", deleteDiscount);

export default router;
