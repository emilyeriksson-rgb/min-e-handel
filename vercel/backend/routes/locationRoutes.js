import express from "express";
import {
  optionalAuth,
  protectAdminWrites,
} from "../middleware/authMiddleware.js";
import {
  createLocation,
  getLocations,
} from "../controllers/locationController.js";

const router = express.Router();

router.get("/", getLocations);
router.post("/", createLocation);
router.use(optionalAuth, protectAdminWrites);

export default router;