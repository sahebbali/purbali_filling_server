import express from "express";
import { verifyJWT, verifyUser } from "../../middleware/authMiddleware.js";

import profileRoutes from "./profile.js";

const router = express.Router();
const middleware = [verifyJWT, verifyUser];
router.use(middleware);

router.use(profileRoutes);

export default router;
