import express from "express";
import {
  optionalAuth,
  protectAdminWrites,
} from "../middleware/authMiddleware.js";

import {
  getCourseSessionById,
  updateCourseSession,
  deleteCourseSession,
} from "../controllers/courseSessionController.js";

const router = express.Router();

router.get("/:id", getCourseSessionById);
router.put("/:id", updateCourseSession);
router.delete("/:id", deleteCourseSession);
router.use(optionalAuth, protectAdminWrites);

export default router;