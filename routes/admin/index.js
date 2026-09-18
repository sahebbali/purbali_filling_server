import express from "express";
import { verifyJWT, verifyAdmin } from "../../middleware/authMiddleware.js";

import settingRoutes from "./setting.js";

import policyRoutes from "./policy.js";
import purbaliRoutes from "./purbaliRoute.js";
import purbaliRateRoutes from "./purbaliRateRoute.js";
import accountRoute from "./accountInfoRoute.js";
import billRoute from "./billRoute.js";
import reportRoutes from "./report.js";

const router = express.Router();
const middleware = [verifyJWT, verifyAdmin];
router.use(middleware);
router.use(settingRoutes);
router.use(reportRoutes);
// router.use(reportRoutes);
router.use(policyRoutes);
router.use(purbaliRoutes);
router.use(purbaliRateRoutes);
router.use(accountRoute);
router.use(billRoute);
export default router;
