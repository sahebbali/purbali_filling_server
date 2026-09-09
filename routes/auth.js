import express from "express";
const router = express.Router();

import authController from "../controllers/authController.js";

router.post("/admin/login", authController.login);
router.post("/login", authController.login);
router.put("/forget-password", authController.forgetPassword);
router.put("/reset-password/:token", authController.resetPassword);

export default router;
