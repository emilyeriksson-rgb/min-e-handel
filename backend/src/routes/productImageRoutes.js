import { Router } from "express";
import { productImageUpload } from "../middleware/productImageUpload.js";
import { updateProductImage } from "../controllers/productImageController.js";

const router = Router();

router.post(
  "/:productType/:productId",
  productImageUpload,
  updateProductImage
);

export default router;