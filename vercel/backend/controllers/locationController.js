import pool from "../config/db.js";

// GET /api/locations
export const getLocations = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM locations ORDER BY city"
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Kunde inte hämta platser:", error);

    res.status(500).json({
      message: "Kunde inte hämta platser.",
    });
  }
};

// POST /api/locations
export const createLocation = async (req, res) => {
  try {
    const { city, address } = req.body;

    if (!city?.trim()) {
      return res.status(400).json({
        message: "Stad måste anges.",
      });
    }

    const result = await pool.query(
      `INSERT INTO locations (city, address)
       VALUES ($1, $2)
       RETURNING *`,
      [
        city.trim(),
        address?.trim() || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Kunde inte skapa plats:", error);

    res.status(500).json({
      message: "Kunde inte skapa plats.",
    });
  }
};