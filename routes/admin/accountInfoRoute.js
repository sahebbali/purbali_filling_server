import express from "express";
import {
  getAccountsDetailsByNumber,
  getAccountsNumbers,
  getTagsByAccountNumber,
} from "../../controllers/AccountController.js";
import {
  createAc,
  delAc,
  getAc,
  patchAc,
  updatePurchaseRates,
  getAllAccounts,
} from "../../controllers/purchaseRateController.js";

const router = express.Router();

// Get all rates
router.get("/all-account-numbers", getAccountsNumbers);
router.get("/accounts/:ac_no/tags", getTagsByAccountNumber);

router.get("/accounts/details", getAccountsDetailsByNumber);

router.get("/get-all-accounts", getAllAccounts);
router.get("/get-account-by-number/:ac_no", getAc);
router.post("/add-account", createAc);
router.patch("/update-account/:ac_no", patchAc);
router.put("/update-purchase-rates/:ac_no/purchase-rates", updatePurchaseRates);
router.delete("/delete-accounts/:ac_no", delAc);

export default router;
