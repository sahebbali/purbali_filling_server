// routes/order.js
import express from "express";
const router = express.Router();

import orderController from "../../controllers/orderController.js";
import couponController from "../../controllers/couponController.js";
import paymentController from "../../controllers/paymentController.js";
import { getAllProductsUser } from "../../controllers/productController.js";

router.get("/get-my-orders", orderController.getMyOrders);
// router.get("/orders/:id", orderController.getOrderDetails);
router.post("/place-order", orderController.createOrder);
router.put("/cancel-order/:id", orderController.cancelOrder);
// coupon routes
router.put("/validate-coupon", couponController.validateCoupon);
router.post("/apply-to-order", couponController.applyCouponToOrder);
router.get("/get-valid-coupons", couponController.getValidCoupons);
router.get("/get-order-by-id/:id", orderController.getOrderById);

router.post("/submit-bkash-payment", paymentController.submitBkashPayment);
router.get("/get-all-products-user", getAllProductsUser);

export default router;
