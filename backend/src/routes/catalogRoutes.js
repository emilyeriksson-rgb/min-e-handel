import { Router } from "express";
import pool from "../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [courseResult, bookResult] = await Promise.all([
      pool.query(`
        SELECT
          courses.*,
          ARRAY(
            SELECT DISTINCT TRIM(locations.city)
            FROM course_sessions
            JOIN locations
              ON locations.id = course_sessions.location_id
            WHERE course_sessions.course_id = courses.id
              AND locations.city IS NOT NULL
              AND TRIM(locations.city) <> ''
            ORDER BY TRIM(locations.city)
          ) AS cities
        FROM courses
        WHERE courses.is_published = true
        ORDER BY courses.created_at DESC
      `),

      pool.query(`
        SELECT
          sku,
          title,
          category,
          price,
          stock,
          variants,
          image_path,
          image_url,
          updated_at AS "updatedAt"
        FROM books
        ORDER BY title
      `),
    ]);

    const courses = courseResult.rows.map((course) => ({
      ...course,
      type: "course",
      price: Number(course.price),
      sale_price: course.sale_price == null
        ? null
        : Number(course.sale_price),
    }));

    const books = bookResult.rows.map((book) => ({
      ...book,
      type: "book",
      price: Number(book.price),
    }));

    res.json([...courses, ...books]);
  } catch {
    res.status(500).json({
      message: "Kunde inte hämta kurser och kurslitteratur.",
    });
  }
});

export default router;