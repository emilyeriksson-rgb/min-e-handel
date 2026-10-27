import { replaceProductImage } from "../services/productImageService.js";

export async function updateProductImage(req, res) {
  try {
    const result = await replaceProductImage({
      productType: req.params.productType,
      productId: req.params.productId,
      buffer: req.file.buffer,
    });

    return res.json({
      message: "Product image updated.",
      ...result,
    });
  } catch (error) {
    console.error("Product image update failed:", error.message);

    const status = [400, 404, 500, 503].includes(error.status)
      ? error.status
      : 500;

    return res.status(status).json({
      message: error.status
        ? error.message
        : "The product image could not be updated. Please try again.",
    });
  }
}