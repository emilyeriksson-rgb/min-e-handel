import express from "express";

import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";

import {
  getSessionsByCourseId,
    createCourseSession,
} from "../controllers/courseSessionController.js";

const router = express.Router();

router.get("/", getAllCourses);
router.get("/:id", getCourseById);
router.get("/:courseId/sessions", getSessionsByCourseId);
router.post("/:courseId/sessions", createCourseSession);
router.post("/", createCourse);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);


export default router;