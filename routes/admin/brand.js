import express from "express";
const router = express.Router();
import { upload } from "../../utils/cloudinary.js";
import {
  createBrand,
  deleteBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
} from "../../controllers/brandController.js";

router.get("/get-all-brands", getAllBrands);

router.get("/get-brand/:id", getBrandById);
router.post(
  "/add-brand",
  (req, res, next) => {
    upload.fields([
      { name: "logoImage", maxCount: 1 }, // was maxCount: 4, a logo is one image
      { name: "bannerImages", maxCount: 10 }, // one file per new banner row, up to 10 rows
    ])(req, res, function (err) {
      if (err) {
        console.log("route err", err);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  createBrand,
);
router.put(
  "/update-brand",
  (req, res, next) => {
    upload.fields([
      { name: "logoImage", maxCount: 1 },
      { name: "bannerImages", maxCount: 10 },
    ])(req, res, function (err) {
      if (err) {
        console.log("route err", err);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  updateBrand,
);
router.delete("/delete-brand/:id", deleteBrand);

export default router;
