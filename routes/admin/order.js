import express from "express";
const router = express.Router();

import orderController from "../../controllers/orderController.js";

router.get("/get-all-orders", orderController.getAllOrdersAdmin);

router.post("/create-order", orderController.createOrder);

router.get("/stats/summary", orderController.getOrderStats);
router.put("/bulk/status", orderController.bulkUpdateStatus);

router.get("/get-order-by-id/:id", orderController.getOrderById);

router.delete("/delete-order", orderController.deleteOrder);

router.put("/update-order-status/:id", orderController.updateOrderStatus);
router.put("/:id/payment", orderController.updatePaymentStatus);

export default router;
