import express from "express";
const router = express.Router();
import couponController from "../../controllers/couponController.js";

router.post("/create-coupon", couponController.createCoupon);
router.put("/update-coupon/:id", couponController.updateCoupon);
router.get("/get-all-coupons", couponController.getAllCoupons);
router.get("/get-coupons/:id", couponController.getCouponById);
router.delete("/delete-coupons/:id", couponController.deleteCoupon);
router.put("/toggle-status/:id", couponController.toggleCouponStatus);

// router.get("/stats", couponController.getCouponStats);

// Public routes (but still need authentication)
// router.post("/validate", validateCoupon);
// router.post("/apply-to-order", applyCouponToOrder);

export default router;
