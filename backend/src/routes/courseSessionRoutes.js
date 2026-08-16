import express from "express";

import {
    updateCourseSession,
    deleteCourseSession
} from "../controllers/courseSessionController.js";

const router = express.Router();

router.put("/:id", updateCourseSession);
router.delete("/:id", deleteCourseSession);

export default router;