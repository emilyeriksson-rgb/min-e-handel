import pool from "../config/db.js";

export const getSessionsByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await pool.query(
      `SELECT
        course_sessions.*,
        locations.city,
        locations.address
       FROM course_sessions
       LEFT JOIN locations
         ON course_sessions.location_id = locations.id
       WHERE course_sessions.course_id = $1
       ORDER BY course_sessions.start_date`,
      [courseId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Kunde inte hämta kurstillfällen:", error);

    res.status(500).json({
      message: "Kunde inte hämta kurstillfällen.",
    });
  }
};