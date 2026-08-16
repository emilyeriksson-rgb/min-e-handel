import pool from "../config/db.js";

// GET /api/courses
export const getAllCourses = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM courses ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Kunde inte hämta kurser:", error);

    res.status(500).json({
      message: "Kunde inte hämta kurser.",
    });
  }
};

// GET /api/courses/:id
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

// POST /api/courses
export const createCourse = async (req, res) => {
  try {
    const {
      title,
      slug,
      price,
      sale_price,
      is_on_sale = false,
      description,
      image_url,
      category,
      study_pace,
      learning_format,
      is_published = false,
    } = req.body;

    if (!title || !slug || price === undefined || !learning_format) {
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
        description,
        image_url,
        category,
        study_pace,
        learning_format,
        is_published
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        title,
        slug,
        price,
        sale_price || null,
        is_on_sale,
        description || null,
        image_url || null,
        category || null,
        study_pace || null,
        learning_format,
        is_published,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Kunde inte skapa kursen:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Det finns redan en kurs med denna slug.",
      });
    }

    res.status(500).json({
      message: "Kunde inte skapa kursen.",
    });
  }
};

// PUT /api/courses/:id
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      slug,
      price,
      sale_price,
      is_on_sale,
      description,
      image_url,
      category,
      study_pace,
      learning_format,
      is_published,
    } = req.body;

    const result = await pool.query(
      `UPDATE courses
       SET
         title = COALESCE($1, title),
         slug = COALESCE($2, slug),
         price = COALESCE($3, price),
         sale_price = COALESCE($4, sale_price),
         is_on_sale = COALESCE($5, is_on_sale),
         description = COALESCE($6, description),
         image_url = COALESCE($7, image_url),
         category = COALESCE($8, category),
         study_pace = COALESCE($9, study_pace),
         learning_format = COALESCE($10, learning_format),
         is_published = COALESCE($11, is_published),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        title,
        slug,
        price,
        sale_price,
        is_on_sale,
        description,
        image_url,
        category,
        study_pace,
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

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Kunde inte redigera kursen:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Det finns redan en kurs med denna slug.",
      });
    }

    res.status(500).json({
      message: "Kunde inte redigera kursen.",
    });
  }
};

// DELETE /api/courses/:id
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

    res.json({
      message: "Kursen har tagits bort.",
      course: result.rows[0],
    });
  } catch (error) {
    console.error("Kunde inte ta bort kursen:", error);

    res.status(500).json({
      message: "Kunde inte ta bort kursen.",
    });
  }
};