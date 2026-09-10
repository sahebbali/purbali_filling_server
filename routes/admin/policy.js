import express from "express";

import {
  addItem,
  createPolicy,
  deleteItem,
  deletePolicy,
  getItems,
  getPolicy,
  getPolicyById,
  seedData,
  updateItem,
  updatePolicy,
} from "../../controllers/policyController.js";

const router = express.Router();

router.get("/get-all-policies", getPolicy);
router.post("/create-policy", createPolicy);
router.get("/get-policy-by-id/:id", getPolicyById);
router.put("/update-policy/:id", updatePolicy);
router.delete("/delete-policy/:id", deletePolicy);

// ── Item routes ───────────────────────────────────────────────────────────────
// GET    /api/sections/:id/items              → list items in section
// POST   /api/sections/:id/items              → add item
// PUT    /api/sections/:sectionId/items/:itemId  → update item
// DELETE /api/sections/:sectionId/items/:itemId  → delete item

router.get("/get-items/:id/items", getItems);
router.post("/add-item/:id/item", addItem);
router.put("/update-item/:policyId/:itemId", updateItem);
router.delete("/delete-item/:policyId/:itemId", deleteItem);

// ── Dev seed ──────────────────────────────────────────────────────────────────
router.post("/seed/run", seedData);

export default router;
