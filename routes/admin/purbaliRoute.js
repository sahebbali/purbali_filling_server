import express from "express";
import {
  createPurbaliEntry,
  deleteEntry,
  getEntries,
  getEntryById,
  updateEntry,
} from "../../controllers/purbaliController.js";
const router = express.Router();

// const { protect } = require("../middleware/authMiddleware"); // uncomment if you gate these

router.get("/get-all-purbali-entries", getEntries);
router.post("/create-purbali-entry", createPurbaliEntry);

router.get("/get-entry/:id", getEntryById);
router.put("/update-purbali-entry/:id", updateEntry);
router.delete("/delete-purbali-entry/:id", deleteEntry);

export default router;
