import express from "express";
import { verifyJWT, verifyUser } from "../../middleware/authMiddleware.js";

import orderRoutes from "./order.js";
import profileRoutes from "./profile.js";

const router = express.Router();
const middleware = [verifyJWT, verifyUser];
router.use(middleware);

router.use(orderRoutes);
router.use(profileRoutes);

export default router;
