import express from "express";
const router = express.Router();
import carouselManagerController from "../../controllers/carouselManagerController.js";
import multer from "multer";
import { handleUpload } from "../../utils/uploadMiddleware.js";
import { upload } from "../../utils/cloudinary.js";

router.get("/get-all-carousels", carouselManagerController.getAllCarousels);
// router.get("/get-category-tree", carouselManagerController.getCategoryTree);
// router.get("/get-category/:id", carouselManagerController.getCategoryById);
router.get(
  "/get-category-by-brand/:brand",
  carouselManagerController.getCategoryByBrand,
);
router.post(
  "/add-carousel",
  (req, res, next) => {
    upload.fields([{ name: "banners", maxCount: 20 }])(
      req,
      res,
      function (err) {
        if (err) {
          console.log("route err", err);
          return res.status(400).json({ message: err.message });
        }
        next();
      },
    );
  },
  carouselManagerController.createCarousel,
);
router.put(
  "/update-carousel/:id",
  (req, res, next) => {
    upload.fields([{ name: "banners", maxCount: 20 }])(
      req,
      res,
      function (err) {
        if (err) {
          console.log("route err", err);
          return res.status(400).json({ message: err.message });
        }
        next();
      },
    );
  },
  carouselManagerController.updateCarousel,
);
router.delete("/delete-carousel/:id", carouselManagerController.deleteCarousel);
// router.patch("/toggle-status/:id", carouselManagerController.toggleStatus);
// router.get("/get-category-stats", carouselManagerController.getCategoryStats);
// router.get("/get-dashboard-data", carouselManagerController.getDashboardData);

export default router;
