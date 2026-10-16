import pool from "../config/db.js";
import { syncCourseSearch } from "../services/courseSearchService.js";

export const getAllCourses = async (req, res) => {
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
  ORDER BY courses.created_at DESC
`);

    res.json(result.rows);
  } catch (error) {
    console.error("Kunde inte hämta kurser:", error);

    res.status(500).json({
      message: "Kunde inte hämta kurser.",
    });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM courses WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Kursen hittades inte.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Kunde inte hämta kursen:", error);

    res.status(500).json({
      message: "Kunde inte hämta kursen.",
    });
  }
};

export const createCourse = async (req, res) => {
  try {
    const {
      title,
      slug,
      price,
      sale_price,
      is_on_sale = false,
      short_description,
      description,
      image_url,
      category,
      study_pace,
      learning_format,
      is_published = false,
    } = req.body;

    if (
      !title ||
      !slug ||
      price === undefined ||
      !learning_format
    ) {
      return res.status(400).json({
        message:
          "Titel, slug, pris och undervisningsformat måste anges.",
      });
    }

    const result = await pool.query(
      `INSERT INTO courses (
        title,
        slug,
        price,
        sale_price,
        is_on_sale,
        short_description,
        description,
        image_url,
        category,
        study_pace,
        learning_format,
        is_published
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      )
      RETURNING *`,
      [
        title,
        slug,
        price,
        sale_price || null,
        is_on_sale,
        short_description || null,
        description || null,
        image_url || null,
        category || null,
        study_pace || null,
        learning_format,
        is_published,
      ]
    );

    const searchStatus = await syncCourseSearch(result.rows[0].id);

    res.status(201).json({
      ...result.rows[0],
      ...searchStatus,
    });

  } catch (error) {
    console.error("Kunde inte skapa kursen:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "Det finns redan en kurs med denna slug.",
      });
    }

    res.status(500).json({
      message: "Kunde inte skapa kursen.",
    });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      slug,
      price,
      sale_price,
      is_on_sale = false,
      short_description,
      description,
      image_url,
      category,
      study_pace,
      learning_format,
      is_published = false,
    } = req.body;

    if (
      !title ||
      !slug ||
      price === undefined ||
      !learning_format
    ) {
      return res.status(400).json({
        message:
          "Titel, slug, pris och undervisningsformat måste anges.",
      });
    }

    const result = await pool.query(
      `UPDATE courses
       SET
         title = $1,
         slug = $2,
         price = $3,
         sale_price = $4,
         is_on_sale = $5,
         short_description = $6,
         description = $7,
         image_url = $8,
         category = $9,
         study_pace = $10,
         learning_format = $11,
         is_published = $12,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        title,
        slug,
        price,
        sale_price || null,
        is_on_sale,
        short_description || null,
        description || null,
        image_url || null,
        category || null,
        study_pace || null,
        learning_format,
        is_published,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Kursen hittades inte.",
      });
    }

    const searchStatus = await syncCourseSearch(result.rows[0].id);

    res.json({
      ...result.rows[0],
      ...searchStatus,
    });

  } catch (error) {
    console.error("Kunde inte redigera kursen:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "Det finns redan en kurs med denna slug.",
      });
    }

    res.status(500).json({
      message: "Kunde inte redigera kursen.",
    });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM courses WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Kursen hittades inte.",
      });
    }

   const searchStatus = await syncCourseSearch(result.rows[0].id);

    res.json({
      message: "Kursen har tagits bort.",
      course: result.rows[0],
      ...searchStatus,
    });

  } catch (error) {
    console.error("Kunde inte ta bort kursen:", error);

    res.status(500).json({
      message: "Kunde inte ta bort kursen.",
    });
  }
};