import express from "express";
const router = express.Router();
import categoryController from "../../controllers/categoryController.js";
import multer from "multer";
import { handleUpload } from "../../utils/uploadMiddleware.js";
import { upload } from "../../utils/cloudinary.js";

router.get("/get-all-categories", categoryController.getAllCategories);
router.get("/get-category-tree", categoryController.getCategoryTree);
router.get("/get-category/:id", categoryController.getCategoryById);
router.get(
  "/get-category-by-brand/:brand",
  categoryController.getCategoryByBrand,
);
router.post(
  "/add-category",
  (req, res, next) => {
    upload.fields([
      { name: "images", maxCount: 1 },
      { name: "banners", maxCount: 20 },
    ])(req, res, function (err) {
      if (err) {
        console.log("route err", err);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  categoryController.createCategory,
);
router.put(
  "/update-category/:id",
  (req, res, next) => {
    upload.fields([
      { name: "images", maxCount: 1 },
      { name: "banners", maxCount: 20 },
    ])(req, res, function (err) {
      if (err) {
        console.log("route err", err);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  categoryController.updateCategory,
);
router.delete("/delete-category/:id", categoryController.deleteCategory);
router.patch("/toggle-status/:id", categoryController.toggleStatus);
router.get("/get-category-stats", categoryController.getCategoryStats);
router.get("/get-dashboard-data", categoryController.getDashboardData);

export default router;
