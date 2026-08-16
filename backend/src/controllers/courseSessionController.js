import pool from "../config/db.js";


/* Hämta kurstillfällen efter kurs-ID */
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


/* Skapa kurstillfälle */
export const createCourseSession = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { start_date, end_date, available_seats, location_type, location_id, duration, is_self_paced = false, } = req.body;

    if (!location_type) {
      return res.status(400).json({
        message: "Undervisningsplats är obligatoriskt.",
      });
    }

    if (!is_self_paced && (!start_date || !end_date)) {
      return res.status(400).json({
        message: "Start- och sluttid är obligatoriska för icke-självständiga kurstillfällen.",
      });
    }

    if (!location_type === "onsite" && !location_id) {
        return res.status(400).json({
            message: "Plats-ID är obligatoriskt för kurstillfällen på plats.",
        });
    }

    const result = await pool.query(
          `INSERT INTO course_sessions (
        course_id,
        start_date,
        end_date,
        available_seats,
        location_type,
        location_id,
        duration,
        is_self_paced
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        courseId,
        start_date || null,
        end_date || null,
        available_seats ?? null,
        location_type,
        location_id || null,
        duration || null,
        is_self_paced,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Kunde inte skapa kurstillfälle:", error);

    if(error.code === '23503') {
      return res.status(400).json({
        message: "Kontrollera att platsen och kursen finns.",
      });
    }

    res.status(500).json({
      message: "Kunde inte skapa kurstillfälle.",
    });
  }
};


/* Uppdatera kurstillfälle */
export const updateCourseSession = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      start_date,
      end_date,
      available_seats,
      location_type,
      location_id,
      duration,
      is_self_paced,
    } = req.body;

    if (!location_type) {
      return res.status(400).json({
        message: "Undervisningsplats måste anges.",
      });
    }

    if (!is_self_paced && (!start_date || !end_date)) {
      return res.status(400).json({
        message:
          "Schemalagda kurstillfällen måste ha startdatum och slutdatum.",
      });
    }

    if (location_type === "onsite" && !location_id) {
      return res.status(400).json({
        message: "Kurser på plats måste ha en location_id.",
      });
    }

    const result = await pool.query(
      `UPDATE course_sessions
       SET
         start_date = $1,
         end_date = $2,
         available_seats = $3,
         location_type = $4,
         location_id = $5,
         duration = $6,
         is_self_paced = $7
       WHERE id = $8
       RETURNING *`,
      [
        start_date || null,
        end_date || null,
        available_seats ?? null,
        location_type,
        location_id || null,
        duration || null,
        is_self_paced,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Kurstillfället hittades inte.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Kunde inte redigera kurstillfället:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "Den angivna platsen finns inte.",
      });
    }

    res.status(500).json({
      message: "Kunde inte redigera kurstillfället.",
    });
  }
};

/* Ta bort kurstillfälle */
export const deleteCourseSession = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM course_sessions WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Kurstillfället hittades inte.",
      });
    }

    res.json({
      message: "Kurstillfället togs bort.",
    });
  } catch (error) {
    console.error("Kunde inte ta bort kurstillfället:", error);

    res.status(500).json({
      message: "Kunde inte ta bort kurstillfället.",
    });
  }
};
