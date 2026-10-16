import "dotenv/config";
import pool from "../config/db.js";
import { saveCoursesToIndex } from "../integrations/searchAdapter.js";

try {
  const result = await pool.query(`
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
  `);

  await saveCoursesToIndex(result.rows);

  console.log(
    `${result.rows.length} publicerade kurser har skickats till Algolia.`
  );
} catch (error) {
  console.error("Kunde inte synka kurser:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}