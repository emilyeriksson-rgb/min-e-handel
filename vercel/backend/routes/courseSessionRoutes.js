import express from "express";

import {
  getCourseSessionById,
  updateCourseSession,
  deleteCourseSession,
} from "../controllers/courseSessionController.js";

const router = express.Router();

router.get("/:id", getCourseSessionById);
router.put("/:id", updateCourseSession);
router.delete("/:id", deleteCourseSession);

export default router;