import multer from "multer";
import { MAX_IMAGE_SIZE } from "../integrations/storageAdapter.js";

const receiveImage = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
  },

  fileFilter(req, file, callback) {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      const error = new Error(
        "Only JPEG and PNG images are allowed."
      );

      error.status = 400;
      return callback(error);
    }

    callback(null, true);
  },
}).single("image");

export function productImageUpload(req, res, next) {
  receiveImage(req, res, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "The image must be 2 MB or smaller.",
        });
      }

      if (
        error.code === "LIMIT_FILE_COUNT" ||
        error.code === "LIMIT_UNEXPECTED_FILE" ||
        error.code === "LIMIT_PART_COUNT" ||
        error.code === "LIMIT_FIELD_COUNT"
      ) {
        return res.status(400).json({
          message:
            "Upload exactly one image using the image field.",
        });
      }

      if (error.status === 400) {
        return res.status(400).json({
          message: error.message,
        });
      }

      if (error instanceof multer.MulterError) {
        return res.status(400).json({
          message: "Invalid image upload.",
        });
      }

      console.error("Image upload parsing failed:", error.message);

      return res.status(400).json({
        message:
          "The upload could not be read. Select a JPEG or PNG image.",
      });
    }

    if (!req.file || req.file.size === 0) {
      return res.status(400).json({
        message: "Please select a JPEG or PNG image.",
      });
    }

    next();
  });
}