import express from "express";
import {
  createEntry,
  createPurbaliEntry,
  deleteEntry,
  getEntryById,
  updateEntry,
} from "../../controllers/purbaliController.js";
const router = express.Router();

// const { protect } = require("../middleware/authMiddleware"); // uncomment if you gate these

router.get("/get-all-purbali-entries", createPurbaliEntry);
router.post("/create-purbali-entry", createEntry);

router.get("/get-entry/:id", getEntryById);
router.put("/update-entry/:id", updateEntry);
router.delete("/delete-entry/:id", deleteEntry);

export default router;
