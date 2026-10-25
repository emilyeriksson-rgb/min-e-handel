import pool from "../config/db.js";
import { syncCourseSearch } from "../services/courseSearchService.js";

const createValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const prepareSessionData = (
  body,
  defaultPrice
) => {
  const {
    start_date,
    end_date,
    available_seats,
    location_type,
    location_id,
    duration,
    is_self_paced = false,
    price,
    sale_price,
    is_on_sale = false,
  } = body;

  if (!location_type) {
    throw createValidationError(
      "Undervisningsplats måste anges."
    );
  }

  if (
    !["onsite", "online"].includes(location_type)
  ) {
    throw createValidationError(
      "Undervisningsplats måste vara onsite eller online."
    );
  }

  if (
    is_self_paced &&
    location_type !== "online"
  ) {
    throw createValidationError(
      "Utbildningar i egen takt måste vara online."
    );
  }

  const normalizedStartDate = is_self_paced
    ? null
    : start_date || null;

  const normalizedEndDate = is_self_paced
    ? null
    : end_date || null;

  if (
    normalizedEndDate &&
    !normalizedStartDate
  ) {
    throw createValidationError(
      "Slutdatum kan inte anges utan startdatum."
    );
  }

  if (
    normalizedStartDate &&
    normalizedEndDate &&
    normalizedEndDate < normalizedStartDate
  ) {
    throw createValidationError(
      "Slutdatum kan inte vara före startdatum."
    );
  }

  let normalizedLocationId = null;

  if (location_type === "onsite") {
    normalizedLocationId = Number(location_id);

    if (!Number.isInteger(normalizedLocationId)) {
      throw createValidationError(
        "En giltig utbildningsplats måste anges."
      );
    }
  }

  let normalizedSeats = null;

  if (
    available_seats !== "" &&
    available_seats !== null &&
    available_seats !== undefined
  ) {
    normalizedSeats = Number(available_seats);

    if (
      !Number.isInteger(normalizedSeats) ||
      normalizedSeats < 0
    ) {
      throw createValidationError(
        "Antalet platser måste vara ett positivt heltal eller noll."
      );
    }
  }

  const normalizedPrice =
    price === "" ||
    price === null ||
    price === undefined
      ? Number(defaultPrice)
      : Number(price);

  if (
    !Number.isFinite(normalizedPrice) ||
    normalizedPrice < 0
  ) {
    throw createValidationError(
      "Ett giltigt pris måste anges."
    );
  }

  let normalizedSalePrice = null;

  if (is_on_sale) {
    normalizedSalePrice = Number(sale_price);

    if (
      !Number.isFinite(normalizedSalePrice) ||
      normalizedSalePrice < 0
    ) {
      throw createValidationError(
        "Ett giltigt kampanjpris måste anges."
      );
    }

    if (
      normalizedSalePrice >= normalizedPrice
    ) {
      throw createValidationError(
        "Kampanjpriset måste vara lägre än ordinarie pris."
      );
    }
  }

  return {
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    availableSeats: normalizedSeats,
    locationType: location_type,
    locationId: normalizedLocationId,
    duration:
      typeof duration === "string" &&
      duration.trim()
        ? duration.trim()
        : null,
    isSelfPaced: Boolean(is_self_paced),
    price: normalizedPrice,
    salePrice: normalizedSalePrice,
    isOnSale: Boolean(is_on_sale),
  };
};

/* GET /api/courses/:courseId/sessions */
export const getSessionsByCourseId = async (
  req,
  res
) => {
  try {
    const { courseId } = req.params;

    const result = await pool.query(
      `SELECT
         course_sessions.*,
         locations.city,
         locations.address

       FROM course_sessions

       LEFT JOIN locations
         ON locations.id =
            course_sessions.location_id

       WHERE course_sessions.course_id = $1

       ORDER BY
         course_sessions.start_date NULLS LAST,
         course_sessions.id`,
      [courseId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(
      "Kunde inte hämta kurstillfällen:",
      error
    );

    res.status(500).json({
      message:
        "Kunde inte hämta kurstillfällen.",
    });
  }
};

/* GET /api/course-sessions/:id */
export const getCourseSessionById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         course_sessions.*,
         locations.city,
         locations.address

       FROM course_sessions

       LEFT JOIN locations
         ON locations.id =
            course_sessions.location_id

       WHERE course_sessions.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Kurstillfället hittades inte.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(
      "Kunde inte hämta kurstillfället:",
      error
    );

    res.status(500).json({
      message:
        "Kunde inte hämta kurstillfället.",
    });
  }
};

/* POST /api/courses/:courseId/sessions */
export const createCourseSession = async (
  req,
  res
) => {
  try {
    const { courseId } = req.params;

    const courseResult = await pool.query(
      "SELECT price FROM courses WHERE id = $1",
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        message: "Utbildningen hittades inte.",
      });
    }

    const session = prepareSessionData(
      req.body,
      courseResult.rows[0].price
    );

    const result = await pool.query(
      `INSERT INTO course_sessions (
         course_id,
         start_date,
         end_date,
         available_seats,
         location_type,
         location_id,
         duration,
         is_self_paced,
         price,
         sale_price,
         is_on_sale
       )
       VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11
       )
       RETURNING *`,
      [
        courseId,
        session.startDate,
        session.endDate,
        session.availableSeats,
        session.locationType,
        session.locationId,
        session.duration,
        session.isSelfPaced,
        session.price,
        session.salePrice,
        session.isOnSale,
      ]
    );

    const searchStatus = await syncCourseSearch(result.rows[0].course_id);
    res.status(201).json({ ...result.rows[0], ...searchStatus });
  } catch (error) {
    console.error(
      "Kunde inte skapa kurstillfälle:",
      error
    );

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        message:
          "Kontrollera att platsen och utbildningen finns.",
      });
    }

    res.status(500).json({
      message:
        "Kunde inte skapa kurstillfälle.",
    });
  }
};

/* PUT /api/course-sessions/:id */
export const updateCourseSession = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const existingResult = await pool.query(
      `SELECT
         course_sessions.*,
         courses.price AS course_price

       FROM course_sessions

       JOIN courses
         ON courses.id =
            course_sessions.course_id

       WHERE course_sessions.id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        message:
          "Kurstillfället hittades inte.",
      });
    }

    const existingSession =
      existingResult.rows[0];

    const session = prepareSessionData(
      req.body,
      existingSession.price ||
        existingSession.course_price
    );

    const result = await pool.query(
      `UPDATE course_sessions
       SET
         start_date = $1,
         end_date = $2,
         available_seats = $3,
         location_type = $4,
         location_id = $5,
         duration = $6,
         is_self_paced = $7,
         price = $8,
         sale_price = $9,
         is_on_sale = $10

       WHERE id = $11

       RETURNING *`,
      [
        session.startDate,
        session.endDate,
        session.availableSeats,
        session.locationType,
        session.locationId,
        session.duration,
        session.isSelfPaced,
        session.price,
        session.salePrice,
        session.isOnSale,
        id,
      ]
    );

    const searchStatus = await syncCourseSearch(result.rows[0].course_id);
    res.json({ ...result.rows[0], ...searchStatus });
  } catch (error) {
    console.error(
      "Kunde inte redigera kurstillfället:",
      error
    );

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        message:
          "Den angivna platsen finns inte.",
      });
    }

    res.status(500).json({
      message:
        "Kunde inte redigera kurstillfället.",
    });
  }
};

/* DELETE /api/course-sessions/:id */
export const deleteCourseSession = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM course_sessions
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Kurstillfället hittades inte.",
      });
    }

    const searchStatus = await syncCourseSearch(result.rows[0].course_id);
    res.json({
      message: "Kurstillfället togs bort.",
      ...searchStatus,
    });
  } catch (error) {
    console.error(
      "Kunde inte ta bort kurstillfället:",
      error
    );

    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "Kurstillfället kan inte tas bort eftersom det finns i en order.",
      });
    }

    res.status(500).json({
      message:
        "Kunde inte ta bort kurstillfället.",
    });
  }
};