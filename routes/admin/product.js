import express from "express";

import { upload } from "../../utils/cloudinary.js";
import {
  addImages,
  createProduct,
  deleteProduct,
  getAllProducts,
  getProduct,
  removeImage,
  reorderImages,
  setFeaturedImage,
  toggleStatus,
  updateProduct,
} from "../../controllers/productController.js";
import { handleUpload } from "../../utils/uploadMiddleware.js";

const router = express.Router();

// ─── Product CRUD ─────────────────────────────────────────────────────────────
router.get("/get-all-products", getAllProducts); // GET    /api/products
router.get("/get-product-by-id/:id", getProduct); // GET    /api/products/:id  (id OR slug)
router.post("/add-product", handleUpload("media", 20), createProduct);
router.put(
  "/update-product",
  (req, res, next) => {
    upload.array("media", 20)(req, res, function (err) {
      if (err) {
        console.log("route err", err);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  updateProduct,
); // PUT    /api/products/:id
router.delete("/delete-product/:id", deleteProduct); // DELETE /api/products/:id

// ─── Image sub-resource ───────────────────────────────────────────────────────
router.post("/:id/images", upload.array("images", 20), addImages); // POST   /api/products/:id/images
router.delete("/:id/images/:imageId", removeImage); // DELETE /api/products/:id/images/:imageId
router.patch("/:id/images/:imageId/featured", setFeaturedImage); // PATCH  /api/products/:id/images/:imageId/featured
router.patch("/:id/images/reorder", reorderImages); // PATCH  /api/products/:id/images/reorder

// ─── Misc ─────────────────────────────────────────────────────────────────────
router.patch("/:id/toggle-status", toggleStatus); // PATCH  /api/products/:id/toggle-status

export default router;
