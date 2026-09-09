import express from "express";
import paymentController from "../../controllers/paymentController.js";

const router = express.Router();

router.get("/get-all-payments", paymentController.getAllPayments);
router.get("/get-payment/:id", paymentController.getPaymentById);
router.put("/update-payment-status", paymentController.updatePaymentStatus);

export default router;
