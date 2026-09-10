import express from "express";
import { verifyJWT, verifyAdmin } from "../../middleware/authMiddleware.js";

import settingRoutes from "./setting.js";

import policyRoutes from "./policy.js";

const router = express.Router();
const middleware = [verifyJWT, verifyAdmin];
router.use(middleware);
router.use(settingRoutes);
// router.use(reportRoutes);
router.use(policyRoutes);

export default router;
