import express from "express";
import {
  getAccountsNumbers,
  getTagsByAccountNumber,
} from "../../controllers/AccountController.js";

const router = express.Router();

// Get all rates
router.get("/all-account-numbers", getAccountsNumbers);
router.get("/accounts/:ac_no/tags", getTagsByAccountNumber);

export default router;
