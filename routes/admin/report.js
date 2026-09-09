import express from "express";

import {
  getSummary,
  getSalesChart,
  getOrderHistory,
  getLowStock,
  getTopProducts,
} from "../../controllers/reportController.js";
const router = express.Router();

router.get("/get-summary", getSummary);

router.get("/sales-chart", getSalesChart);

/**
 * @route   GET /api/reports/order-history
 * @desc    Paginated, searchable, filterable order list
 * @query   status=all|pending|delivered|cancelled|processing|shipped
 * @query   page=1  limit=10
 * @query   search=<orderId or customer name>
 * @query   startDate=YYYY-MM-DD  endDate=YYYY-MM-DD
 * @query   sortBy=createdAt|total  sortOrder=desc|asc
 * @access  Private
 */
router.get("/order-history", getOrderHistory);

/**
 * @route   GET /api/reports/low-stock
 * @desc    Products at or below stock threshold
 * @query   threshold=10  category=<string>  page=1  limit=20
 * @access  Private
 */
router.get("/low-stock", getLowStock);

/**
 * @route   GET /api/reports/top-products
 * @desc    Best-selling products by quantity
 * @query   limit=5  range=week|month|year
 * @access  Private
 */
router.get("/top-products", getTopProducts);

export default router;
