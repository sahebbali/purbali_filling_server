import express from "express";
const router = express.Router();
import upload from "../middleware/upload.js";
import publicController from "../controllers/publicController.js";
import { getAllProductsUser } from "../controllers/productController.js";
import { getPolicy } from "../controllers/policyController.js";
import {
  getAllBrands,
  getAllCarousel,
} from "../controllers/brandController.js";

// router.get("/products", publicController.getProducts);
router.get("/get-all-categories", publicController.getAllCategories);
router.get("/get-all-categories-tree", publicController.getAllCategoryTree);
router.get("/get-category-by-name/:name", publicController.getCategoryByName);

router.get("/get-all-products", publicController.getAllProducts);

router.get("/get-product-list", publicController.getProductList);
router.get("/get-product-by-id/:id", publicController.getProductById);

router.get("/get-all-products-user", getAllProductsUser);
router.get("/get-policies", getPolicy);
router.get("/get-all-brands", getAllBrands);
router.get("/get-all-carousel", getAllCarousel);

export default router;
