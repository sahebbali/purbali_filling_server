import express from "express";
const router = express.Router();

import userController from "../../controllers/userController.js";
import settingsController from "../../controllers/settingsController.js";

router.get("/get-profile", userController.getUserById);
router.put("/update-profile", userController.updateUser);
router.put("/update-password", userController.updatePassword);
router.put("/update-preferences", userController.updateUserPreferences);
router.delete("/delete-user-address", userController.deleteUserAddress);
router.get("/get-settings", settingsController.getSettings);

export default router;
