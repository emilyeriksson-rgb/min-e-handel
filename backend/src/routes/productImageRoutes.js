import { Router } from "express";
import {
  optionalAuth,
  protectAdminWrites,
} from "../middleware/authMiddleware.js";
import { productImageUpload } from "../middleware/productImageUpload.js";
import { updateProductImage } from "../controllers/productImageController.js";

const router = Router();

router.use(optionalAuth, protectAdminWrites);

router.post(
  "/:productType/:productId",
  productImageUpload,
  updateProductImage
);

export default router;