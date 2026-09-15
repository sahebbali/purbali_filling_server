import express from "express";
import {
  getAccountsDetailsByNumber,
  getAccountsNumbers,
  getTagsByAccountNumber,
} from "../../controllers/AccountController.js";

const router = express.Router();

// Get all rates
router.get("/all-account-numbers", getAccountsNumbers);
router.get("/accounts/:ac_no/tags", getTagsByAccountNumber);

router.get("/accounts/details", getAccountsDetailsByNumber);

export default router;
