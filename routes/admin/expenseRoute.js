import express from "express";
import {
  createExpenses,
  deleteExpense,
  getDailyReport,
  getExpenseTypes,
  getMonthlyExpenseMatrix,
  getMonthlyReport,
  getYearlyReport,
  listExpenses,
  updateExpense,
} from "../../controllers/expenseController.js";

const router = express.Router();

router.get("/types", getExpenseTypes);
router.get("/matrix", getMonthlyExpenseMatrix); // keep above "/:id"
router.get("/get-expenses", listExpenses);
router.post("/add-expense", createExpenses);
router.put("/update-expense/:id", updateExpense);
router.delete("/delete-expense/:id", deleteExpense);
// Keep these above any "/:id" route
router.get("/reports/daily", getDailyReport);
router.get("/reports/monthly", getMonthlyReport);
router.get("/reports/yearly", getYearlyReport);

export default router;
