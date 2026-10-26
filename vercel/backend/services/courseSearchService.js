import pool from "../config/db.js";
import {
  saveCoursesToIndex,
  removeCourseFromIndex,
} from "../integrations/searchAdapter.js";

export async function syncCourseSearch(courseId) {
  try {
    const result = await pool.query(
      `
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
        WHERE courses.id = $1
      `,
      [courseId]
    );

    const course = result.rows[0];

    if (!course || !course.is_published) {
      await removeCourseFromIndex(courseId);
    } else {
      await saveCoursesToIndex([course]);
    }

    return {
      searchIndexUpdated: true,
      searchIndexWarning: null,
    };
  } catch {
    return {
      searchIndexUpdated: false,
      searchIndexWarning:
        "Ändringen har sparats i databasen, men sökindexet kunde inte " +
        "uppdateras. Sökresultatet kan därför vara inaktuellt.",
    };
  }
}