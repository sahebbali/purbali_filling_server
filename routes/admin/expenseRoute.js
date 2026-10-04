import express from "express";
import {
  createExpenses,
  deleteExpense,
  getExpenseTypes,
  getMonthlyExpenseMatrix,
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

export default router;
